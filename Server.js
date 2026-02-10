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
  express.raw({ type: "*/*" }),   // 👈 IMPORTANT
  async (req, res) => {
    try {
      const razorpaySignature = req.headers["x-razorpay-signature"];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      //  THIS IS THE KEY FIX
      const body = req.body.toString(); // STRING, not Buffer

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (razorpaySignature !== expectedSignature) {
        console.log("❌ Signature mismatch");
        console.log("Received :", razorpaySignature);
        console.log("Expected :", expectedSignature);
        return res.status(400).json({ success: false });
      }

      const event = JSON.parse(body);

      console.log("✅ WEBHOOK VERIFIED:", event.event);

      return res.json({ success: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ success: false });
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







