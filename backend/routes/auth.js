import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import oauthService from '../services/oauthService.js';
import otpService from '../services/otpService.js';
import { sendOTP } from '../services/emailService.js';

const SALT_ROUNDS = 12;

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// Register with email verification
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, provider, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, is_verified',
      [email, passwordHash, name, 'local', false]
    );
    
    const user = result.rows[0];
    await otpService.sendEmailVerificationOTP(email);
    
    res.status(201).json({ 
      user, 
      message: 'Registration successful. Please check your email for verification code.',
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email with OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    await otpService.verifyEmailOTP(email, otp);
    const user = await otpService.markUserAsVerified(email);
    
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    const userResult = await pool.query(
      'SELECT id, email, name, avatar_url, is_verified FROM users WHERE id = $1',
      [user.id]
    );
    
    res.json({ 
      user: userResult.rows[0], 
      token,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Resend verification OTP
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const userResult = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userResult.rows[0].is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    await otpService.sendEmailVerificationOTP(email);
    res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Google OAuth URL
router.get('/google/url', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({ error: 'Google OAuth not configured' });
    }
    
    // Wait for OAuth service to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const authUrl = oauthService.generateGoogleAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Google OAuth URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate OAuth URL',
      details: error.message 
    });
  }
});

// Google OAuth callback (GET for redirect)
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }
    
    const tokens = await oauthService.exchangeCodeForTokens(code);
    const profile = await oauthService.verifyIdToken(tokens.id_token);
    const user = await oauthService.createOrUpdateGoogleUser(profile, tokens.refresh_token);
    const sessionToken = oauthService.generateSessionToken(user.id);
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${sessionToken}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, email, name, password_hash, avatar_url, language, is_verified, provider FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    if (user.provider === 'google' && !user.password_hash) {
      return res.status(400).json({ error: 'Please sign in with Google' });
    }
    
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.is_verified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        requiresVerification: true,
        email: user.email
      });
    }
    
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await oauthService.removeRefreshToken(req.user.id, 'google');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logged out successfully' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, language, is_verified, provider FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Reset OTP
router.post('/send-reset-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const recentOTP = await pool.query(
      'SELECT created_at FROM password_reset_otps WHERE email = $1 AND created_at > NOW() - INTERVAL \'1 minute\'',
      [email]
    );
    
    if (recentOTP.rows.length > 0) {
      return res.status(429).json({ error: 'Please wait before requesting another reset code' });
    }
    
    await pool.query('DELETE FROM password_reset_otps WHERE email = $1', [email]);
    await pool.query(
      'INSERT INTO password_reset_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );
    
    await sendOTP(email, otp, 'Password Reset');
    res.json({ message: 'Reset code sent successfully' });
  } catch (error) {
    console.error('Send reset OTP error:', error);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// Verify Reset OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }
    
    const otpResult = await pool.query(
      'SELECT * FROM password_reset_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
      [email, otp]
    );
    
    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }
    
    res.json({ message: 'Reset code verified successfully' });
  } catch (error) {
    console.error('Reset OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const otpResult = await pool.query(
      'SELECT * FROM password_reset_otps WHERE email = $1 AND expires_at > NOW()',
      [email]
    );
    
    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'No valid reset session found' });
    }
    
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id',
      [passwordHash, email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await pool.query('DELETE FROM password_reset_otps WHERE email = $1', [email]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;