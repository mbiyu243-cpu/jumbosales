package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/titusqpc/jumbo_sales/backend/internal/models"
	"github.com/titusqpc/jumbo_sales/backend/internal/sse"
)

// CreateSessionRequest defines payload for creating a new auction session
type CreateSessionRequest struct {
	ItemName        string  `json:"item_name" binding:"required"`
	ItemDescription string  `json:"item_description"`
	StartingPrice   float64 `json:"starting_price" binding:"required,gt=0"`
	ProductID       *uint   `json:"product_id,omitempty"` // Optional: link to product catalog
	DurationMinutes int     `json:"duration_minutes"`
}

// CreateSession godoc
// @Summary Create auction session
// @Description Start a new auction session for an item (cashier only)
// @Tags sessions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateSessionRequest true "Session details"
// @Success 201 {object} models.AuctionSession
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /sessions [post]
func (h *Handler) CreateSession(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "cashier" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only cashiers can create auction sessions"})
		return
	}

	var req CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.DurationMinutes <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Duration must be greater than 0"})
		return
	}

	userID := c.GetUint("userID")

	// If ProductID is provided, validate it exists
	if req.ProductID != nil {
		var product models.Product
		if err := h.db.First(&product, *req.ProductID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Product not found"})
			return
		}
	}

	endTime := time.Now().Add(time.Duration(req.DurationMinutes) * time.Minute)

	session := models.AuctionSession{
		ItemName:        req.ItemName,
		ItemDescription: req.ItemDescription,
		StartingPrice:   req.StartingPrice,
		CurrentPrice:    req.StartingPrice,
		TotalCollected:  0,
		Status:          models.StatusOpen,
		CashierID:       userID,
		ProductID:       req.ProductID,
		EndTime:         &endTime,
	}

	if err := h.db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Load relationships
	h.db.Preload("Cashier").Preload("Product").First(&session, session.ID)

	c.JSON(http.StatusCreated, session)
}

// ListSessions godoc
// @Summary List all auction sessions
// @Description Get all sessions with optional status filter
// @Tags sessions
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filter by status (open, closed, donated)"
// @Success 200 {array} models.AuctionSession
// @Router /sessions [get]
func (h *Handler) ListSessions(c *gin.Context) {
	status := c.Query("status")

	var sessions []models.AuctionSession
	query := h.db.Preload("Cashier").Preload("Winner").Preload("Product")

	includeArchived := c.Query("archived")
	if includeArchived != "true" {
		query = query.Where("is_archived = ?", false)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	for i := range sessions {
		if sessions[i].Status == models.StatusOpen &&
			sessions[i].EndTime != nil &&
			time.Now().After(*sessions[i].EndTime) {
			sessions[i].Status = models.StatusClosed
			h.db.Save(&sessions[i])
		}
	}

	c.JSON(http.StatusOK, sessions)
}

// GetSession godoc
// @Summary Get session details
// @Description Get a single auction session with all bids
// @Tags sessions
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Success 200 {object} models.AuctionSession
// @Failure 404 {object} map[string]string
// @Router /sessions/{id} [get]
func (h *Handler) GetSession(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var session models.AuctionSession
	if err := h.db.Preload("Cashier").
		Preload("Winner").
		Preload("Product").
		Preload("Bids.Bidder").
		First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if session.Status == models.StatusOpen &&
		session.EndTime != nil &&
		time.Now().After(*session.EndTime) {
		session.Status = models.StatusClosed
		h.db.Save(&session)

		sse.BroadcastToSession(uint(sessionID), sse.Event{
			Type: "session_closed",
			Data: map[string]interface{}{
				"session_id": sessionID,
				"status":     "closed",
			},
		})
	}

	c.JSON(http.StatusOK, session)
}

// CloseSession godoc
// @Summary Close auction session
// @Description End bidding and declare winner (cashier only)
// @Tags sessions
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Success 200 {object} models.AuctionSession
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /sessions/{id}/close [post]
func (h *Handler) CloseSession(c *gin.Context) {
	userRole := c.GetString("userRole")
	userID := c.GetUint("userID")

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var session models.AuctionSession
	if err := h.db.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// Only the session's cashier or admin can close it
	if userRole != "admin" && session.CashierID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the session cashier can close this auction"})
		return
	}

	if session.Status != models.StatusOpen {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session is not open for bidding"})
		return
	}

	// Find the last bid to determine winner
	var lastBid models.Bid
	if err := h.db.Where("session_id = ?", sessionID).Order("bid_order DESC").First(&lastBid).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No bids placed yet"})
		return
	}

	// Update session status and winner
	session.Status = models.StatusClosed
	session.WinnerID = &lastBid.BidderID

	if err := h.db.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to close session"})
		return
	}

	// Broadcast session closed event via SSE
	sse.BroadcastToSession(uint(sessionID), sse.Event{
		Type: "session_closed",
		Data: map[string]interface{}{
			"session_id": sessionID,
			"winner_id":  lastBid.BidderID,
			"status":     "closed",
		},
	})

	// Reload with relationships
	h.db.Preload("Cashier").Preload("Winner").First(&session, sessionID)

	c.JSON(http.StatusOK, session)
}

func (h *Handler) DeleteSession(c *gin.Context) {
	userRole := c.GetString("userRole")

	if userRole != "cashier" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only cashiers can archive sales"})
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var session models.AuctionSession
	if err := h.db.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}

	if session.Status == models.StatusOpen {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot archive active sale"})
		return
	}

	session.IsArchived = true
	if err := h.db.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to archive sale"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sale archived successfully"})
}