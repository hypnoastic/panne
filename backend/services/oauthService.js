import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

class OAuthService {
  constructor() {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  // Generate Google OAuth URL
  generateGoogleAuthUrl() {
    const scopes = [
      'openid',
      'email',
      'profile'
    ];

    return this.googleClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      response_type: 'code'
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.googleClient.getToken(code);
      return tokens;
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  // Verify and decode ID token
  async verifyIdToken(idToken) {
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

  // Get stored refresh token
  async getRefreshToken(userId, provider) {
    try {
      const result = await pool.query(
        'SELECT refresh_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
      return result.rows[0]?.refresh_token || null;
    } catch (error) {
      throw new Error(`Failed to retrieve refresh token: ${error.message}`);
    }
  }

  // Refresh Google access token
  async refreshGoogleAccessToken(userId) {
    try {
      const refreshToken = await this.getRefreshToken(userId, 'google');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      this.googleClient.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.googleClient.refreshAccessToken();
      
      return credentials;
    } catch (error) {
      if (error.message.includes('invalid_grant')) {
        // Remove invalid refresh token
        await this.removeRefreshToken(userId, 'google');
        throw new Error('Refresh token expired or revoked. Please re-authenticate.');
      }
      throw new Error(`Token refresh failed: ${error.message}`);
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

  // Create or update user from Google profile
  async createOrUpdateGoogleUser(profile, refreshToken) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user exists by Google ID
      let result = await client.query(
        'SELECT id, email, name, avatar_url, is_verified FROM users WHERE google_id = $1',
        [profile.sub]
      );

      let user;
      if (result.rows.length === 0) {
        // Check if user exists by email
        const emailResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [profile.email]
        );

        if (emailResult.rows.length > 0) {
          // Update existing user with Google ID
          result = await client.query(
            `UPDATE users SET 
             google_id = $1, provider = 'google', is_verified = true, 
             avatar_url = COALESCE(avatar_url, $2), updated_at = NOW()
             WHERE email = $3
             RETURNING id, email, name, avatar_url, is_verified`,
            [profile.sub, profile.picture, profile.email]
          );
        } else {
          // Create new user
          result = await client.query(
            `INSERT INTO users (email, name, avatar_url, google_id, provider, is_verified, password_hash)
             VALUES ($1, $2, $3, $4, 'google', true, NULL)
             RETURNING id, email, name, avatar_url, is_verified`,
            [profile.email, profile.name, profile.picture, profile.sub]
          );
        }
      } else {
        // Update existing Google user
        result = await client.query(
          `UPDATE users SET 
           name = $1, avatar_url = COALESCE($2, avatar_url), updated_at = NOW()
           WHERE google_id = $3
           RETURNING id, email, name, avatar_url, is_verified`,
          [profile.name, profile.picture, profile.sub]
        );
      }

      user = result.rows[0];

      // Store refresh token
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