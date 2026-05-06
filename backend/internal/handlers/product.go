package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/titusqpc/jumbo_sales/backend/internal/models"
	"gorm.io/gorm"
)

// ProductHandler handles product-related HTTP requests
type ProductHandler struct {
	db *gorm.DB
}

// NewProductHandler creates a new ProductHandler
func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{db: db}
}

// ListProductsRequest represents query parameters for listing products
type ListProductsRequest struct {
	Category string `form:"category"`
	Active   *bool  `form:"active"`
}

// CreateProductRequest represents the request body for creating a product
type CreateProductRequest struct {
	Name           string  `json:"name" binding:"required"`
	Description    string  `json:"description"`
	Category       string  `json:"category"`
	SuggestedPrice float64 `json:"suggested_price" binding:"required,gt=0"`
	ImageURL       string  `json:"image_url"`
}

// UpdateProductRequest represents the request body for updating a product
type UpdateProductRequest struct {
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Category       string  `json:"category"`
	SuggestedPrice float64 `json:"suggested_price"`
	ImageURL       string  `json:"image_url"`
	IsActive       *bool   `json:"is_active"`
}

// List godoc
// @Summary List all products
// @Description Get all products, optionally filtered by category
// @Tags products
// @Accept json
// @Produce json
// @Param category query string false "Filter by category"
// @Param active query bool false "Filter by active status"
// @Security BearerAuth
// @Success 200 {array} models.Product
// @Failure 500 {object} map[string]string
// @Router /products [get]
func (h *ProductHandler) List(c *gin.Context) {
	var req ListProductsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var products []models.Product
	query := h.db.Preload("CreatedBy")

	if req.Category != "" {
		query = query.Where("category = ?", req.Category)
	}

	if req.Active != nil {
		query = query.Where("is_active = ?", *req.Active)
	}

	if err := query.Order("created_at DESC").Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	c.JSON(http.StatusOK, products)
}

// Get godoc
// @Summary Get a product by ID
// @Description Get a single product with details
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Security BearerAuth
// @Success 200 {object} models.Product
// @Failure 404 {object} map[string]string
// @Router /products/{id} [get]
func (h *ProductHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.Preload("CreatedBy").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

// Create godoc
// @Summary Create a new product
// @Description Create a new product in the catalog (cashier only)
// @Tags products
// @Accept json
// @Produce json
// @Param product body CreateProductRequest true "Product data"
// @Security BearerAuth
// @Success 201 {object} models.Product
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /products [post]
func (h *ProductHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product := models.Product{
		Name:           req.Name,
		Description:    req.Description,
		Category:       req.Category,
		SuggestedPrice: req.SuggestedPrice,
		ImageURL:       req.ImageURL,
		IsActive:       true,
		CreatedByID:    userID.(uint),
	}

	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	// Reload with creator
	h.db.Preload("CreatedBy").First(&product, product.ID)

	c.JSON(http.StatusCreated, product)
}

// Update godoc
// @Summary Update a product
// @Description Update an existing product (cashier only)
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Param product body UpdateProductRequest true "Product data"
// @Security BearerAuth
// @Success 200 {object} models.Product
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /products/{id} [put]
func (h *ProductHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.SuggestedPrice > 0 {
		updates["suggested_price"] = req.SuggestedPrice
	}
	if req.ImageURL != "" {
		updates["image_url"] = req.ImageURL
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := h.db.Model(&product).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	// Reload with creator
	h.db.Preload("CreatedBy").First(&product, product.ID)

	c.JSON(http.StatusOK, product)
}

// Delete godoc
// @Summary Delete a product
// @Description Soft delete a product (cashier only)
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Security BearerAuth
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /products/{id} [delete]
func (h *ProductHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if err := h.db.Delete(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

// UploadProductImage godoc
// @Summary Upload product image
// @Description Upload an image for a product
// @Tags products
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param image formData file true "Product image"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /products/upload-image [post]
func (h *ProductHandler) UploadImage(c *gin.Context) {
	// Get file from form
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image provided"})
		return
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image size must be less than 5MB"})
		return
	}

	// Validate file type
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	if !allowedTypes[file.Header.Get("Content-Type")] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPEG, PNG, GIF, and WebP images are allowed"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadsDir := "./uploads"
	if _, err := os.Stat(uploadsDir); os.IsNotExist(err) {
		os.MkdirAll(uploadsDir, 0755)
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("product_%d%s", time.Now().UnixNano(), ext)
	filepath := filepath.Join(uploadsDir, filename)

	// Save file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer src.Close()

	dst, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
		return
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
		return
	}

	// Return URL relative to web root
	imageURL := "/uploads/" + filename

	c.JSON(http.StatusOK, gin.H{
		"image_url": imageURL,
		"filename":  filename,
	})
}
