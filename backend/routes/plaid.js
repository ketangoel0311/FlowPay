const express = require("express");
const { PlaidApi, PlaidEnvironments, Configuration } = require("plaid");
const mongoose = require("mongoose");
const Account = require("../models/Account");
const LedgerEntry = require("../models/LedgerEntry");
const auth = require("../middleware/auth");

const router = express.Router();

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

router.post("/create-link-token", auth, async (req, res) => {
  try {
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      return res.status(503).json({
        message: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to backend .env",
      });
    }
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.userId.toString() },
      client_name: "FlowPay",
      language: "en",
      country_codes: ["US"],
      products: ["auth", "transactions"],
    });
    res.json({ linkToken: response.data.link_token });
  } catch (error) {
    res.status(500).json({
      message: error.response?.data?.error_message || "Failed to create link token",
    });
  }
});

router.post("/exchange-token", auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const { publicToken } = req.body;
    if (!publicToken) return res.status(400).json({ message: "publicToken is required" });

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts || [];
    const created = [];

    for (const acc of accounts) {
      const existing = await Account.findOne({
        user: req.userId,
        plaidAccountId: acc.account_id,
      }).session(session);
      if (existing) continue;

      const type =
        acc.type === "depository" && acc.subtype === "checking"
          ? "checking"
          : acc.type === "depository" && acc.subtype === "savings"
          ? "savings"
          : "checking";

      const account = await Account.create({
        user: req.userId,
        bankName: acc.name || "Plaid Account",
        accountType: type,
        accountNumber: acc.mask ? `****${acc.mask}` : `****${acc.account_id?.slice(-4) || "0000"}`,
        plaidAccountId: acc.account_id,
        plaidItemId: itemId,
      });

      const importedBalance = Number(acc.balances?.current ?? 0) || 0;
      const fundingId = "FUND-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
      const idem = `IMPORT-${account._id.toString()}`;

      await LedgerEntry.create(
        [
          {
            accountId: account._id,
            type: "credit",
            amount: importedBalance,
            transferId: fundingId,
            idempotencyKey: idem,
            createdAt: new Date(),
          },
        ],
        { session }
      );
      created.push(account);
    }

    await session.commitTransaction();
    res.status(201).json({
      message: "Bank account(s) linked successfully",
      itemId,
      accountsLinked: created.length,
      accounts: created,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      message: error.response?.data?.error_message || "Failed to link bank account",
    });
  }
  session.endSession();
});

module.exports = router;
