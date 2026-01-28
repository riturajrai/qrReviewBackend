
import express from "express";
import QRCode from "qrcode";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import QrImage from "../models/QrImage.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// AWS S3 CLIENT
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

//Function to generate 10 digit random ID
const generateRandomId = () => {
  return Math.random().toString().slice(2, 12); // 10 digits
};

// =============================================================
// Generate QR (One-time only)
// =============================================================
router.post("/generate-qr", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const already = await QrImage.findOne({ user: userId });
    if (already) {
      return res.status(400).json({
        success: false,
        message: "QR already generated",
        qr: already,
      });
    }

    // Generate 10-digit ID
    const randomId = generateRandomId();

    // Create redirect link
    const redirectURL = `https://qr-review-system-fronmtend-7kye.vercel.app/form/${randomId}`;

    // Generate QR code with that URL
    const qrBuffer = await QRCode.toBuffer(redirectURL, {
      type: "png",
      width: 600,
      errorCorrectionLevel: "H",
    });

    // Upload to S3
    const fileName = `qr-${userId}-${randomId}.png`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: qrBuffer,
        ContentType: "image/png",
      })
    );

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Save in MongoDB
    const qrDoc = await QrImage.create({
      user: userId,
      imageUrl,
      s3Key: fileName,
      randomId: randomId,
      data: redirectURL,
    });

    res.status(200).json({
      success: true,
      message: "QR generated successfully",
      qr: qrDoc,
    });
  } catch (err) {
    console.log("QR GENERATE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
//  Get My QR
// =============================================================

router.get("/my-qr", authMiddleware, async (req, res) => {
  try {
    const qr = await QrImage.findOne({ user: req.user._id });

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "QR not found",
      });
    }

    res.status(200).json({ success: true, qr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



// =============================================================
//  DELETE QR (From S3 + DB)
// =============================================================


router.delete("/delete-qr", authMiddleware, async (req, res) => {
  try {
    const qr = await QrImage.findOne({ user: req.user._id });

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "QR not found",
      });
    }

    if (!qr.s3Key) {
      return res.status(400).json({
        success: false,
        message: "Error: QR s3Key missing in database",
      });
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: qr.s3Key,
      })
    );

    // Delete from DB
    await QrImage.deleteOne({ _id: qr._id });

    res.status(200).json({
      success: true,
      message: "QR deleted successfully",
    });
  } catch (err) {
    console.log("QR DELETE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
