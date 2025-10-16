const express = require("express");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/recent/list", auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { type, search, limit = 10, page = 1 } = req.query;
    const query = { user: req.userId };
    if (type && type !== "all") query.type = type;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { category:    { $regex: search, $options: "i" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Transaction.countDocuments(query);
    const all = await Transaction.find({ user: req.userId });
    const totalIncome  = all.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = all.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    res.json({
      transactions,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      summary: { totalIncome, totalExpense, netAmount: totalIncome - totalExpense },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { type, category, description, amount } = req.body;
    const transaction = await Transaction.create({ user: req.userId, type, category, description, amount });
    res.status(201).json({ message: "Transaction created successfully", transaction });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
