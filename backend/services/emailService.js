import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOTP = async (email, otp, type = 'Email Verification') => {
  try {
    const isPasswordReset = type === 'Password Reset';
    const subject = isPasswordReset ? 'Panne - Password Reset' : 'Panne - Email Verification';
    const title = isPasswordReset ? 'Password Reset' : 'Email Verification';
    const message = isPasswordReset ? 'Your password reset code is:' : 'Your verification code is:';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
          ${isPasswordReset ? '<p style="color: #666;">If you didn\'t request this password reset, please ignore this email.</p>' : ''}
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`${type} email sent successfully`);
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};