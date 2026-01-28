// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Signup from "../models/UserScema.js";
import { sendMail } from "../mailes/transporter.js";

const router = express.Router();

// --- Utility: Generate OTP ---
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Middleware: Verify JWT ---
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Access denied. No token." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// --- Signup ---
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existUser = await Signup.findOne({ email });
    if (existUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Signup({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.log("Error during signup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Login ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Signup.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "100y" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure only in prod
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 100 * 365 * 24 * 60 * 60 * 1000, // ~100 years
    });

    res.status(200).json({
      message: "Login successful",
      user: { id: user._id, username: user.username, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.log("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Check Authentication ---
router.get("/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await Signup.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Authenticated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --------- Logout ----------- //
router.post("/logout", (req, res) => {
  // Logout
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logout successful" });
});

// --- Get Profile ---
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await Signup.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      profile: {
        username: user.username,
        email: user.email,
        phone: user.phone || "",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// --- Update Profile ---
router.put("/profile", verifyToken, async (req, res) => {
  const { username, email, phone } = req.body;

  // Allow empty string for phone (to clear it)
  if (!username && !email && phone === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const updates = {};

    if (username) updates.username = username;
    if (email) {
      const existing = await Signup.findOne({ email });
      if (existing && existing._id.toString() !== req.userId) {
        return res.status(400).json({ message: "Email already in use" });
      }
      updates.email = email;
    }

    // FIXED: Allow empty string to clear phone
    if (phone !== undefined) {
      updates.phone = phone.trim() === "" ? null : phone.trim();
    }

    const user = await Signup.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true, message: "Profile updated",
      profile: {username: user.username, 
      email: user.email,phone: user.phone || "", },});
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});


// --- Change Password ---
router.post("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Both passwords are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be 6+ characters" });
  }

  try {
    const user = await Signup.findById(req.userId);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Password change failed" });
  }
});

// --- Delete Account ---
router.delete("/profile", verifyToken, async (req, res) => {
  try {
    const user = await Signup.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Optional: Add confirmation via email or password
    await Signup.findByIdAndDelete(req.userId);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.json({ success: true, message: "Account deleted permanently" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Deletion failed" });
  }
});

// --- Forgot Password (Send OTP) ---
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Signup.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = generateOtp();
    console.log("OTP for", email, ":", otp);

    const otpToken = jwt.sign({ id: user._id, otp }, process.env.JWT_SECRET, { expiresIn: "5m" });

    await sendMail(email, "Password Reset OTP", `Your OTP is: <b>${otp}</b>. Valid for 5 minutes.`);

    res.cookie("otpToken", otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 5 * 60 * 1000,
    });
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// --- Reset Password using OTP ---
router.post("/reset-password", async (req, res) => {
  const { otp, newPassword } = req.body;
  const otpToken = req.cookies.otpToken;

  if (!otpToken) return res.status(400).json({ message: "OTP expired or missing" });

  try {
    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
    if (decoded.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    const user = await Signup.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.clearCookie("otpToken");
    res.json({ message: "Password reset successful. Login with new password." });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired OTP" });
  }
});

export default router;