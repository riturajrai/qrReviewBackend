import express from 'express';
import cors from 'cors';
import signupAuth from './auth/authContoller.js';
import connectDB from './config/db.js';
import cookieParser from "cookie-parser";
import upload from './upload/upload.js'
import customURLRoutes from "./customURL/customURL.js";
import feedbackRoutes from "./feedbackRoutes/feedbackRoutes.js";

const app = express();


app.use(express.json());
app.use(cookieParser()); // ← needed to read cookies

// Database connection
connectDB();

// CORS setup
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
  credentials: true , // important for cookies
}));

// Routes
app.use('/api', signupAuth);
app.use('/api', upload);
app.use("/api", feedbackRoutes);
app.use("/api/custom-url", customURLRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});


