package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/titusqpc/jumbo_sales/backend/internal/models"
	"github.com/titusqpc/jumbo_sales/backend/internal/sse"
)

// PlaceBidRequest defines payload for placing a bid
type PlaceBidRequest struct {
	BidAmount      float64 `json:"bid_amount" binding:"required,gt=0"`
	PaymentMethod  string  `json:"payment_method" binding:"required"` // mpesa, bank, cash
	TransactionRef string  `json:"transaction_ref"`                   // Optional: M-Pesa code, bank ref
}

// PlaceBid godoc
// @Summary Place a bid
// @Description Place a bid on an open auction session. Bidder pays only the increment (difference from previous bid).
// @Tags bids
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Param request body PlaceBidRequest true "Bid details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /sessions/{id}/bids [post]
func (h *Handler) PlaceBid(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var req PlaceBidRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")

	// Get current session
	var session models.AuctionSession
	if err := h.db.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if session.Status != models.StatusOpen {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session is not open for bidding"})
		return
	}

	// Validate bid is higher than current price
	if req.BidAmount <= session.CurrentPrice {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bid must be higher than current price"})
		return
	}

	// Calculate increment (what bidder pays)
	increment := req.BidAmount - session.CurrentPrice

	// Get bid order (count existing bids + 1)
	var bidCount int64
	h.db.Model(&models.Bid{}).Where("session_id = ?", sessionID).Count(&bidCount)

	// Create bid
	bid := models.Bid{
		SessionID:     uint(sessionID),
		BidderID:      userID,
		BidAmount:     req.BidAmount,
		IncrementPaid: increment,
		BidOrder:      int(bidCount) + 1,
	}

	// Start transaction
	tx := h.db.Begin()

	if err := tx.Create(&bid).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to place bid"})
		return
	}

	// Create payment record
	payment := models.Payment{
		BidID:          bid.ID,
		Amount:         increment,
		Method:         models.PaymentMethod(req.PaymentMethod),
		Status:         models.PaymentConfirmed, // For now, auto-confirm. TODO: integrate M-Pesa webhook
		TransactionRef: req.TransactionRef,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record payment"})
		return
	}

	// Update session current price and total collected
	session.CurrentPrice = req.BidAmount
	session.TotalCollected += increment

	if err := tx.Save(&session).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session"})
		return
	}

	tx.Commit()

	// Load bidder info
	h.db.Preload("Bidder").First(&bid, bid.ID)

	// Broadcast new bid via SSE to all connected clients
	sse.BroadcastToSession(uint(sessionID), sse.Event{
		Type: "new_bid",
		Data: map[string]interface{}{
			"bid_id":          bid.ID,
			"bid_amount":      bid.BidAmount,
			"increment_paid":  bid.IncrementPaid,
			"bid_order":       bid.BidOrder,
			"bidder_name":     bid.Bidder.Name,
			"bidder_id":       bid.BidderID,
			"current_price":   session.CurrentPrice,
			"total_collected": session.TotalCollected,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"bid":     bid,
		"session": session,
	})
}

// ListBids godoc
// @Summary List bids for session
// @Description Get all bids placed on an auction session
// @Tags bids
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Success 200 {array} models.Bid
// @Router /sessions/{id}/bids [get]
func (h *Handler) ListBids(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var bids []models.Bid
	if err := h.db.Preload("Bidder").Where("session_id = ?", sessionID).
		Order("bid_order ASC").Find(&bids).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bids"})
		return
	}

	c.JSON(http.StatusOK, bids)
}
