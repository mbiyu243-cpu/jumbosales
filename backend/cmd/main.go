package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/gin-contrib/cors"

	"github.com/titusqpc/jumbo_sales/backend/internal/config"
	"github.com/titusqpc/jumbo_sales/backend/internal/handlers"
	"github.com/titusqpc/jumbo_sales/backend/internal/middleware"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect DB
	db, err := config.InitDB()
	if err != nil {
		log.Fatal(err)
	}

	// Run migrations
	config.RunMigrations(db)

	// Gin router
	r := gin.Default()

	r.Use(cors.Default())

	// Serve uploaded images
    uploadsPath := filepath.Join(".", "uploads")
    absUploadsPath, _ := filepath.Abs(uploadsPath)
    log.Println("Serving uploads from:", absUploadsPath)

    r.Static("/uploads", absUploadsPath)

	// Handlers
	h := handlers.NewHandler(db)

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

// Public auth routes
api := r.Group("/api")
{
	api.POST("/auth/register", h.Register)
	api.POST("/auth/login", h.Login)
	api.GET("/beneficiaries", h.ListBeneficiaries)
}

// Protected routes
protected := api.Group("")
protected.Use(middleware.JWTAuth())
{
	protected.GET("/me", h.GetCurrentUser)
	protected.PUT("/me/password", h.ChangePassword)
	protected.PUT("/me/profile", h.UpdateProfile)

	protected.POST("/sessions", h.CreateSession)
	protected.DELETE("/beneficiaries/:id", h.DeleteBeneficiary)
	protected.PUT("/beneficiaries/:id", h.UpdateBeneficiary)
	protected.GET("/sessions", h.ListSessions)
	protected.GET("/sessions/:id", h.GetSession)
	protected.POST("/sessions/:id/close", h.CloseSession)
	protected.POST("/sessions/:id/bids", h.PlaceBid)
	protected.GET("/sessions/:id/bids", h.ListBids)
	protected.POST("/sessions/:id/donate", h.DonateItem)
	protected.DELETE("/sessions/:id", h.DeleteSession)

	protected.POST("/beneficiaries", h.CreateBeneficiary)

	protected.GET("/products", h.Product.List)
	protected.GET("/products/:id", h.Product.Get)
	protected.POST("/products", h.Product.Create)
	protected.PUT("/products/:id", h.Product.Update)
	protected.DELETE("/products/:id", h.Product.Delete)
	protected.POST("/products/upload-image", h.Product.UploadImage)
}
	// Port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Server starting on port", port)
	r.Run(":" + port)
}