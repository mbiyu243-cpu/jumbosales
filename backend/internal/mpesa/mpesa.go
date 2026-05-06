package mpesa

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Config holds M-Pesa API configuration
type Config struct {
	ConsumerKey       string
	ConsumerSecret    string
	BusinessShortCode string
	PassKey           string
	CallbackURL       string
	BaseURL           string // https://api.safaricom.co.ke for production
}

// STKPushRequest represents the STK Push request payload
type STKPushRequest struct {
	BusinessShortCode string `json:"BusinessShortCode"`
	Password          string `json:"Password"`
	Timestamp         string `json:"Timestamp"`
	TransactionType   string `json:"TransactionType"`
	Amount            int    `json:"Amount"`
	PartyA            string `json:"PartyA"`
	PartyB            string `json:"PartyB"`
	PhoneNumber       string `json:"PhoneNumber"`
	CallBackURL       string `json:"CallBackURL"`
	AccountReference  string `json:"AccountReference"`
	TransactionDesc   string `json:"TransactionDesc"`
}

// STKPushResponse represents the M-Pesa STK Push response
type STKPushResponse struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
	ErrorCode           string `json:"errorCode,omitempty"`
	ErrorMessage        string `json:"errorMessage,omitempty"`
}

// CallbackBody represents the callback payload from M-Pesa
type CallbackBody struct {
	Body struct {
		STKCallback struct {
			MerchantRequestID string `json:"MerchantRequestID"`
			CheckoutRequestID string `json:"CheckoutRequestID"`
			ResultCode        int    `json:"ResultCode"`
			ResultDesc        string `json:"ResultDesc"`
			CallbackMetadata  struct {
				Item []struct {
					Name  string      `json:"Name"`
					Value interface{} `json:"Value"`
				} `json:"Item"`
			} `json:"CallbackMetadata"`
		} `json:"stkCallback"`
	} `json:"Body"`
}

// Client represents the M-Pesa API client
type Client struct {
	config     Config
	httpClient *http.Client
}

// NewClient creates a new M-Pesa client
func NewClient() *Client {
	return &Client{
		config: Config{
			ConsumerKey:       getEnv("MPESA_CONSUMER_KEY", ""),
			ConsumerSecret:    getEnv("MPESA_CONSUMER_SECRET", ""),
			BusinessShortCode: getEnv("MPESA_SHORTCODE", "4148891"),
			PassKey:           getEnv("MPESA_PASSKEY", ""),
			CallbackURL:       getEnv("MPESA_CALLBACK_URL", "https://jumbosalesbackend.qpcgroupafrica.com/api/mpesa/callback"),
			BaseURL:           getEnv("MPESA_BASE_URL", "https://api.safaricom.co.ke"),
		},
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// getEnv returns environment variable or default
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GetAccessToken fetches OAuth access token from M-Pesa
func (c *Client) GetAccessToken() (string, error) {
	url := fmt.Sprintf("%s/oauth/v1/generate?grant_type=client_credentials", c.config.BaseURL)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Basic auth with consumer key and secret
	auth := base64.StdEncoding.EncodeToString([]byte(c.config.ConsumerKey + ":" + c.config.ConsumerSecret))
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get access token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   string `json:"expires_in"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if result.AccessToken == "" {
		return "", fmt.Errorf("empty access token, response: %s", string(body))
	}

	log.Printf("M-Pesa access token obtained successfully")
	return result.AccessToken, nil
}

// FormatPhoneNumber formats phone number to 254XXXXXXXXX format
func FormatPhoneNumber(phone string) string {
	// Remove spaces, dashes, and plus signs
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, "+", "")

	// Handle different formats
	if strings.HasPrefix(phone, "0") {
		phone = "254" + phone[1:]
	} else if strings.HasPrefix(phone, "7") || strings.HasPrefix(phone, "1") {
		phone = "254" + phone
	}

	return phone
}

// InitiateSTKPush initiates an STK Push request
func (c *Client) InitiateSTKPush(phone string, amount int, accountRef, description string) (*STKPushResponse, error) {
	// Get access token
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	// Generate timestamp (Kenya timezone = UTC+3)
	loc, _ := time.LoadLocation("Africa/Nairobi")
	timestamp := time.Now().In(loc).Format("20060102150405")

	// Generate password
	password := base64.StdEncoding.EncodeToString(
		[]byte(c.config.BusinessShortCode + c.config.PassKey + timestamp),
	)

	// Format phone number
	formattedPhone := FormatPhoneNumber(phone)

	// Prepare request
	stkRequest := STKPushRequest{
		BusinessShortCode: c.config.BusinessShortCode,
		Password:          password,
		Timestamp:         timestamp,
		TransactionType:   "CustomerPayBillOnline",
		Amount:            amount,
		PartyA:            formattedPhone,
		PartyB:            c.config.BusinessShortCode,
		PhoneNumber:       formattedPhone,
		CallBackURL:       c.config.CallbackURL,
		AccountReference:  accountRef,
		TransactionDesc:   description,
	}

	jsonBody, err := json.Marshal(stkRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	log.Printf("========== M-Pesa STK Push Request ==========")
	log.Printf("Phone: %s | Amount: %d | Account: %s", formattedPhone, amount, accountRef)
	log.Printf("JSON Payload: %s", string(jsonBody))
	log.Printf("==========================================")

	// Make request
	url := fmt.Sprintf("%s/mpesa/stkpush/v1/processrequest", c.config.BaseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	log.Printf("M-Pesa STK Push response: %s", string(body))

	var result STKPushResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if result.ErrorCode != "" {
		return nil, fmt.Errorf("M-Pesa error: %s - %s", result.ErrorCode, result.ErrorMessage)
	}

	return &result, nil
}

// ParseCallbackMetadata extracts metadata from callback
func ParseCallbackMetadata(callback *CallbackBody) map[string]interface{} {
	metadata := make(map[string]interface{})
	for _, item := range callback.Body.STKCallback.CallbackMetadata.Item {
		metadata[item.Name] = item.Value
	}
	return metadata
}
