// import express from "express";
// import mongoose from "mongoose"
// import Feedbacks from "../models/feedbackAnalySchema.js"
// import Branch from "../models/branchSchema.js";
// import { Parser } from "json2csv";

// const router = express.Router();


// // =========================
// // GET - Feedback Analytics (Global)
// // =========================
// router.get("/feedback/analytics/global", async (req, res) => {
//   try {
//     const totalFeedbacks = await Feedback.countDocuments();

//     const result = await Feedback.aggregate([
//       { $group: { _id: null, averageRating: { $avg: "$rating" } } },
//     ]);

//     const averageRating = result.length ? result[0].averageRating.toFixed(2) : 0;

//     res.status(200).json({
//       success: true,
//       totalFeedbacks,
//       averageRating,
//     });
//   } catch (err) {
//     console.error("Feedback Analytics Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });


// // =========================
// // GET - Branch-wise Feedback Analytics
// // =========================
// router.get("/feedback/analytics/:branchId", async (req, res) => {
//   try {
//     const { branchId } = req.params;

//     const totalFeedbacks = await Feedback.countDocuments({ qrId: branchId });

//     const result = await Feedback.aggregate([
//       { $match: { qrId: new mongoose.Types.ObjectId(branchId) } },
//       { $group: { _id: "$qrId", averageRating: { $avg: "$rating" } } },
//     ]);

//     const averageRating = result.length ? result[0].averageRating.toFixed(2) : 0;

//     res.status(200).json({
//       success: true,
//       branchId,
//       totalFeedbacks,
//       averageRating,
//     });
//   } catch (err) {
//     console.error("Branch Feedback Analytics Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });


// // =========================
// // 1️⃣ Rating Distribution (per branch)
// // =========================
// router.get("/feedback/insights/distribution/:branchId", async (req, res) => {
//   try {
//     const { branchId } = req.params;

//     const result = await Feedback.aggregate([
//       { $match: { qrId: new mongoose.Types.ObjectId(branchId) } },
//       { $group: { _id: "$rating", count: { $sum: 1 } } },
//       { $sort: { _id: 1 } },
//     ]);

//     const distribution = [1, 2, 3, 4, 5].map((rating) => {
//       const found = result.find((r) => r._id === rating);
//       return { rating, count: found ? found.count : 0 };
//     });

//     res.json({ success: true, branchId, distribution });
//   } catch (err) {
//     console.error("Rating Distribution Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });


// // =========================
// // 2️⃣ Most Active Branches
// // =========================
// router.get("/feedback/insights/active-branches", async (req, res) => {
//   try {
//     const result = await Feedback.aggregate([
//       { $group: { _id: "$qrId", totalFeedbacks: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
//       { $sort: { totalFeedbacks: -1 } },
//       { $limit: 5 },
//     ]);

//     const populated = await Promise.all(
//       result.map(async (item) => {
//         const branch = await Branch.findById(item._id).select("name");
//         return {
//           branchId: item._id,
//           branchName: branch ? branch.name : "Unknown",
//           totalFeedbacks: item.totalFeedbacks,
//           averageRating: item.avgRating.toFixed(2),
//         };
//       })
//     );

//     res.json({ success: true, mostActiveBranches: populated });
//   } catch (err) {
//     console.error("Active Branches Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });


// // =========================
// // 3️⃣ Monthly Rating Trends
// // =========================
// router.get("/feedback/insights/monthly-trends", async (req, res) => {
//   try {
//     const result = await Feedback.aggregate([
//       {
//         $group: {
//           _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
//           totalFeedbacks: { $sum: 1 },
//           avgRating: { $avg: "$rating" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     const trends = result.map((item) => ({
//       month: `${item._id.month}-${item._id.year}`,
//       totalFeedbacks: item.totalFeedbacks,
//       averageRating: item.avgRating.toFixed(2),
//     }));

//     res.json({ success: true, trends });
//   } catch (err) {
//     console.error("Monthly Trends Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });


// // =========================
// // 4️⃣ CSV Export (All Feedbacks)
// // =========================
// router.get("/feedback/insights/export/csv", async (req, res) => {
//   try {
//     const feedbacks = await Feedback.find().populate("branchId", "name").lean();

//     const fields = ["_id", "qrId.name", "rating", "comments", "createdAt"];
//     const parser = new Parser({ fields });
//     const csv = parser.parse(feedbacks);

//     res.header("Content-Type", "text/csv");
//     res.attachment("feedback_report.csv");
//     return res.send(csv);
//   } catch (err) {
//     console.error("CSV Export Error:", err);
//     res.status(500).json({ success: false, message: "Server error", error: err.message });
//   }
// });


// export default router;



import express from "express";
import mongoose from "mongoose";
import Feedbacks from "../models/feedbackAnalySchema.js"; // ✅ correct model name
import Branch from "../models/branchSchema.js";
import { Parser } from "json2csv";

const router = express.Router();

// =========================
// GET - Feedback Analytics (Global)
// =========================
router.get("/feedback/analytics/global", async (req, res) => {
  try {
    const totalFeedbacks = await Feedbacks.countDocuments();
    const result = await Feedbacks.aggregate([
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]);
    const averageRating = result.length ? result[0].averageRating.toFixed(2) : 0;

    res.status(200).json({
      success: true,
      totalFeedbacks,
      averageRating,
    });
  } catch (err) {
    console.error("Feedback Analytics Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// =========================
// GET - Branch-wise Feedback Analytics
// =========================
router.get("/feedback/analytics/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;
    const totalFeedbacks = await Feedbacks.countDocuments({ qrId: branchId });
    const result = await Feedbacks.aggregate([
      { $match: { qrId: new mongoose.Types.ObjectId(branchId) } },
      { $group: { _id: "$qrId", averageRating: { $avg: "$rating" } } },
    ]);
    const averageRating = result.length ? result[0].averageRating.toFixed(2) : 0;
    res.status(200).json({
      success: true,
      branchId,
      totalFeedbacks,
      averageRating,
    });
  } catch (err) {
    console.error("Branch Feedback Analytics Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// =========================
// 1 Rating Distribution (per branch)
// =========================
router.get("/feedback/insights/distribution/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;

    const result = await Feedbacks.aggregate([
      { $match: { qrId: new mongoose.Types.ObjectId(branchId) } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const distribution = [1, 2, 3, 4, 5].map((rating) => {
      const found = result.find((r) => r._id === rating);
      return { rating, count: found ? found.count : 0 };
    });

    res.json({ success: true, branchId, distribution });
  } catch (err) {
    console.error("Rating Distribution Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// =========================
// 2️⃣ Most Active Branches
// =========================
router.get("/feedback/insights/active-branches", async (req, res) => {
  try {
    const result = await Feedbacks.aggregate([
      { $group: { _id: "$qrId", totalFeedbacks: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
      { $sort: { totalFeedbacks: -1 } },
      { $limit: 5 },
    ]);

    const populated = await Promise.all(
      result.map(async (item) => {
        const branch = await Branch.findById(item._id).select("name");
        return {
          branchId: item._id,
          branchName: branch ? branch.name : "Unknown",
          totalFeedbacks: item.totalFeedbacks,
          averageRating: item.avgRating.toFixed(2),
        };
      })
    );
    res.json({ success: true, mostActiveBranches: populated });
  } catch (err) {
    console.error("Active Branches Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// =========================
// 3️⃣ Monthly Rating Trends
// =========================
router.get("/feedback/insights/monthly-trends", async (req, res) => {
  try {
    const result = await Feedbacks.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          totalFeedbacks: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const trends = result.map((item) => ({
      month: `${item._id.month}-${item._id.year}`,
      totalFeedbacks: item.totalFeedbacks,
      averageRating: item.avgRating.toFixed(2),
    }));

    res.json({ success: true, trends });
  } catch (err) {
    console.error("Monthly Trends Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// =========================
//  CSV Export (All Feedbacks)
// =========================
router.get("/feedback/insights/export/csv", async (req, res) => {
  try {
    const feedbacks = await Feedbacks.find().populate("branchId", "name").lean();

    const fields = ["_id", "qrId.name", "rating", "comments", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(feedbacks);

    res.header("Content-Type", "text/csv");
    res.attachment("feedback_report.csv");
    return res.send(csv);
  } catch (err) {
    console.error("CSV Export Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});


export default router;

