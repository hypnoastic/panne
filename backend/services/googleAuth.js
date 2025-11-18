import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Simple Google OAuth without google-auth-library
class GoogleAuthService {
  // Generate Google OAuth URL
  generateAuthUrl() {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange code for tokens
  async exchangeCodeForTokens(code) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_CALLBACK_URL
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Get user info from Google
  async getUserInfo(accessToken) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json();
  }

  // Create or update user
  async createOrUpdateUser(userInfo) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let result = await client.query(
        'SELECT id, email, name, avatar_url, is_verified FROM users WHERE google_id = $1',
        [userInfo.id]
      );

      let user;
      if (result.rows.length === 0) {
        const emailResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [userInfo.email]
        );

        if (emailResult.rows.length > 0) {
          result = await client.query(
            `UPDATE users SET 
             google_id = $1, provider = 'google', is_verified = true, 
             avatar_url = COALESCE(avatar_url, $2), updated_at = NOW()
             WHERE email = $3
             RETURNING id, email, name, avatar_url, is_verified`,
            [userInfo.id, userInfo.picture, userInfo.email]
          );
        } else {
          result = await client.query(
            `INSERT INTO users (email, name, avatar_url, google_id, provider, is_verified, password_hash)
             VALUES ($1, $2, $3, $4, 'google', true, NULL)
             RETURNING id, email, name, avatar_url, is_verified`,
            [userInfo.email, userInfo.name, userInfo.picture, userInfo.id]
          );
        }
      } else {
        result = await client.query(
          `UPDATE users SET 
           name = $1, avatar_url = COALESCE($2, avatar_url), updated_at = NOW()
           WHERE google_id = $3
           RETURNING id, email, name, avatar_url, is_verified`,
          [userInfo.name, userInfo.picture, userInfo.id]
        );
      }

      user = result.rows[0];
      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

export default new GoogleAuthService();