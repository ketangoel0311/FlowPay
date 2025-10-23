# FLOWPAY

A simple full-stack expense tracking application built using Next.js, Node.js, Express, and MongoDB. It allows users to record transactions, manage expenses, and view their financial activity.

🚀 Features
- User authentication using JWT
- Record and manage income and expense transactions
- Basic support for adjusting amounts between records
- Transaction tracking using credit (income) and debit (expense) entries
- Summary view showing total income and expenses
- Transaction history with filtering and pagination
- Responsive UI using Next.js

🛠 Tech Stack
- Frontend: Next.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT

📌 How it Works
- Each user records their transactions (income and expenses)
- Transactions are stored as credit (income) and debit (expense)
- Totals are calculated based on these entries
- Users can view, filter, and paginate their transaction history
- A summary section provides an overview of total income and expenses

📂 Main Backend Features
- Authentication middleware to protect routes
- APIs for creating and fetching transactions
- Basic validation to ensure correct data entry
- Pagination for efficient handling of large datasets

▶️ Run Locally

# backend
cd backend
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev