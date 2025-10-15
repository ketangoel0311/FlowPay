const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  accountType: {
    type: String,
    enum: ["savings", "checking"],
    default: "savings",
  },
  accountNumber: {
    type: String,
    required: true,
  },
  plaidAccountId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Account", accountSchema);
