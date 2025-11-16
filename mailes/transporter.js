import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,       // SSL port for Gmail
      secure: true,    // true for 465
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    const mailOptions = {
      from: `"Qr Review Us Software" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Email could not be sent");
  }
};
