
import express from "express";
import Feedback from "../models/feedbackschema.js";

const router = express.Router();

// =========================
// POST - Submit Feedback
// =========================
router.post("/feedback", async (req, res) => {
  try {
    const { name, email, rating, comments } = req.body;

    // Validation
    if (!name || !email || !rating || !comments) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Save feedback
    const feedback = new Feedback({ name, email, rating, comments });
    await feedback.save();

    // Backend decides redirect
    if (rating >= 4) {
      return res.status(201).json({
        success: true,
        message: "Feedback submitted! Redirect to Google review.",
        googleReviewLink: " " // replace with your business
      });
    } else {
      return res.status(201).json({
        success: true,
        message: "Feedback submitted. Thank you!"
      });
    }

  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// =========================
// GET - All Feedbacks
// =========================
router.get("/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching feedbacks",
      error: error.message,
    });
  }
});

// =========================
// GET - Single Feedback by ID
// =========================
router.get("/feedback/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback)
      return res.status(404).json({ success: false, message: "Feedback not found" });

    res.status(200).json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
});

// =========================
// PUT - Update Feedback by ID
// =========================
router.put("/feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFeedback = await Feedback.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedFeedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }
    res.json({
      success: true,
      message: "Feedback updated successfully!",
      feedback: updatedFeedback,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================
// DELETE - Delete Feedback by ID
// =========================
router.delete("/feedback/:id", async (req, res) => {
  try {
    const deletedFeedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!deletedFeedback)
      return res.status(404).json({ success: false, message: "Feedback not found" });

    res.status(200).json({ success: true, message: "Feedback deleted successfully!" });
  } catch (err) {
    console.error("Delete Feedback Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;

// import express from "express";
// import Feedback from "../models/feedbackschema.js";
// import { sendEmailNotification, sendSMSNotification } from "../utils/sendNotification.js";

// const router = express.Router();

// // =========================
// // POST - Submit Feedback
// // =========================
// router.post("/feedback", async (req, res) => {
//   try {
//     const { name, email, rating, comments, branchName } = req.body;

//     if (!name || !email || !rating || !comments) {
//       return res.status(400).json({ success: false, message: "All fields are required" });
//     }

//     if (rating < 1 || rating > 5) {
//       return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
//     }

//     const feedback = new Feedback({ name, email, rating, comments, branchName });
//     await feedback.save();

//     // ✅ Notifications
//     await sendEmailNotification(feedback);
//     await sendSMSNotification(feedback);

//     res.status(201).json({
//       success: true,
//       message: "Feedback submitted successfully!",
//       feedback,
//     });
//   } catch (err) {
//     console.error("Feedback error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });

// // =========================
// // GET - All Feedbacks
// // =========================
// router.get("/feedback", async (req, res) => {
//   try {
//     const feedbacks = await Feedback.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, feedbacks });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error fetching feedbacks", error: error.message });
//   }
// });

// // =========================
// // GET - Single Feedback by ID
// // =========================
// router.get("/feedback/:id", async (req, res) => {
//   try {
//     const feedback = await Feedback.findById(req.params.id);
//     if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found" });
//     res.status(200).json({ success: true, feedback });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error fetching feedback", error: error.message });
//   }
// });

// // =========================
// // PUT - Update Feedback by ID
// // =========================
// router.put("/feedback/:id", async (req, res) => {
//   try {
//     const updatedFeedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!updatedFeedback) return res.status(404).json({ success: false, message: "Feedback not found" });
//     res.json({ success: true, message: "Feedback updated successfully!", feedback: updatedFeedback });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // =========================
// // DELETE - Delete Feedback by ID
// // =========================
// router.delete("/feedback/:id", async (req, res) => {
//   try {
//     const deletedFeedback = await Feedback.findByIdAndDelete(req.params.id);
//     if (!deletedFeedback) return res.status(404).json({ success: false, message: "Feedback not found" });
//     res.status(200).json({ success: true, message: "Feedback deleted successfully!" });
//   } catch (err) {
//     console.error("Delete Feedback Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });

// export default router;



