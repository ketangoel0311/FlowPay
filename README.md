# FlowPay

A full-stack personal banking dashboard built with Next.js 14, Express.js and MongoDB. FlowPay lets users link real bank accounts via Plaid, transfer money between accounts using a double-entry ledger, and track every transaction with a clean, responsive UI.

## Features

- JWT authentication — register, login, protected routes
- Plaid integration — link real bank accounts in sandbox mode
- Double-entry ledger — every transfer creates a debit and a credit, balance is always computed from ledger entries, never stored
- Idempotent transfers — duplicate requests are safely rejected using a unique key per operation
- ACID transactions — MongoDB sessions ensure transfers are fully atomic
- Real-time balance polling — dashboard and accounts page refresh every 5-6 seconds
- Transaction history — paginated list with status, reference ID and full detail view
- Doughnut chart — visual balance breakdown across all linked accounts
- Dark mode support — full CSS variable token system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI primitives |
| Charts | Chart.js, react-chartjs-2 |
| Backend | Node.js, Express.js |
| Database | MongoDB via Mongoose |
| Auth | JSON Web Tokens (JWT), bcryptjs |
| Banking | Plaid API (sandbox) |

## Project Structure

```
FlowPay/
├── backend/                          # Express API server
│   ├── middleware/
│   │   └── auth.js                   # JWT verification
│   ├── models/
│   │   ├── User.js                   # User with bcrypt hashing
│   │   ├── Account.js                # Bank account with shareable Plaid ID
│   │   ├── LedgerEntry.js            # Immutable double-entry ledger record
│   │   └── Transaction.js            # Transaction with idempotency index
│   ├── routes/
│   │   ├── auth.js                   # /register, /login
│   │   ├── user.js                   # /profile, /dashboard
│   │   ├── accounts.js               # CRUD + balance aggregation
│   │   ├── transactions.js           # List, detail, create
│   │   ├── transfer.js               # ACID transfer with idempotency
│   │   └── plaid.js                  # Plaid link token + exchange
│   ├── server.js
│   └── .env.example
│
└── frontend/                         # Next.js application
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── (dashboard)/
    │   │   ├── layout.tsx            # Sidebar + Header + ProtectedRoute
    │   │   ├── page.tsx              # Main dashboard
    │   │   ├── accounts/page.tsx
    │   │   ├── transactions/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   ├── transfer/page.tsx
    │   │   └── connect-bank/page.tsx
    │   ├── globals.css               # CSS design tokens
    │   ├── layout.tsx                # Root layout
    │   └── providers.tsx             # AuthProvider wrapper
    ├── components/
    │   ├── ui/                       # shadcn/ui primitives
    │   ├── layout/
    │   │   ├── sidebar.tsx
    │   │   ├── header.tsx
    │   │   └── protected-route.tsx
    │   └── dashboard/
    │       └── DoughnutChart.jsx
    ├── contexts/
    │   └── auth-context.tsx          # Auth state and actions
    ├── hooks/
    │   ├── use-toast.ts
    │   └── use-mobile.tsx
    ├── lib/
    │   ├── api.ts                    # Typed fetch wrapper
    │   └── utils.ts                  # cn(), formatINR(), mapTransferLabel()
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── .env.example
```

## How the ledger works

FlowPay never stores a balance on an account. Every monetary movement appends two immutable `LedgerEntry` records — a debit on the source and a credit on the destination. Balance is computed on demand:

```
balance = SUM(credits) - SUM(debits)
```

This mirrors real fintech systems, eliminates race conditions on concurrent transfers, and provides a complete, auditable history of every rupee moved.

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string
- (Optional) A free Plaid sandbox account for bank linking

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/FlowPay.git
cd FlowPay
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env
# Open .env and set MONGODB_URI and JWT_SECRET
npm run dev
```

Backend runs on `http://localhost:5001`.

### 3. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# .env.local already points to http://localhost:5001/api
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Environment variables

### backend/.env

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 5001) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime (default 7d) |
| `PLAID_CLIENT_ID` | Optional | Plaid client ID for bank linking |
| `PLAID_SECRET` | Optional | Plaid secret key |
| `PLAID_ENV` | Optional | sandbox / development / production |

### frontend/.env.local

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

## API reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, receive JWT |
| GET | `/api/user/profile` | Yes | Get user profile |
| GET | `/api/user/dashboard` | Yes | Dashboard stats |
| GET | `/api/accounts` | Yes | Accounts with computed balances |
| POST | `/api/accounts` | Yes | Add account |
| DELETE | `/api/accounts/:id` | Yes | Delete account |
| GET | `/api/transactions` | Yes | Paginated transaction list |
| GET | `/api/transactions/:id` | Yes | Transaction detail |
| GET | `/api/transactions/recent/list` | Yes | Last 5 transactions |
| POST | `/api/transfer` | Yes | Execute idempotent transfer |
| POST | `/api/plaid/create-link-token` | Yes | Get Plaid Link token |
| POST | `/api/plaid/exchange-token` | Yes | Exchange public token |
| GET | `/api/health` | No | Health check |

## Transfer flow

```
POST /api/transfer  {sourceAccountId, receiverShareableId, amount, idempotencyKey}
         │
         ▼
  Create pending Transaction          ← idempotency lock (unique index)
  (11000 duplicate key = already done, return 200)
         │
         ▼
  Open MongoDB session → withTransaction()
  ├── Find source account            (verify ownership)
  ├── Find destination account       (by shareable Plaid ID)
  ├── Aggregate LedgerEntry balance  (SUM credits - SUM debits)
  ├── Check balance >= amount
  ├── insertMany LedgerEntry         (debit source, credit destination)
  ├── Create income Transaction      (receiver side)
  └── Update sender Transaction      (pending → completed)
         │
         ▼
  Return { transferId }

  On any error → abortTransaction → delete pending Transaction
```
