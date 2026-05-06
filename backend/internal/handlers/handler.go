package handlers

import (
	"github.com/titusqpc/jumbo_sales/backend/internal/mpesa"
	"gorm.io/gorm"
)

// Handler holds dependencies for all HTTP handlers
type Handler struct {
	db      *gorm.DB
	Product *ProductHandler
	Mpesa   *MpesaHandler
}

// NewHandler creates a new Handler with injected dependencies
func NewHandler(db *gorm.DB) *Handler {
	mpesaClient := mpesa.NewClient()
	return &Handler{
		db:      db,
		Product: NewProductHandler(db),
		Mpesa:   NewMpesaHandler(db, mpesaClient),
	}
}
