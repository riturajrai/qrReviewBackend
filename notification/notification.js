// utils/sendNotification.js
import nodemailer from "nodemailer";
import twilio from "twilio";

// EMAIL SETUP
export const sendEmailNotification = async (review) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your Gmail
        pass: process.env.EMAIL_PASS, // your App Password (not normal password)
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.BUSINESS_EMAIL, // business owner email
      subject: " New Customer Review Submitted",
      html: `
        <h2>New Review Alert</h2>
        <p><strong>Name:</strong> ${review.name}</p>
        <p><strong>Rating:</strong> ${review.rating} ⭐</p>
        <p><strong>Comment:</strong> ${review.comment}</p>
        <p><strong>Branch:</strong> ${review.branchName || "Main"}</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log(" Email sent successfully");
  } catch (error) {
    console.error(" Error sending email:", error.message);
  }
}; 

// SMS SETUP (Optional)
export const sendSMSNotification = async (review) => {
  try {
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `New Review: ${review.name} (${review.rating}⭐) - ${review.comment}`,
      from: process.env.TWILIO_PHONE,
      to: process.env.BUSINESS_PHONE, 
    });
    console.log(" SMS sent successfully");
  } catch (error) {
    console.error(" Error sending SMS:", error.message);
  }
};