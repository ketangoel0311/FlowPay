# FLOWPAY

A simple full-stack banking simulation app built using Next.js, Node.js, Express, and MongoDB. It allows users to manage accounts, transfer money between users, and view transaction history.

---

## 🚀 Features

- User authentication using JWT
- Create and manage user accounts
- Simulated peer-to-peer money transfer
- Ledger-based transaction tracking (credit & debit entries)
- Balance validation before transfer
- Transaction history with filtering and pagination
- Responsive UI using Next.js

---

## 🛠 Tech Stack

- Frontend: Next.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT

---

## 📌 How it Works

- Each user has an account with transactions
- When a transfer happens:
  - Sender balance is checked
  - Amount is deducted from sender
  - Amount is added to receiver
  - Transaction is recorded in the system
- Users can view and filter their transaction history

---

## 📂 Main Backend Features

- Authentication middleware to protect routes
- Transaction APIs for creating and fetching transactions
- Balance validation logic to prevent invalid transfers
- Pagination to handle large transaction data efficiently

---

## ▶️ Run Locally

```bash
# backend
cd backend
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev