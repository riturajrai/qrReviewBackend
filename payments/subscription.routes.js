import express from "express";
import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
   1️ ADMIN – CREATE PLAN (ONE TIME ONLY)
   ====================================================== */
router.post("/admin/create-plan", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const plan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: "Pro Subscription",
        amount: 1999 * 100,
        currency: "INR",
        description: "Monthly Pro Plan",
      },
    });

    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================================================
   2️ USER – CREATE SUBSCRIPTION (WITH 5-MIN RULE)
   ====================================================== */
router.post("/create-subscription", authMiddleware, async (req, res) => {
  try {
    const existing = await Payment.findOne({
      userId: req.user._id,
      type: "subscription",
      status: "created",
    });
    if (existing) {
      const timeDiff =
        Date.now() - new Date(existing.createdAt).getTime();
      // 5 min ke andar hai → same payment page
      if (timeDiff < 5 * 60 * 1000) {
        return res.json({
          success: true,
          subscription: {
            short_url: existing.shortUrl, // SAME URL
            status: "pending",
          },
        });
      }

      // expired → cancel old
      await razorpay.subscriptions.cancel(existing.subscriptionId);

      await Payment.updateOne(
        { _id: existing._id },
        { status: "failed" }
      );
    }

    //  create new subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PRO_PLAN_ID,
      customer_notify: 1,
      total_count: 12,
    });

    await Payment.create({
      userId: req.user._id,
      subscriptionId: subscription.id,
      planId: process.env.RAZORPAY_PRO_PLAN_ID,
      type: "subscription",
      status: "created",
      amount: 1999,
      currency: "INR",
      shortUrl: subscription.short_url,
    });

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ======================================================
   3️ RAZORPAY WEBHOOK (MANDATORY)
   ====================================================== */
router.post(
  "/subscription-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false });
      }

      const event = JSON.parse(req.body.toString());

      //  payment successful
      if (event.event === "subscription.activated") {
        await Payment.findOneAndUpdate(
          { subscriptionId: event.payload.subscription.entity.id },
          { status: "active" }
        );
      }

      // ❌ subscription cancelled
      if (event.event === "subscription.cancelled") {
        await Payment.findOneAndUpdate(
          { subscriptionId: event.payload.subscription.entity.id },
          { status: "cancelled" }
        );
      }

      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  }
);

router.get("/subscription-status", authMiddleware, async (req, res) => {
  const sub = await Payment.findOne({
    userId: req.user._id,
    type: "subscription",
  }).sort({ createdAt: -1 });

  res.json({ status: sub?.status || "none" });
});

export default router;
