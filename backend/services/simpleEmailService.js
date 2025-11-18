import nodemailer from 'nodemailer';

class SimpleEmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Get OAuth2 access token
      const accessToken = await this.getAccessToken();
      
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          accessToken: accessToken
        }
      });
    } catch (error) {
      console.warn('Email transporter initialization failed:', error.message);
      this.transporter = null;
    }
  }

  async getAccessToken() {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID,
          client_secret: process.env.GMAIL_CLIENT_SECRET,
          refresh_token: process.env.GMAIL_REFRESH_TOKEN,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async sendOTP(email, otp, type = 'Email Verification') {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const isPasswordReset = type === 'Password Reset';
      const subject = isPasswordReset ? 'Panne - Password Reset' : 'Panne - Email Verification';
      const title = isPasswordReset ? 'Password Reset' : 'Email Verification';
      const message = isPasswordReset ? 'Your password reset code is:' : 'Your verification code is:';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>${message}</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2EC4B6; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          ${isPasswordReset ? '<p style="color: #666;">If you didn\'t request this password reset, please ignore this email.</p>' : ''}
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`${type} email sent successfully:`, result.messageId);
      return result;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send ${type} email: ${error.message}`);
    }
  }
}

export default new SimpleEmailService();