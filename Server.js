import express from 'express';
import cors from 'cors';
import signupAuth from './auth/authContoller.js';
import connectDB from './config/db.js';
import cookieParser from "cookie-parser";
import upload from './upload/upload.js';
import customURLRoutes from "./customURL/customURL.js";
import feedbackRoutes from "./feedbackRoutes/feedbackRoutes.js";
import payment from './payments/subscription.routes.js';
import uploadLogo from './customURL/logoUpload.js';

const app = express();



// Middlewaress
app.use(express.json());
app.use(cookieParser());

// DB connection
connectDB();

// CORS (local + production)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://admin.infravion.com',   // frontend (example)
    'https://infravion.com',
    "https://qr-review-system-fronmtend-7kye.vercel.app"
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// Routes
app.use('/api', signupAuth);
app.use('/api', upload);
app.use('/api', feedbackRoutes);
app.use('/api/custom-url', customURLRoutes);
app.use('/api' , payment)
app.use('/api/form' , uploadLogo);


// Health check
app.get('/', async (req, res) => {
  res.status(200).send("Server is running ");
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});







