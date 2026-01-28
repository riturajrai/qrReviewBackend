import mongoose from "mongoose";

const qrCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },        // unique QR code string   123334
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // link user
    feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: "Feedback" }, // link feedback
    createdAt: { type: Date, default: Date.now },
  }
);


export default mongoose.model("QrCode", qrCodeSchema);



