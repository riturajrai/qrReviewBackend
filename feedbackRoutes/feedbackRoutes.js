import express from "express";
import Feedback from "../models/Feedback.js";
import QrImage from "../models/QrImage.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
// =========================================
// SAVE FEEDBACK  (PUBLIC ROUTE)
// =========================================
router.post("/save-feedback", async (req, res) => {
  try {
    const { qrId, name, phone = "", message, rating } = req.body;

    // Validate required fields
    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: "qrId is required",
      });
    }

    // Find QR and get owner
    const qrDoc = await QrImage.findOne({ randomId: qrId });
    if (!qrDoc) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR Code",
      });
    }

    // Clean phone: store null if empty
    const cleanPhone = phone.trim() === "" ? null : phone.trim();

    // Save feedback
    const fb = await Feedback.create({
      qrId,
      user: qrDoc.user,
      name: name?.trim() || null,
      phone: cleanPhone,
      message: message?.trim() || null,
      rating: rating ? Number(rating) : null,
    });

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: {
        _id: fb._id,
        name: fb.name,
        phone: fb.phone,
        message: fb.message,
        rating: fb.rating,
        createdAt: fb.createdAt,
      },
    });
  } catch (err) {
    console.error("Feedback Save Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
});

// =========================================
// GET ALL FEEDBACK OF LOGGED-IN USER
// =========================================
router.get("/my-feedbacks", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const feedbacks = await Feedback.find({ user: userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      feedbacks,
    });
  } catch (err) {
    console.log("GET FEEDBACK ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =========================================
// GET FEEDBACK BY QR ID (OPTIONAL ADMIN API)
// =========================================
router.get("/get-feedback/:qrId", async (req, res) => {
  try {
    const { qrId } = req.params;

    const data = await Feedback.find({ qrId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      feedbacks: data,
    });
  } catch (err) {
    console.log("QR FEEDBACK ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =========================================
// DASHBOARD STATS FOR LOGGED-IN USER
// =========================================
router.get("/dashboard-stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Total submissions
    const totalSubmissions = await Feedback.countDocuments({ user: userId });

    // Today's submissions
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySubmissions = await Feedback.countDocuments({
      user: userId,
      createdAt: { $gte: startOfToday },
    });

    // Optional: Submissions by rating
    const ratingsAggregation = await Feedback.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalSubmissions,
        todaySubmissions,
        ratings: ratingsAggregation, // [{ _id: 5, count: 10 }, { _id: 4, count: 3 }, ...]
      },
    });
  } catch (err) {
    console.log("DASHBOARD STATS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
