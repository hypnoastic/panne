import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Using service instead of host/port
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2"
  },
  debug: true,
  pool: true, // Use pooled connections
  maxConnections: 3, // Limit concurrent connections
  maxMessages: Infinity,
  rateDelta: 1000, // Limit to 1 message per second
  rateLimit: 3, // Maximum 3 messages per rateDelta
  timeout: 10000 // 10 second timeout
});

// Verify transporter connection
const verifyConnection = async () => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP Connection Error:', error);
    return false;
  }
};

// Retry mechanism for failed attempts
const retry = async (fn, retries = 3, delay = 2000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const sendOTP = async (email, otp, type = "Email Verification") => {
  try {
    // Verify SMTP connection first
    const isConnected = await verifyConnection();
    if (!isConnected) {
      throw new Error('Failed to establish SMTP connection');
    }

    const isPasswordReset = type === "Password Reset";
    const subject = isPasswordReset
      ? "Panne - Password Reset"
      : "Panne - Email Verification";
    const title = isPasswordReset ? "Password Reset" : "Email Verification";
    const message = isPasswordReset
      ? "Your password reset code is:"
      : "Your verification code is:";

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>${message}</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2EC4B6; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          ${
            isPasswordReset
              ? "<p style=\"color: #666;\">If you didn't request this password reset, please ignore this email.</p>"
              : ""
          }
        </div>
      `
    };

    // Use retry mechanism for sending mail
    await retry(async () => {
      const info = await transporter.sendMail(mailOptions);
      console.log(`${type} email sent successfully. MessageId:`, info.messageId);
      return info;
    });
  } catch (error) {
    console.error("Email send error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack
    });

    // Rethrow with more descriptive message
    throw new Error(
      `Failed to send ${type} email: ${error.code || error.message}. ` +
      `Please check SMTP settings and network connectivity.`
    );
  }
};
