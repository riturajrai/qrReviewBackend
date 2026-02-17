import express from "express";
import cors from "cors";
import signupAuth from "./auth/authContoller.js";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import upload from "./upload/upload.js";
import customURLRoutes from "./customURL/customURL.js";
import feedbackRoutes from "./feedbackRoutes/feedbackRoutes.js";
import payment from "./payments/subscription.routes.js";
import uploadLogo from "./customURL/logoUpload.js";
import crypto from "crypto";
import Payment from "./models/Payment.js";

const app = express();

/* ======================================================
   RAZORPAY WEBHOOK (RAW BODY – MANDATORY)
   ====================================================== */
app.post("/api/subscription-webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
      const razorpaySignature = req.headers["x-razorpay-signature"];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const body = req.body.toString();
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (razorpaySignature !== expectedSignature) {
        console.log("Signature mismatch");
        return res.status(400).json({ success: false });
      }
      const event = JSON.parse(body);
      console.log("WEBHOOK EVENT:", event.event);
      const { payload } = event;
      switch (event.event) {
        //  MOST IMPORTANT (PAYMENT SUCCESS)
        case "payment.captured":
          await handlePaymentCaptured(payload.payment.entity);
          break;
        case "payment.authorized":
          console.log("Payment authorized:", payload.payment.entity.id);
          break;
        case "subscription.activated":
          await handleSubscriptionActivated(payload.subscription.entity);
          break;
        case "subscription.charged":
          await handleSubscriptionCharged(payload.payment.entity);
          break;
        // DO NOT CANCEL HERE
        case "subscription.completed":
          console.log("Subscription cycle completed (NOT cancelling)");
          await handleSubscriptionCompleted(payload.subscription.entity);
          break;
        case "subscription.cancelled":
          await handleSubscriptionCancelled(payload.subscription.entity);
          break;
        default:
          console.log("Unhandled event:", event.event);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ success: false });
    }
  }
);

/* ================= HANDLERS ================= */

async function handlePaymentCaptured(payment) {
  console.log("Payment Captured:", payment.id);
  console.log("Subscription ID:", payment.subscription_id);

  if (!payment.subscription_id) {
    console.log("No subscription_id found in payment");
    return;
  }

  await Payment.updateOne(
    { subscriptionId: payment.subscription_id },
    {
      status: "active",
      paymentId: payment.id,
    }
  );
}


async function handleSubscriptionActivated(subscription) {
  console.log("Subscription Activated:", subscription.id);

  const currentStart = new Date(subscription.current_start * 1000);
  const currentEnd = new Date(subscription.current_end * 1000);

  await Payment.updateOne(
    { subscriptionId: subscription.id },
    {
      status: "active",
      currentStart,
      currentEnd,
      nextChargeAt: subscription.charge_at
        ? new Date(subscription.charge_at * 1000)
        : null,
    }
  );
}

async function handleSubscriptionCharged(payment) {
  console.log("Subscription Charged:", payment.id);

  await Payment.updateOne(
    { subscriptionId: payment.subscription_id },
    {
      paymentId: payment.id,
      status: "active",
    }
  );
}

//  FIXED: DO NOT AUTO CANCEL
async function handleSubscriptionCompleted(subscription) {
  console.log("Subscription Completed Cycle:", subscription.id);

  // Keep active till expiry (currentEnd logic already in your API)
  await Payment.updateOne(
    { subscriptionId: subscription.id },
    {
      status: "active",
    }
  );
};

async function handleSubscriptionCancelled(subscription) {
  console.log("Subscription Cancelled:", subscription.id);
  await Payment.updateOne(
    { subscriptionId: subscription.id },
    {
      status: "cancelled",
    }
  );
}

// Middlewares
app.use(express.json());
app.use(cookieParser());
// DB connection
connectDB();
// CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://admin.infravion.com",
      "https://infravion.com",
      "https://qr-review-system-fronmtend-7kye.vercel.app",
      "https://qr.vocalheart.com"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
// Routes
app.use("/api", signupAuth);
app.use("/api", upload);
app.use("/api", feedbackRoutes);
app.use("/api/custom-url", customURLRoutes);
app.use("/api", payment);
app.use("/api/form", uploadLogo);
// Health check
app.get("/", async (req, res) => {
  res.status(200).send("Server is running");
})
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});