import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

class OAuthService {
  constructor() {
    this.googleClient = null;
    this.initializeGoogleClient();
  }

  async initializeGoogleClient() {
    try {
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const { OAuth2Client } = await import('google-auth-library');
        this.googleClient = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_CALLBACK_URL
        );
      }
    } catch (error) {
      console.warn('OAuth2Client initialization failed:', error.message);
      this.googleClient = null;
    }
  }

  // Generate Google OAuth URL
  generateGoogleAuthUrl() {
    if (!this.googleClient) {
      throw new Error('Google OAuth not configured');
    }
    
    const scopes = ['openid', 'email', 'profile'];

    return this.googleClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      response_type: 'code'
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    if (!this.googleClient) {
      throw new Error('Google OAuth not configured');
    }
    
    try {
      const { tokens } = await this.googleClient.getToken(code);
      return tokens;
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  // Verify and decode ID token
  async verifyIdToken(idToken) {
    if (!this.googleClient) {
      throw new Error('Google OAuth not configured');
    }
    
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      return ticket.getPayload();
    } catch (error) {
      throw new Error(`ID token verification failed: ${error.message}`);
    }
  }

  // Store refresh token securely
  async storeRefreshToken(userId, provider, refreshToken, expiresAt = null) {
    try {
      await pool.query(
        `INSERT INTO oauth_tokens (user_id, provider, refresh_token, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, provider)
         DO UPDATE SET refresh_token = $3, expires_at = $4, updated_at = NOW()`,
        [userId, provider, refreshToken, expiresAt]
      );
    } catch (error) {
      throw new Error(`Failed to store refresh token: ${error.message}`);
    }
  }

  // Create or update user from Google profile
  async createOrUpdateGoogleUser(profile, refreshToken) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let result = await client.query(
        'SELECT id, email, name, avatar_url, is_verified FROM users WHERE google_id = $1',
        [profile.sub]
      );

      let user;
      if (result.rows.length === 0) {
        const emailResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [profile.email]
        );

        if (emailResult.rows.length > 0) {
          result = await client.query(
            `UPDATE users SET 
             google_id = $1, provider = 'google', is_verified = true, 
             avatar_url = COALESCE(avatar_url, $2), updated_at = NOW()
             WHERE email = $3
             RETURNING id, email, name, avatar_url, is_verified`,
            [profile.sub, profile.picture, profile.email]
          );
        } else {
          result = await client.query(
            `INSERT INTO users (email, name, avatar_url, google_id, provider, is_verified, password_hash)
             VALUES ($1, $2, $3, $4, 'google', true, NULL)
             RETURNING id, email, name, avatar_url, is_verified`,
            [profile.email, profile.name, profile.picture, profile.sub]
          );
        }
      } else {
        result = await client.query(
          `UPDATE users SET 
           name = $1, avatar_url = COALESCE($2, avatar_url), updated_at = NOW()
           WHERE google_id = $3
           RETURNING id, email, name, avatar_url, is_verified`,
          [profile.name, profile.picture, profile.sub]
        );
      }

      user = result.rows[0];

      if (refreshToken) {
        await this.storeRefreshToken(user.id, 'google', refreshToken);
      }

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Remove refresh token
  async removeRefreshToken(userId, provider) {
    try {
      await pool.query(
        'DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
    } catch (error) {
      console.error('Failed to remove refresh token:', error);
    }
  }

  // Generate session JWT
  generateSessionToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

export default new OAuthService();