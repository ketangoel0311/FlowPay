const mongoose = require("mongoose");

const ledgerEntrySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transferId: {
      type: String,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

ledgerEntrySchema.index({ accountId: 1, createdAt: -1 });

module.exports = mongoose.model("LedgerEntry", ledgerEntrySchema);
