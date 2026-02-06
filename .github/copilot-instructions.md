# Copilot Instructions — Jumbo Sales

## Project Overview
**Jumbo Sales** is a crowd-funded charity auction platform (Kenya-focused). The core flow:
1. Cashier lists an item with a starting price (e.g., Jiko @ Ksh 1,000)
2. Bidders bid incrementally — each pays only the **difference** from the previous bid (via M-Pesa, bank, cash)
3. Cashier closes with "1, 2, 3" countdown — last bidder wins
4. Winner **donates** the item to a beneficiary from a curated list

This combines auction mechanics with charitable giving — everyone contributes, winner decides the recipient.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18+ / Vite 5.4 / Bootstrap 4.1 / React Router / Context API |
| **Backend** | Go 1.22 / Gin framework / GORM / JWT auth / REST API |
| **Database** | PostgreSQL (400+ tables, domain-driven schema with FK relationships) |
| **Deployment** | Contabo VPS / nginx 1.24 / systemd / GitHub Actions CI/CD |

---

## Project Structure (Expected)
```
jumbosales/
├── backend/                    # Go + Gin API
│   ├── cmd/main.go             # Entry point, route definitions
│   └── internal/
│       ├── config/database.go  # PostgreSQL connection, migrations
│       ├── handlers/           # HTTP handlers (auth, session, bid, beneficiary, stream)
│       ├── middleware/auth.go  # JWT validation, CORS, role guards
│       ├── models/models.go    # GORM entities: User, AuctionSession, Bid, Payment, Beneficiary, Donation
│       ├── services/           # Business logic (TODO)
│       └── sse/broker.go       # SSE connection manager for real-time bid updates
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── api/client.js       # Axios instance with JWT interceptor
│   │   ├── api/sessions.js     # Session & beneficiary API functions
│   │   ├── components/         # Navbar, SessionCard, BidList, BidForm
│   │   ├── context/AuthContext.jsx  # Auth state (user, token, login, logout)
│   │   ├── hooks/useSSE.js     # Custom hook for SSE connections
│   │   ├── pages/              # Home, Login, Register, Sessions, SessionDetail, CreateSession, Beneficiaries
│   │   └── utils/format.js     # formatKES(), formatRelativeTime(), getStatusClass()
│   ├── vite.config.js          # Vite config with API proxy
│   └── index.html
└── .github/
    └── copilot-instructions.md
```

---

## Development Commands

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Production build → dist/
```

### Backend
```bash
cd backend
go mod tidy          # Sync dependencies
go run cmd/main.go   # Run locally
go build -o jumbo-api cmd/main.go  # Build binary
```

---

## Key Patterns & Conventions

### Frontend
- **State**: Use `AuthContext` for auth state; avoid prop drilling
- **Icons**: Use Bootstrap Icons (`bi-*` classes)
- **API calls**: Centralize in `src/api/` — attach JWT via interceptor
- **Routing**: Protected routes check auth context

### Backend
- **Handlers**: Keep thin — delegate to services
- **Models**: GORM structs with proper tags (`gorm:"..."`, `json:"..."`)
- **Auth**: JWT middleware validates tokens; user ID extracted via `c.Get("userID")`
- **Errors**: Return consistent JSON: `{"error": "message"}`
- **Real-time**: Use **SSE (Server-Sent Events)** for live bid updates to clients

### Database
- 400+ tables — many auto-generated for features
- Domain-driven: `auctions`, `bids`, `users`, `beneficiaries`, `payments`, etc.
- Use GORM migrations or raw SQL for schema changes

---

## Deployment (GitHub Actions → Contabo)

**Frontend**: `npm build` → rsync `dist/` → nginx serves static files  
**Backend**: `go build` → upload binary → `systemctl restart jumbo-api`

Server: `161.97.176.220` (Contabo VPS, Ubuntu, nginx 1.24)

---

## Domain Concepts for AI Agents

| Term | Meaning |
|------|---------|
| **Cashier** | User who creates/manages auction sessions |
| **Bidder** | User who places incremental bids |
| **Increment** | Amount paid = current bid − previous bid |
| **Beneficiary** | Recipient of donated item (chosen by winner) |
| **Session** | One auction event for one item |

---

## TODO: Update This File When...
- Source code is added — document actual file paths and patterns
- Payment integration (M-Pesa) is implemented — add integration notes
- New conventions emerge — keep this doc current
