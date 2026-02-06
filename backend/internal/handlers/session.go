package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/titusqpc/jumbo_sales/backend/internal/models"
	"github.com/titusqpc/jumbo_sales/backend/internal/sse"
)

// CreateSessionRequest defines payload for creating a new auction session
type CreateSessionRequest struct {
	ItemName        string  `json:"item_name" binding:"required"`
	ItemDescription string  `json:"item_description"`
	StartingPrice   float64 `json:"starting_price" binding:"required,gt=0"`
}

// CreateSession starts a new auction session (cashier only)
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

	userID := c.GetUint("userID")

	session := models.AuctionSession{
		ItemName:        req.ItemName,
		ItemDescription: req.ItemDescription,
		StartingPrice:   req.StartingPrice,
		CurrentPrice:    req.StartingPrice,
		TotalCollected:  0,
		Status:          models.StatusOpen,
		CashierID:       userID,
	}

	if err := h.db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Load cashier relationship
	h.db.Preload("Cashier").First(&session, session.ID)

	c.JSON(http.StatusCreated, session)
}

// ListSessions returns all auction sessions with optional status filter
func (h *Handler) ListSessions(c *gin.Context) {
	status := c.Query("status") // Optional: ?status=open

	var sessions []models.AuctionSession
	query := h.db.Preload("Cashier").Preload("Winner")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// GetSession returns a single session with all bids
func (h *Handler) GetSession(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var session models.AuctionSession
	if err := h.db.Preload("Cashier").Preload("Winner").Preload("Bids.Bidder").
		First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// CloseSession ends bidding and declares a winner (cashier only)
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
