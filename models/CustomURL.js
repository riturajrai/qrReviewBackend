// models/CustomURL.js
import mongoose from "mongoose";

const customURLSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  url: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CustomURL = mongoose.model("CustomURL", customURLSchema);
export default CustomURL;
