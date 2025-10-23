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

    const last7Days = new Date();
    last7Days.setDate(now.getDate() - 7);

    const txns = await Transaction.find({
      user: req.userId,
      createdAt: { $gte: last7Days },
    });

    let statistics = [];

    for (let i = 0; i < 7; i++) {

      let start = new Date();
      start.setDate(now.getDate() - (6 - i));
      start.setHours(0, 0, 0, 0);

      let end = new Date(start);
      end.setDate(start.getDate() + 1);

      let income = 0;
      let expense = 0;

      for (let t of txns) {
        let d = new Date(t.createdAt);

        if (d >= start && d < end) {

          if (t.type === "income") {
            income += t.amount;
          } else {
            expense += Math.abs(t.amount);
          }

        }
      }

      statistics.push({
        day: "Day " + (i + 1),
        income,
        expense
      });
    }

    res.json({ statistics });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
