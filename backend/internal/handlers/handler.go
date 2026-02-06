package handlers

import (
	"gorm.io/gorm"
)

// Handler holds dependencies for all HTTP handlers
type Handler struct {
	db *gorm.DB
}

// NewHandler creates a new Handler with injected dependencies
func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}
