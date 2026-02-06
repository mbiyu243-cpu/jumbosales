package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	_ "github.com/titusqpc/jumbo_sales/backend/docs"
	"github.com/titusqpc/jumbo_sales/backend/internal/config"
	"github.com/titusqpc/jumbo_sales/backend/internal/handlers"
	"github.com/titusqpc/jumbo_sales/backend/internal/middleware"
)

// @title Jumbo Sales API
// @version 1.0
// @description Crowd-funded charity auction platform API. Bidders pay increments, winners donate items to beneficiaries.
// @termsOfService http://swagger.io/terms/

// @contact.name QPC Group Africa
// @contact.url https://qpcgroupafrica.com
// @contact.email titus@qpcgroupafrica.com

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host jumbosalesbackend.qpcgroupafrica.com
// @BasePath /api

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize database connection
	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := config.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize Gin router
	router := gin.Default()

	// Apply global middleware
	router.Use(middleware.CORS())

	// Initialize handlers with dependencies
	h := handlers.NewHandler(db)

	// Root landing page - redirect to Swagger
	router.GET("/", func(c *gin.Context) {
		c.Redirect(302, "/swagger/index.html")
	})

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Health check endpoint
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "jumbo-api"})
	})

	// Public routes (no auth required)
	public := router.Group("/api")
	{
		public.POST("/auth/register", h.Register)
		public.POST("/auth/login", h.Login)
		public.GET("/beneficiaries", h.ListBeneficiaries)
	}

	// Protected routes (JWT auth required)
	protected := router.Group("/api")
	protected.Use(middleware.JWTAuth())
	{
		// User routes
		protected.GET("/me", h.GetCurrentUser)

		// Auction session routes
		protected.POST("/sessions", h.CreateSession)
		protected.GET("/sessions", h.ListSessions)
		protected.GET("/sessions/:id", h.GetSession)
		protected.POST("/sessions/:id/close", h.CloseSession)

		// Bidding routes
		protected.POST("/sessions/:id/bids", h.PlaceBid)
		protected.GET("/sessions/:id/bids", h.ListBids)

		// Donation routes (winner selects beneficiary)
		protected.POST("/sessions/:id/donate", h.DonateItem)

		// SSE endpoint for real-time bid updates
		protected.GET("/sessions/:id/stream", h.StreamBids)

		// Beneficiary management (cashier only)
		protected.POST("/beneficiaries", h.CreateBeneficiary)
	}

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
