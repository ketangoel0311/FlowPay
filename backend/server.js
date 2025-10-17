const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes        = require("./routes/auth");
const userRoutes        = require("./routes/user");
const transactionRoutes = require("./routes/transactions");
const accountRoutes     = require("./routes/accounts");
const transferRoutes    = require("./routes/transfer");
const plaidRoutes       = require("./routes/plaid");

const app = express();

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/FlowPay")
  .catch(console.error);

app.use("/api/auth",         authRoutes);
app.use("/api/user",         userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/accounts",     accountRoutes);
app.use("/api/transfer",     transferRoutes);
app.use("/api/plaid",        plaidRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => process.stdout.write(`Server running on port ${PORT}\n`));
