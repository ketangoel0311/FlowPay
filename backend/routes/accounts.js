const express = require("express");
const Account = require("../models/Account");
const LedgerEntry = require("../models/LedgerEntry");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.userId });
    const updates = [];
    for (const acc of accounts) {
      if (!acc.plaidAccountId) {
        let id;
        let exists = true;
        let attempts = 0;
        while (exists && attempts < 5) {
          id = `SHR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          exists = !!(await Account.findOne({ plaidAccountId: id }));
          attempts++;
        }
        acc.plaidAccountId = id;
        updates.push(acc.save());
      }
    }
    if (updates.length) await Promise.all(updates);

    const accountIds = accounts.map((a) => a._id);
    const agg = await LedgerEntry.aggregate([
      { $match: { accountId: { $in: accountIds } } },
      {
        $group: {
          _id: "$accountId",
          totalCredits: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
          totalDebits:  { $sum: { $cond: [{ $eq: ["$type", "debit"]  }, "$amount", 0] } },
        },
      },
    ]);
    const balanceMap = new Map();
    for (const row of agg) {
      balanceMap.set(String(row._id), (row.totalCredits || 0) - (row.totalDebits || 0));
    }
    const accountsOut = accounts.map((a) => {
      const obj = a.toObject();
      obj.balance = balanceMap.get(String(a._id)) || 0;
      return obj;
    });
    const totalBalance = accountsOut.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    res.json({ accounts: accountsOut, totalBalance });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { bankName, accountType, accountNumber, balance } = req.body;
    const initialAmount = Number(balance) || 0;
    const account = await Account.create({ user: req.userId, bankName, accountType, accountNumber });
    const fundingId = "FUND-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    const idem = "INIT-" + account._id.toString();
    await LedgerEntry.create({
      accountId: account._id,
      type: "credit",
      amount: initialAmount,
      transferId: fundingId,
      idempotencyKey: idem,
      createdAt: new Date(),
    });
    res.status(201).json({ message: "Account added successfully", account });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
