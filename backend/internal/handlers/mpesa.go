package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/titusqpc/jumbo_sales/backend/internal/models"
	"github.com/titusqpc/jumbo_sales/backend/internal/mpesa"
	"gorm.io/gorm"
)

// MpesaHandler handles M-Pesa related endpoints
type MpesaHandler struct {
	db     *gorm.DB
	client *mpesa.Client
}

// NewMpesaHandler creates a new M-Pesa handler
func NewMpesaHandler(db *gorm.DB, client *mpesa.Client) *MpesaHandler {
	return &MpesaHandler{
		db:     db,
		client: client,
	}
}

// STKPushRequest represents the request to initiate STK Push
type MpesaSTKPushRequest struct {
	Phone     string  `json:"phone" binding:"required"`
	Amount    float64 `json:"amount" binding:"required,gt=0"`
	SessionID uint    `json:"session_id" binding:"required"`
	BidID     uint    `json:"bid_id"`
}

// InitiateSTKPush godoc
// @Summary Initiate M-Pesa STK Push
// @Description Send STK Push to customer's phone for payment
// @Tags mpesa
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body MpesaSTKPushRequest true "STK Push details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /mpesa/stkpush [post]
func (h *MpesaHandler) InitiateSTKPush(c *gin.Context) {
	var req MpesaSTKPushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")

	// Verify session exists
	var session models.AuctionSession
	if err := h.db.First(&session, req.SessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// Create account reference
	accountRef := "JUMBO-" + strconv.Itoa(int(req.SessionID))
	description := "Payment for " + session.ItemName

	// Initiate STK Push
	response, err := h.client.InitiateSTKPush(req.Phone, int(req.Amount), accountRef, description)
	if err != nil {
		log.Printf("M-Pesa STK Push error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initiate M-Pesa payment",
			"details": err.Error(),
		})
		return
	}

	// Store the checkout request for tracking
	mpesaTx := models.MpesaTransaction{
		CheckoutRequestID: response.CheckoutRequestID,
		MerchantRequestID: response.MerchantRequestID,
		SessionID:         req.SessionID,
		BidID:             nil, // Bid will be linked after payment
		UserID:            userID,
		PhoneNumber:       mpesa.FormatPhoneNumber(req.Phone),
		Amount:            req.Amount,
		Status:            "pending",
		ResponseCode:      response.ResponseCode,
		ResponseDesc:      response.ResponseDescription,
	}

	// Link bid if provided
	if req.BidID > 0 {
		mpesaTx.BidID = &req.BidID
	}

	if err := h.db.Create(&mpesaTx).Error; err != nil {
		log.Printf("Failed to store M-Pesa transaction: %v", err)
		log.Printf("Transaction data: CheckoutRequestID=%s, Phone=%s, Amount=%.2f, SessionID=%d, UserID=%d",
			mpesaTx.CheckoutRequestID, mpesaTx.PhoneNumber, mpesaTx.Amount, mpesaTx.SessionID, mpesaTx.UserID)
		// Don't fail the request, STK Push was sent successfully
	} else {
		log.Printf("M-Pesa transaction created: ID=%d, CheckoutRequestID=%s", mpesaTx.ID, mpesaTx.CheckoutRequestID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":             true,
		"message":             response.CustomerMessage,
		"checkout_request_id": response.CheckoutRequestID,
		"merchant_request_id": response.MerchantRequestID,
	})
}

// STKPushCallback godoc
// @Summary M-Pesa STK Push Callback
// @Description Receives callback from M-Pesa after payment
// @Tags mpesa
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /mpesa/callback [post]
func (h *MpesaHandler) STKPushCallback(c *gin.Context) {
	// Read raw body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed to read callback body: %v", err)
		c.JSON(http.StatusOK, gin.H{"ResultCode": 1, "ResultDesc": "Failed to read body"})
		return
	}

	log.Printf("========== M-Pesa Callback Received ==========")
	log.Printf("Raw JSON: %s", string(body))
	log.Printf("============================================")

	// Parse callback
	var callback mpesa.CallbackBody
	if err := json.Unmarshal(body, &callback); err != nil {
		log.Printf("Failed to parse callback: %v", err)
		c.JSON(http.StatusOK, gin.H{"ResultCode": 1, "ResultDesc": "Failed to parse callback"})
		return
	}

	stkCallback := callback.Body.STKCallback
	checkoutRequestID := stkCallback.CheckoutRequestID
	resultCode := stkCallback.ResultCode
	resultDesc := stkCallback.ResultDesc

	// Find the transaction
	var mpesaTx models.MpesaTransaction
	if err := h.db.Where("checkout_request_id = ?", checkoutRequestID).First(&mpesaTx).Error; err != nil {
		log.Printf("M-Pesa transaction not found for CheckoutRequestID: %s", checkoutRequestID)
		c.JSON(http.StatusOK, gin.H{"ResultCode": 0, "ResultDesc": "Accepted"})
		return
	}

	// Update transaction status
	if resultCode == 0 {
		// Payment successful
		metadata := mpesa.ParseCallbackMetadata(&callback)

		mpesaTx.Status = "completed"
		mpesaTx.ResultCode = resultCode
		mpesaTx.ResultDesc = resultDesc

		if receipt, ok := metadata["MpesaReceiptNumber"].(string); ok {
			mpesaTx.MpesaReceiptNumber = receipt
		}
		if transDate, ok := metadata["TransactionDate"].(float64); ok {
			mpesaTx.TransactionDate = time.Unix(int64(transDate), 0)
		}

		h.db.Save(&mpesaTx)

		// Update payment record if bid exists
		if mpesaTx.BidID != nil && *mpesaTx.BidID > 0 {
			var payment models.Payment
			if err := h.db.Where("bid_id = ?", *mpesaTx.BidID).First(&payment).Error; err == nil {
				payment.Status = models.PaymentConfirmed
				payment.TransactionRef = mpesaTx.MpesaReceiptNumber
				now := time.Now()
				payment.ConfirmedAt = &now
				h.db.Save(&payment)
			}
		}

		log.Printf("M-Pesa payment successful: %s, Receipt: %s", checkoutRequestID, mpesaTx.MpesaReceiptNumber)
	} else {
		// Payment failed
		mpesaTx.Status = "failed"
		mpesaTx.ResultCode = resultCode
		mpesaTx.ResultDesc = resultDesc
		h.db.Save(&mpesaTx)

		log.Printf("M-Pesa payment failed: %s, Reason: %s", checkoutRequestID, resultDesc)
	}

	c.JSON(http.StatusOK, gin.H{"ResultCode": 0, "ResultDesc": "Callback processed"})
}

// CheckPaymentStatus godoc
// @Summary Check M-Pesa payment status
// @Description Check the status of an STK Push payment
// @Tags mpesa
// @Produce json
// @Security BearerAuth
// @Param checkout_request_id path string true "Checkout Request ID"
// @Success 200 {object} models.MpesaTransaction
// @Failure 404 {object} map[string]string
// @Router /mpesa/status/{checkout_request_id} [get]
func (h *MpesaHandler) CheckPaymentStatus(c *gin.Context) {
	checkoutRequestID := c.Param("checkout_request_id")

	var mpesaTx models.MpesaTransaction
	if err := h.db.Where("checkout_request_id = ?", checkoutRequestID).First(&mpesaTx).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, mpesaTx)
}

// ConfirmPaymentManual godoc
// @Summary Manually confirm payment (for testing/dev)
// @Description Manually mark payment as completed when callback fails
// @Tags mpesa
// @Produce json
// @Security BearerAuth
// @Param checkout_request_id path string true "Checkout Request ID"
// @Param receipt path string false "M-Pesa receipt number"
// @Success 200 {object} models.MpesaTransaction
// @Failure 404 {object} map[string]string
// @Router /mpesa/confirm/{checkout_request_id} [post]
func (h *MpesaHandler) ConfirmPaymentManual(c *gin.Context) {
	checkoutRequestID := c.Param("checkout_request_id")
	receipt := c.Query("receipt")

	var mpesaTx models.MpesaTransaction
	if err := h.db.Where("checkout_request_id = ?", checkoutRequestID).First(&mpesaTx).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Update transaction as completed
	mpesaTx.Status = "completed"
	if receipt == "" {
		receipt = "MANUAL-" + checkoutRequestID
	}
	mpesaTx.MpesaReceiptNumber = receipt
	mpesaTx.ResultCode = 0
	mpesaTx.ResultDesc = "Manually confirmed"
	now := time.Now()
	mpesaTx.TransactionDate = now

	if err := h.db.Save(&mpesaTx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm payment"})
		return
	}

	// Update associated bid and payment if exists
	if mpesaTx.BidID != nil && *mpesaTx.BidID > 0 {
		var payment models.Payment
		if err := h.db.Where("bid_id = ?", *mpesaTx.BidID).First(&payment).Error; err == nil {
			payment.Status = models.PaymentConfirmed
			payment.TransactionRef = mpesaTx.MpesaReceiptNumber
			payment.ConfirmedAt = &now
			h.db.Save(&payment)
		}
	}

	c.JSON(http.StatusOK, mpesaTx)
}
