import express from "express";
import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
   1 ADMIN ONLY – CREATE PLAN (ONE TIME)
   ====================================================== */
router.post("/admin/create-plan", authMiddleware, async (req, res) => {
  try {
    // optional: role check
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
        amount: 1999 * 100, // ₹1999
        currency: "INR",
        description: "Monthly Pro Plan",
      },
    });
    // PLAN ID ko env / db me save karo
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================================================
   2 USER – CREATE SUBSCRIPTION
   ====================================================== */
router.post("/create-subscription", authMiddleware, async (req, res) => {
  try {
    // user already active subscription?
    const existing = await Payment.findOne({
      userId: req.user._id,
      type: "subscription",
      status: { $in: ["active", "created"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Subscription already exists",
      });
    }
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PRO_PLAN_ID, // SAME for all users
      customer_notify: 1,
      total_count: 12,
    });
    await Payment.create({
      userId: req.user._id,
      subscriptionId: subscription.id,
      planId: process.env.RAZORPAY_PRO_PLAN_ID,
      type: "subscription",          //  IMPORTANT
      status: "created",             // active webhook se hoga
      amount: 1999,
      currency: "INR",
    });
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================================================
        3️ RAZORPAY WEBHOOK (MANDATORY)
   ====================================================== */
router.post("/webhook",  express.raw({ type: "application/json" }), async (req, res) => {
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
      // subscription activated
      if (event.event === "subscription.activated") {
        await Payment.findOneAndUpdate(
          { subscriptionId: event.payload.subscription.entity.id },
          { status: "active" }
        );
      }
      // subscription cancelled
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

export default router;
