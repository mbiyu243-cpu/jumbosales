package sse

import (
	"encoding/json"
	"sync"
)

// Event represents an SSE event to broadcast
type Event struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Client represents a connected SSE client
type Client struct {
	ID        string
	SessionID uint
	Channel   chan Event
}

// Broker manages SSE connections and broadcasts
type Broker struct {
	clients    map[string]*Client       // clientID -> Client
	sessions   map[uint]map[string]bool // sessionID -> set of clientIDs
	register   chan *Client
	unregister chan *Client
	broadcast  chan sessionEvent
	mu         sync.RWMutex
}

type sessionEvent struct {
	sessionID uint
	event     Event
}

// Global broker instance
var broker *Broker
var once sync.Once

// GetBroker returns the singleton SSE broker
func GetBroker() *Broker {
	once.Do(func() {
		broker = &Broker{
			clients:    make(map[string]*Client),
			sessions:   make(map[uint]map[string]bool),
			register:   make(chan *Client),
			unregister: make(chan *Client),
			broadcast:  make(chan sessionEvent, 100),
		}
		go broker.run()
	})
	return broker
}

// run processes broker events
func (b *Broker) run() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client.ID] = client
			if _, ok := b.sessions[client.SessionID]; !ok {
				b.sessions[client.SessionID] = make(map[string]bool)
			}
			b.sessions[client.SessionID][client.ID] = true
			b.mu.Unlock()

		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client.ID]; ok {
				close(client.Channel)
				delete(b.clients, client.ID)
				if sessionClients, ok := b.sessions[client.SessionID]; ok {
					delete(sessionClients, client.ID)
					if len(sessionClients) == 0 {
						delete(b.sessions, client.SessionID)
					}
				}
			}
			b.mu.Unlock()

		case se := <-b.broadcast:
			b.mu.RLock()
			if clientIDs, ok := b.sessions[se.sessionID]; ok {
				for clientID := range clientIDs {
					if client, ok := b.clients[clientID]; ok {
						select {
						case client.Channel <- se.event:
						default:
							// Client channel is full, skip
						}
					}
				}
			}
			b.mu.RUnlock()
		}
	}
}

// Register adds a new client to the broker
func (b *Broker) Register(client *Client) {
	b.register <- client
}

// Unregister removes a client from the broker
func (b *Broker) Unregister(client *Client) {
	b.unregister <- client
}

// BroadcastToSession sends an event to all clients watching a session
func BroadcastToSession(sessionID uint, event Event) {
	GetBroker().broadcast <- sessionEvent{
		sessionID: sessionID,
		event:     event,
	}
}

// FormatSSE formats an event for SSE wire format
func FormatSSE(event Event) string {
	data, _ := json.Marshal(event)
	return "data: " + string(data) + "\n\n"
}
