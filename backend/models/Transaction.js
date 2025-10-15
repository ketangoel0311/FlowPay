const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  category: {
    type: String,
    default: "Transfer",
  },
  description: {
    type: String,
    default: "",
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["completed", "pending"],
    default: "completed",
  },
  transferId: {
    type: String,
    index: true,
  },
  idempotencyKey: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

transactionSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
