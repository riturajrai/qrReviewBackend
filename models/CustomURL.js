<<<<<<< HEAD
// models/CustomURL.js
import mongoose from "mongoose";

const customURLSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  companyName: {
    type: String,
    required: true,
    trim: true,
  },

  url: {
    type: String,
    required: true,
  },
  redirectFromRating: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CustomURL = mongoose.model("CustomURL", customURLSchema);
export default CustomURL;
=======
// models/CustomURL.js
import mongoose from "mongoose";

const customURLSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  companyName: {
    type: String,
    required: true,
    trim: true,
  },

  url: {
    type: String,
    required: true,
  },
  redirectFromRating: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CustomURL = mongoose.model("CustomURL", customURLSchema);
export default CustomURL;
>>>>>>> 7e25b21c0e27f87d3e4fa7546fd88f7d6f0ef528
