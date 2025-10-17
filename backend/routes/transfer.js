const express = require("express");
const mongoose = require("mongoose");
const Account = require("../models/Account");
const LedgerEntry = require("../models/LedgerEntry");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { sourceAccountId, receiverShareableId, amount, note, idempotencyKey: rawKey } = req.body;

  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

  const amt = Number(amount);
  if (!sourceAccountId || !receiverShareableId)
    return res.status(400).json({ message: "Missing required fields" });
  if (!Number.isFinite(amt) || amt <= 0)
    return res.status(400).json({ message: "Invalid amount" });

  const idempotencyKey =
    typeof rawKey === "string" && rawKey.trim()
      ? rawKey.trim()
      : `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const transferId =
    "TRF-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  let expenseTx;

  try {
    expenseTx = await Transaction.create({
      user: req.userId,
      type: "expense",
      category: "Transfer",
      description: note || "Debit Transfer",
      amount: amt,
      status: "pending",
      transferId,
      idempotencyKey,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Transaction.findOne({ user: req.userId, idempotencyKey });
      return res.status(200).json({ message: "Transfer already processed", transaction: existing });
    }
    return res.status(400).json({ message: error.message });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const from = await Account.findOne({ _id: sourceAccountId, user: req.userId }).session(session);
      if (!from) throw new Error("Source account not found");

      const to = await Account.findOne({ plaidAccountId: receiverShareableId }).session(session);
      if (!to) throw new Error("Receiver account not found");

      if (String(from._id) === String(to._id))
        throw new Error("Cannot transfer to same account");

      const receiverUser = await User.findById(to.user).session(session);
      if (!receiverUser) throw new Error("Receiver user not found");

      const ledgerAgg = await LedgerEntry.aggregate([
        { $match: { accountId: from._id } },
        {
          $group: {
            _id: "$accountId",
            totalCredits: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
            totalDebits:  { $sum: { $cond: [{ $eq: ["$type", "debit"]  }, "$amount", 0] } },
          },
        },
      ]).session(session);

      const totals = ledgerAgg[0] || { totalCredits: 0, totalDebits: 0 };
      const computedBalance = (totals.totalCredits || 0) - (totals.totalDebits || 0);
      if (computedBalance < amt) throw new Error("Insufficient funds");

      await LedgerEntry.insertMany(
        [
          { accountId: from._id, type: "debit",  amount: amt, transferId, idempotencyKey },
          { accountId: to._id,   type: "credit", amount: amt, transferId, idempotencyKey },
        ],
        { session }
      );

      await Transaction.create(
        [
          {
            user: receiverUser._id,
            type: "income",
            category: "Transfer",
            description: note || "Credit Received",
            amount: amt,
            status: "completed",
            transferId,
          },
        ],
        { session }
      );

      await Transaction.updateOne({ _id: expenseTx._id }, { status: "completed" }, { session });
    });

    return res.status(200).json({ message: "Transfer successful", transferId });
  } catch (error) {
    await Transaction.deleteOne({ _id: expenseTx._id, status: "pending" });
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
