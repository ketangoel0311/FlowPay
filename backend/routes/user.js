const express = require("express");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, avatar },
      { new: true }
    );
    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/dashboard", auth, async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const transactions = await Transaction.find({
      user: req.userId,
      createdAt: { $gte: sevenDaysAgo },
    });
    const dayLabels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
    const statistics = dayLabels.map((day, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayTxns = transactions.filter((t) => {
        const tDate = new Date(t.createdAt);
        return tDate >= d && tDate < next;
      });
      const expense = dayTxns
        .filter((t) => t.type === "expense" || t.type === "transfer")
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const income = dayTxns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      return {
        day,
        expense: Math.round(expense * 100) / 100,
        income: Math.round(income * 100) / 100,
      };
    });
    const byCategory = {};
    transactions.forEach((t) => {
      if (t.type !== "expense" && t.type !== "transfer") return;
      const cat = t.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
    });
    const totalSpent = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const spendingOverview =
      totalSpent > 0
        ? Object.entries(byCategory)
            .map(([category, amount]) => ({
              category,
              percentage: Math.round((amount / totalSpent) * 100),
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 6)
        : [];
    res.json({ statistics, spendingOverview, goals: null });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
