package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/titusqpc/jumbo_sales/backend/internal/sse"
)

// StreamBids establishes an SSE connection for real-time bid updates
func (h *Handler) StreamBids(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid session ID"})
		return
	}

	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// Create client
	client := &sse.Client{
		ID:        uuid.New().String(),
		SessionID: uint(sessionID),
		Channel:   make(chan sse.Event, 10),
	}

	// Register client with broker
	broker := sse.GetBroker()
	broker.Register(client)

	// Clean up on disconnect
	defer broker.Unregister(client)

	// Send initial connection event
	c.Writer.Write([]byte(sse.FormatSSE(sse.Event{
		Type: "connected",
		Data: map[string]interface{}{
			"session_id": sessionID,
			"message":    "Connected to bid stream",
		},
	})))
	c.Writer.Flush()

	// Stream events to client
	clientGone := c.Request.Context().Done()
	for {
		select {
		case <-clientGone:
			return
		case event := <-client.Channel:
			_, err := c.Writer.Write([]byte(sse.FormatSSE(event)))
			if err != nil {
				return
			}
			c.Writer.Flush()
		}
	}
}
