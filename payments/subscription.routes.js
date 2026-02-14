import express from "express";
import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
/* ======================================================
    ADMIN – CREATE 3-DAY TRIAL PLAN (ONE TIME)
   ====================================================== */
router.post("/admin/create-plan", authMiddleware, async (req, res) => {
  try {
    // enable in production
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ success: false, message: "Admin only" });
    // }
    const plan = await razorpay.plans.create({
      period: "daily",
      interval: 7, // 3 days
      item: {
        name: "7-Day Trial Subscription",
        amount: 200, // ₹2 in paise
        currency: "INR",
        description: "7-Day Trial Plan - ₹2",
      },
    });
    res.json({ success: true, plan });
  } catch (error) {
  console.log("PLAN ERROR FULL:", error);
  res.status(500).json({
    success: false,
    message: error.message,
    stack: error.stack
  });
}

});


/* ======================================================
   ADMIN – GET ALL PLANS
====================================================== */
router.get("/admin/get-plans", authMiddleware, async (req, res) => {
  try {
    const plans = await razorpay.plans.all({ count: 50 });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


/* ======================================================
    USER – CREATE SUBSCRIPTION (5-MIN RULE)
   ====================================================== */
router.post("/create-subscription", authMiddleware, async (req, res) => {
  try {
    // Check for active subscription
    const activeSubscription = await Payment.findOne({
      userId: req.user._id,
      type: "subscription",
      status: "active",
    });
    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: "You already have an active subscription",
        subscription: {
          status: "active",
          currentEnd: activeSubscription.currentEnd,
          daysRemaining: Math.ceil(
            (new Date(activeSubscription.currentEnd) - new Date()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      });
    }
    // Check for pending subscription
    const existing = await Payment.findOne({
      userId: req.user._id,
      type: "subscription",
      status: "created",
    });

    if (existing) {
      const timeDiff = Date.now() - existing.createdAt.getTime();

      // Reuse same payment link (5 min)
      if (timeDiff < 5 * 60 * 1000) {
        return res.json({
          success: true,
          subscription: {
            short_url: existing.shortUrl,
            status: "pending",
          },
        });
      }

      // Expire old subscription
      if (existing.subscriptionId) {
        try {
          await razorpay.subscriptions.cancel(existing.subscriptionId);
        } catch (err) {
          console.log("Could not cancel old subscription:", err.message);
        }
      }

      await Payment.updateOne({ _id: existing._id }, { status: "failed" });
    }

    // Create new subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PRO_PLAN_ID,
      customer_notify: 1,
      total_count: 1, // 1 billing cycle only (3 days)
    });

    await Payment.create({
      userId: req.user._id,
      subscriptionId: subscription.id,
      planId: process.env.RAZORPAY_PRO_PLAN_ID,
      shortUrl: subscription.short_url,
      type: "subscription",
      status: "created",
      amount: 200, // ₹2 in paise
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
  try {
    const sub = await Payment.findOne({
      userId: req.user._id,
      type: "subscription",
    }).sort({ createdAt: -1 });

    if (!sub) {
      return res.json({
        success: true,
        status: "none",
        planId: null,
        message: "No subscription found",
      });
    }
    let daysRemaining = 0;
    let hoursRemaining = 0;

    if (sub.status === "active" && sub.currentEnd) {
      const now = new Date();
      const endDate = new Date(sub.currentEnd);
      const diffMs = endDate - now;

      if (diffMs > 0) {
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
      } else {
        // Subscription expired
        await Payment.updateOne({ _id: sub._id }, { status: "cancelled" });
        return res.json({
          success: true,
          status: "expired",
          planId: sub.planId,
          message: "Your subscription has expired",
        });
      }
    }

    res.json({
      success: true,
      status: sub.status,
      planId: sub.planId,
      currentStart: sub.currentStart,
      currentEnd: sub.currentEnd,
      daysRemaining,
      hoursRemaining,
      subscriptionId: sub.subscriptionId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ======================================================
    USER – GET ALL SUBSCRIPTION HISTORY
   ====================================================== */
router.get("/subscription-history", authMiddleware, async (req, res) => {
  try {
    const subscriptions = await Payment.find({
      userId: req.user._id,
      type: "subscription",
    })
      .sort({ createdAt: -1 }) // Latest first
      .lean();

    if (!subscriptions || subscriptions.length === 0) {
      return res.json({
        success: true,
        count: 0,
        history: [],
        message: "No subscription history found",
      });
    }

    const historyWithRemaining = subscriptions.map((sub) => {
      let daysRemaining = 0;
      let hoursRemaining = 0;

      if (sub.status === "active" && sub.currentEnd) {
        const now = new Date();
        const endDate = new Date(sub.currentEnd);
        const diffMs = endDate - now;

        if (diffMs > 0) {
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
        }
      }

      return {
        _id: sub._id,
        subscriptionId: sub.subscriptionId,
        planId: sub.planId,
        amount: sub.amount,
        currency: sub.currency,
        status: sub.status,
        shortUrl: sub.shortUrl,
        currentStart: sub.currentStart,
        currentEnd: sub.currentEnd,
        daysRemaining,
        hoursRemaining,
        createdAt: sub.createdAt,
      };
    });

    res.json({
      success: true,
      count: historyWithRemaining.length,
      history: historyWithRemaining,
    });
  } catch (error) {
    console.error("SUBSCRIPTION HISTORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;