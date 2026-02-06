# Jumbo Sales

Crowd-funded charity auction platform where everyone contributes, and winners donate.

## Quick Start

### Backend (Go + Gin)
```bash
cd backend
cp .env.example .env     # Configure your database
go mod tidy
go run cmd/main.go       # Starts on :8080
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev              # Starts on :5173
```

## How Jumbo Sales Works

1. **Cashier** lists an item with a starting price (e.g., Jiko @ Ksh 1,000)
2. **Bidders** bid up incrementally — each pays only the **difference** from the previous bid
3. **Cashier** counts "1, 2, 3" — last bidder wins
4. **Winner** donates the item to a beneficiary from the list

Everyone contributes money. Winner decides who receives the item.

## Tech Stack

- **Frontend**: React 18 / Vite / Bootstrap 4.1 / React Router
- **Backend**: Go 1.22 / Gin / GORM / JWT
- **Database**: PostgreSQL
- **Real-time**: Server-Sent Events (SSE)

## Project Structure

```
jumbosales/
├── backend/
│   ├── cmd/main.go              # Entry point
│   └── internal/
│       ├── config/              # Database config
│       ├── handlers/            # HTTP handlers
│       ├── middleware/          # JWT auth, CORS
│       ├── models/              # GORM models
│       ├── services/            # Business logic
│       └── sse/                 # Real-time events
├── frontend/
│   └── src/
│       ├── api/                 # API client
│       ├── components/          # Reusable UI
│       ├── context/             # Auth state
│       ├── hooks/               # Custom hooks (SSE)
│       ├── pages/               # Route pages
│       └── utils/               # Helpers
└── .github/
    └── copilot-instructions.md  # AI agent guide
```

## License

MIT
