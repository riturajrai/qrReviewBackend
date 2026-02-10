import express from 'express';
import cors from 'cors';
import signupAuth from './auth/authContoller.js';
import connectDB from './config/db.js';
import cookieParser from "cookie-parser";
import upload from './upload/upload.js';
import customURLRoutes from "./customURL/customURL.js";
import feedbackRoutes from "./feedbackRoutes/feedbackRoutes.js";
import payment from './payments/subscription.routes.js';
import uploadLogo from './customURL/logoUpload.js';
import crypto from "crypto";

const app = express();



/* ======================================================
   RAZORPAY WEBHOOK (RAW BODY – MANDATORY)
   ====================================================== */
app.post(
  "/api/subscription-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      const body = req.body; //  BUFFER

      console.log("Body type:", Buffer.isBuffer(body)); // must be true

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
        console.log(" Signature mismatch");
        return res.status(400).json({ success: false });
      }

      const event = JSON.parse(body.toString());
      const subscriptionId =
        event.payload?.subscription?.entity?.id;

      console.log("✅ EVENT:", event.event);

      if (
        event.event === "subscription.activated" ||
        event.event === "subscription.charged"
      ) {
        await Payment.findOneAndUpdate(
          { subscriptionId, type: "subscription" },
          { status: "active" }
        );
      }

      if (event.event === "subscription.cancelled") {
        await Payment.findOneAndUpdate(
          { subscriptionId },
          { status: "cancelled" }
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Middlewaress
app.use(express.json());
app.use(cookieParser());

// DB connection
connectDB();

// CORS (local + production)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://admin.infravion.com',   // frontend (example)
    'https://infravion.com',
    "https://qr-review-system-fronmtend-7kye.vercel.app"
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// Routes
app.use('/api', signupAuth);
app.use('/api', upload);
app.use('/api', feedbackRoutes);
app.use('/api/custom-url', customURLRoutes);
app.use('/api' , payment)
app.use('/api/form' , uploadLogo);


// Health check
app.get('/', async (req, res) => {
  res.status(200).send("Server is running ");
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});







