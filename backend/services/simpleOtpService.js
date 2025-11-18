import pool from '../config/database.js';
import emailService from './simpleEmailService.js';

class SimpleOTPService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send email verification OTP
  async sendEmailVerificationOTP(email) {
    try {
      // Check for recent OTP requests (rate limiting)
      const recentOTP = await pool.query(
        `SELECT created_at FROM email_verification_otps 
         WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
        [email]
      );

      if (recentOTP.rows.length > 0) {
        throw new Error('Please wait before requesting another verification code');
      }

      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete existing OTPs for this email
      await pool.query('DELETE FROM email_verification_otps WHERE email = $1', [email]);

      // Store OTP
      await pool.query(
        'INSERT INTO email_verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
        [email, otp, expiresAt]
      );

      // Send OTP email
      await emailService.sendOTP(email, otp, 'Email Verification');

      return { success: true, message: 'Verification code sent successfully' };
    } catch (error) {
      throw new Error(`Failed to send verification code: ${error.message}`);
    }
  }

  // Verify email OTP
  async verifyEmailOTP(email, otp) {
    try {
      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        throw new Error('Invalid OTP format');
      }

      // Verify OTP
      const result = await pool.query(
        `SELECT * FROM email_verification_otps 
         WHERE email = $1 AND otp = $2 AND expires_at > NOW()`,
        [email, otp]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired verification code');
      }

      // Delete used OTP
      await pool.query('DELETE FROM email_verification_otps WHERE email = $1', [email]);

      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Mark user as verified
  async markUserAsVerified(email) {
    try {
      const result = await pool.query(
        'UPDATE users SET is_verified = true, updated_at = NOW() WHERE email = $1 RETURNING id',
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to verify user: ${error.message}`);
    }
  }

  // Send password reset OTP
  async sendPasswordResetOTP(email) {
    try {
      // Check for recent OTP requests
      const recentOTP = await pool.query(
        'SELECT created_at FROM password_reset_otps WHERE email = $1 AND created_at > NOW() - INTERVAL \'1 minute\'',
        [email]
      );

      if (recentOTP.rows.length > 0) {
        throw new Error('Please wait before requesting another reset code');
      }

      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Delete existing OTPs
      await pool.query('DELETE FROM password_reset_otps WHERE email = $1', [email]);

      // Store OTP
      await pool.query(
        'INSERT INTO password_reset_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
        [email, otp, expiresAt]
      );

      // Send OTP email
      await emailService.sendOTP(email, otp, 'Password Reset');

      return { success: true, message: 'Reset code sent successfully' };
    } catch (error) {
      throw new Error(`Failed to send reset code: ${error.message}`);
    }
  }
}

export default new SimpleOTPService();