import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ----- ORDER (one-time) -----
    orderId: String,
    paymentId: String,
    signature: String,

    // ----- SUBSCRIPTION -----
    subscriptionId: String,
    planId: String,

    amount: Number,
    currency: String,

    type: {
      type: String,
      enum: ["order", "subscription"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "paid",
        "active",
        "cancelled",
        "failed",
      ],
      default: "created",
    },

    currentStart: Date,
    currentEnd: Date,
    nextChargeAt: Date,
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
