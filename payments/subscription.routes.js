import express from "express";
import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
    ADMIN – CREATE PLAN (ONE TIME)
   ====================================================== */
router.post("/admin/create-plan", authMiddleware, async (req, res) => {
  try {
    // enable in production
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ success: false, message: "Admin only" });
    // }

    const plan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: "Pro Subscription",
        amount: 200, // paise
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
    USER – CREATE SUBSCRIPTION (5-MIN RULE)
   ====================================================== */
router.post("/create-subscription", authMiddleware, async (req, res) => {
  try {
    const existing = await Payment.findOne({
      userId: req.user._id,
      type: "subscription",
      status: "created",
    });

    if (existing) {
      const timeDiff = Date.now() - existing.createdAt.getTime();

      //  reuse same payment link (5 min)
      if (timeDiff < 5 * 60 * 1000) {
        return res.json({
          success: true,
          subscription: {
            short_url: existing.shortUrl,
            status: "pending",
          },
        });
      }

      // expire old subscription
      if (existing.subscriptionId) {
        await razorpay.subscriptions.cancel(existing.subscriptionId);
      }

      await Payment.updateOne(
        { _id: existing._id },
        { status: "failed" }
      );
    }

    // create new subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PRO_PLAN_ID,
      customer_notify: 1,
      total_count: 12,
    });

    await Payment.create({
      userId: req.user._id,
      subscriptionId: subscription.id,
      planId: process.env.RAZORPAY_PRO_PLAN_ID,
      shortUrl: subscription.short_url,
      type: "subscription",
      status: "created",
      amount: 200,
      currency: "INR",
    });

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================================================
    USER – CHECK SUBSCRIPTION STATUS
   ====================================================== */
router.get("/subscription-status", authMiddleware, async (req, res) => {
  const sub = await Payment.findOne({
    userId: req.user._id,
    type: "subscription",
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    status: sub?.status || "none",
    planId: sub?.planId || null,
  });
});

export default router;
