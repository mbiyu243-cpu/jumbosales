package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/titusqpc/jumbo_sales/backend/internal/models"
)

// CreateBeneficiaryRequest defines payload for adding a beneficiary
type CreateBeneficiaryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Category    string `json:"category"` // orphanage, school, hospital, etc.
	Location    string `json:"location"`
	ContactInfo string `json:"contact_info"`
}

// CreateBeneficiary godoc
// @Summary Add beneficiary
// @Description Add a new beneficiary to the system (cashier/admin only)
// @Tags beneficiaries
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateBeneficiaryRequest true "Beneficiary details"
// @Success 201 {object} models.Beneficiary
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /beneficiaries [post]
func (h *Handler) CreateBeneficiary(c *gin.Context) {
	userRole := c.GetString("userRole")
	if userRole != "cashier" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only cashiers can add beneficiaries"})
		return
	}

	var req CreateBeneficiaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	beneficiary := models.Beneficiary{
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		Location:    req.Location,
		ContactInfo: req.ContactInfo,
		IsActive:    true,
	}

	if err := h.db.Create(&beneficiary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create beneficiary"})
		return
	}

	c.JSON(http.StatusCreated, beneficiary)
}

// ListBeneficiaries godoc
// @Summary List beneficiaries
// @Description Get all active beneficiaries with optional category filter
// @Tags beneficiaries
// @Produce json
// @Param category query string false "Filter by category"
// @Success 200 {array} models.Beneficiary
// @Router /beneficiaries [get]
func (h *Handler) ListBeneficiaries(c *gin.Context) {
	category := c.Query("category") // Optional filter

	var beneficiaries []models.Beneficiary
	query := h.db.Where("is_active = ?", true)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Order("name ASC").Find(&beneficiaries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch beneficiaries"})
		return
	}

	c.JSON(http.StatusOK, beneficiaries)
}

// DonateItemRequest defines payload for donating the won item
type DonateItemRequest struct {
	BeneficiaryID uint   `json:"beneficiary_id" binding:"required"`
	Notes         string `json:"notes"`
}

// DonateItem godoc
// @Summary Donate item to beneficiary
// @Description Winner donates the won item to a chosen beneficiary
// @Tags donations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Session ID"
// @Param request body DonateItemRequest true "Donation details"
// @Success 200 {object} models.Donation
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /sessions/{id}/donate [post]
func (h *Handler) DonateItem(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var req DonateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")

	// Get session
	var session models.AuctionSession
	if err := h.db.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// Verify session is closed (not complete) and user is winner
	if session.Status != models.StatusClosed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session must be closed before donating"})
		return
	}

	if session.WinnerID == nil || *session.WinnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the auction winner can donate the item"})
		return
	}

	// Verify beneficiary exists
	var beneficiary models.Beneficiary
	if err := h.db.First(&beneficiary, req.BeneficiaryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Beneficiary not found"})
		return
	}

	// Create donation record
	donation := models.Donation{
		SessionID:     uint(sessionID),
		DonorID:       userID,
		BeneficiaryID: req.BeneficiaryID,
		Notes:         req.Notes,
	}

	tx := h.db.Begin()

	if err := tx.Create(&donation).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record donation"})
		return
	}

	// Update session status to complete
	session.Status = models.StatusComplete
	if err := tx.Save(&session).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session"})
		return
	}

	tx.Commit()

	// Load relationships
	h.db.Preload("Donor").Preload("Beneficiary").Preload("Session").First(&donation, donation.ID)

	c.JSON(http.StatusCreated, donation)
}
