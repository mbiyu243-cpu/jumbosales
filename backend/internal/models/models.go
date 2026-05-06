package models

import (
	"time"

	"gorm.io/gorm"
)

// UserRole defines the type of user in the system
type UserRole string

const (
	RoleCashier UserRole = "cashier" // Creates and manages auction sessions
	RoleBidder  UserRole = "bidder"  // Participates in auctions by placing bids
	RoleAdmin   UserRole = "admin"   // System administrator
)

// User represents a registered user (cashier, bidder, or admin)
type User struct {
	gorm.Model
	Name         string   `gorm:"not null" json:"name"`
	Email        string   `gorm:"uniqueIndex;not null" json:"email"`
	Phone        string   `gorm:"uniqueIndex;not null" json:"phone"` // For M-Pesa payments
	PasswordHash string   `gorm:"not null" json:"-"`                 // Never expose in JSON
	Role         UserRole `gorm:"default:bidder" json:"role"`
	IsActive     bool     `gorm:"default:true" json:"is_active"`

	// Relationships
	SessionsCreated []AuctionSession `gorm:"foreignKey:CashierID" json:"sessions_created,omitempty"`
	Bids            []Bid            `gorm:"foreignKey:BidderID" json:"bids,omitempty"`
	Donations       []Donation       `gorm:"foreignKey:DonorID" json:"donations,omitempty"`
}

// SessionStatus represents the current state of an auction session
type SessionStatus string

const (
	StatusOpen     SessionStatus = "open"     // Accepting bids
	StatusClosing  SessionStatus = "closing"  // Cashier counting 1,2,3
	StatusClosed   SessionStatus = "closed"   // Bidding ended, awaiting donation
	StatusComplete SessionStatus = "complete" // Item donated to beneficiary
)

// AuctionSession represents a single auction event for one item
type AuctionSession struct {
	gorm.Model
	ItemName        string        `gorm:"not null" json:"item_name"`
	ItemDescription string        `json:"item_description"`
	StartingPrice   float64       `gorm:"not null" json:"starting_price"`   // Initial price in KES
	CurrentPrice    float64       `gorm:"not null" json:"current_price"`    // Latest bid amount
	TotalCollected  float64       `gorm:"default:0" json:"total_collected"` // Sum of all payments
	Status          SessionStatus `gorm:"default:open" json:"status"`
	EndTime         *time.Time    `json:"end_time"`
	CashierID       uint          `gorm:"not null" json:"cashier_id"`
	WinnerID        *uint         `json:"winner_id,omitempty"`  // Last bidder when closed
	ProductID       *uint         `json:"product_id,omitempty"` // Optional: link to product catalog
	IsArchived      bool          `gorm:"default:false" json:"is_archived"`

	// Relationships
	Cashier *User    `gorm:"foreignKey:CashierID" json:"cashier,omitempty"`
	Winner  *User    `gorm:"foreignKey:WinnerID" json:"winner,omitempty"`
	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Bids    []Bid    `gorm:"foreignKey:SessionID" json:"bids,omitempty"`
}

// Bid represents a single bid in an auction session
type Bid struct {
	gorm.Model
	SessionID     uint    `gorm:"not null;index" json:"session_id"`
	BidderID      uint    `gorm:"not null;index" json:"bidder_id"`
	BidAmount     float64 `gorm:"not null" json:"bid_amount"`     // The total bid value
	IncrementPaid float64 `gorm:"not null" json:"increment_paid"` // Amount bidder actually paid (difference from previous)
	BidOrder      int     `gorm:"not null" json:"bid_order"`      // Sequence number (1st, 2nd, etc.)

	// Relationships
	Session *AuctionSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	Bidder  *User           `gorm:"foreignKey:BidderID" json:"bidder,omitempty"`
	Payment *Payment        `gorm:"foreignKey:BidID" json:"payment,omitempty"`
}

// PaymentMethod defines how the bidder paid
type PaymentMethod string

const (
	PaymentMpesa PaymentMethod = "mpesa"
	PaymentBank  PaymentMethod = "bank"
	PaymentCash  PaymentMethod = "cash"
)

// PaymentStatus tracks the state of a payment
type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "pending"
	PaymentConfirmed PaymentStatus = "confirmed"
	PaymentFailed    PaymentStatus = "failed"
)

// Payment records the actual money transfer for a bid
type Payment struct {
	gorm.Model
	BidID          uint          `gorm:"uniqueIndex;not null" json:"bid_id"`
	Amount         float64       `gorm:"not null" json:"amount"`
	Method         PaymentMethod `gorm:"not null" json:"method"`
	Status         PaymentStatus `gorm:"default:pending" json:"status"`
	TransactionRef string        `json:"transaction_ref,omitempty"` // M-Pesa code, bank ref, etc.
	ConfirmedAt    *time.Time    `json:"confirmed_at,omitempty"`
	ConfirmedByID  *uint         `json:"confirmed_by_id,omitempty"` // Cashier who confirmed

	// Relationships
	Bid         *Bid  `gorm:"foreignKey:BidID" json:"bid,omitempty"`
	ConfirmedBy *User `gorm:"foreignKey:ConfirmedByID" json:"confirmed_by,omitempty"`
}

// Beneficiary represents a person/organization that can receive donated items
type Beneficiary struct {
	gorm.Model
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"` // e.g., "orphanage", "school", "hospital"
	Location    string `json:"location"` // Physical location
	ContactInfo string `json:"contact_info"`
	PhotoURL    string `json:"photo_url"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`

	// Relationships
	Donations []Donation `gorm:"foreignKey:BeneficiaryID" json:"donations,omitempty"`
}

// Donation records when a winner donates the won item to a beneficiary
type Donation struct {
	gorm.Model
	SessionID     uint   `gorm:"uniqueIndex;not null" json:"session_id"`
	DonorID       uint   `gorm:"not null" json:"donor_id"` // The auction winner
	BeneficiaryID uint   `gorm:"not null" json:"beneficiary_id"`
	Notes         string `json:"notes,omitempty"`

	// Relationships
	Session     *AuctionSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	Donor       *User           `gorm:"foreignKey:DonorID" json:"donor,omitempty"`
	Beneficiary *Beneficiary    `gorm:"foreignKey:BeneficiaryID" json:"beneficiary,omitempty"`
}

// Product represents a catalog item that can be used in auction sessions
type Product struct {
	gorm.Model
	Name           string  `gorm:"not null" json:"name"`
	Description    string  `json:"description"`
	Category       string  `json:"category"`                        // e.g., "furniture", "electronics", "clothing"
	SuggestedPrice float64 `gorm:"not null" json:"suggested_price"` // Suggested starting price in KES
	ImageURL       string  `json:"image_url,omitempty"`
	IsActive       bool    `gorm:"default:true" json:"is_active"`
	CreatedByID    uint    `gorm:"not null" json:"created_by_id"`

	// Relationships
	CreatedBy *User `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
}

// MpesaTransaction tracks M-Pesa STK Push transactions
type MpesaTransaction struct {
	gorm.Model
	CheckoutRequestID  string    `gorm:"uniqueIndex;not null" json:"checkout_request_id"`
	MerchantRequestID  string    `json:"merchant_request_id"`
	SessionID          uint      `gorm:"index" json:"session_id"`
	BidID              *uint     `gorm:"index" json:"bid_id"` // Nullable - bid happens after payment
	UserID             uint      `gorm:"index" json:"user_id"`
	PhoneNumber        string    `gorm:"not null" json:"phone_number"`
	Amount             float64   `gorm:"not null" json:"amount"`
	Status             string    `gorm:"default:pending" json:"status"` // pending, completed, failed
	ResponseCode       string    `json:"response_code"`
	ResponseDesc       string    `json:"response_desc"`
	ResultCode         int       `json:"result_code"`
	ResultDesc         string    `json:"result_desc"`
	MpesaReceiptNumber string    `json:"mpesa_receipt_number,omitempty"`
	TransactionDate    time.Time `json:"transaction_date,omitempty"`

	// Relationships
	Session *AuctionSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	Bid     *Bid            `gorm:"foreignKey:BidID" json:"bid,omitempty"`
	User    *User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
