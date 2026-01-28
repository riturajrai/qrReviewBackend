import mongoose from "mongoose";
// models/Feedback.js
const feedbackSchema = new mongoose.Schema({
  qrId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, default: null },
  phone: { type: String, default: null }, // Allow null
  message: { type: String, default: null },
  rating: { type: Number, min: 1, max: 5, default: null },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("Feedback", feedbackSchema);
