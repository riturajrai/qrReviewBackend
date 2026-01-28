import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: null }, // Allow null
    sendOtp: { otp: String, exp: Date },   // OTP bhejne ke liye
    verifyOtp: { otp: String, exp: Date }, // OTP verify ke liye
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

export default User;
   