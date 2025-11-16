// routes/customURL.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import CustomURL from "../models/CustomURL.js";
import QrImage from "../models/QrImage.js";

const router = express.Router();

//CREATE / SET OR UPDATE custom URL
router.post("/set-url", authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: "URL is required" });
  try {
    let existing = await CustomURL.findOne({ user: req.user._id });

    if (existing) {
      existing.url = url;
      await existing.save();
    } else {
      existing = await CustomURL.create({ user: req.user._id, url });
    }

    res.json({ success: true, message: "Custom URL saved", url: existing.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//  READ / Get URL by qrId
router.get("/get-url/:qrId", async (req, res) => {
  const { qrId } = req.params;

  try {
    const qr = await QrImage.findOne({ randomId: qrId });
    if (!qr) return res.status(404).json({ success: false, message: "QR not found" });

    const customURL = await CustomURL.findOne({ user: qr.user });
    if (!customURL) return res.status(404).json({ success: false, message: "No custom URL set for this QR" });

    res.json({ success: true, url: customURL.url });
  } catch (err) {
    console.error("Error fetching custom URL:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE / Update URL for logged-in user
router.put("/update-url", authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: "URL is required" });

  try {
    const customURL = await CustomURL.findOne({ user: req.user._id });
    if (!customURL) return res.status(404).json({ success: false, message: "No custom URL found" });

    customURL.url = url;
    await customURL.save();

    res.json({ success: true, message: "Custom URL updated", url: customURL.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE / Delete URL for logged-in user
router.delete("/delete-url", authMiddleware, async (req, res) => {
  try {
    const customURL = await CustomURL.findOne({ user: req.user._id });
    if (!customURL) return res.status(404).json({ success: false, message: "No custom URL found" });

    await CustomURL.deleteOne({ _id: customURL._id });
    res.json({ success: true, message: "Custom URL deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// GET custom URL of logged-in user
router.get("/get-url", authMiddleware, async (req, res) => {
  try {
    const customURL = await CustomURL.findOne({ user: req.user._id });
    if (!customURL) {
      return res.status(404).json({ success: false, message: "No custom URL set yet" });
    }
    res.json({ success: true, url: customURL.url });
  } catch (err) {
    console.error("Error fetching custom URL:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
export default router;
