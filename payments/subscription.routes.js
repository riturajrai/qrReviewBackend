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
   RAZORPAY WEBHOOK (RAW BODY – MANDATORY)
   ====================================================== */
router.post(
  "/subscription-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      const body = req.body; // BUFFER

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (
        !signature ||
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )
      ) {
        console.log("Webhook signature mismatch");
        return res.status(400).json({ success: false });
      }

      const event = JSON.parse(body.toString());
      const subscriptionId = event.payload?.subscription?.entity?.id;

      console.log("Webhook event:", event.event);

      //  Subscription activated
      if (event.event === "subscription.activated") {
        await Payment.findOneAndUpdate(
          { subscriptionId },
          {
            status: "active",
            currentStart: new Date(
              event.payload.subscription.entity.current_start * 1000
            ),
            currentEnd: new Date(
              event.payload.subscription.entity.current_end * 1000
            ),
            nextChargeAt: new Date(
              event.payload.subscription.entity.charge_at * 1000
            ),
          }
        );
      }

      //  Cancelled
      if (event.event === "subscription.cancelled") {
        await Payment.findOneAndUpdate(
          { subscriptionId },
          { status: "cancelled" }
        );
      }

      //  Payment failed
      if (event.event === "payment.failed") {
        await Payment.findOneAndUpdate(
          { subscriptionId },
          { status: "failed" }
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ success: false });
    }
  }
);

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
