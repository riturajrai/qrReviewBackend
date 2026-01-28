import mongoose from "mongoose";

const qrImageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
  },
  randomId: {
    type: String,
    required: true,
    unique: true,
  },
  data: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("QrImage", qrImageSchema);
