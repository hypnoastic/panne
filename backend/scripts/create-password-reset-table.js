import pool from '../config/database.js';

async function createPasswordResetTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Password reset OTPs table created successfully');
  } catch (error) {
    console.error('Error creating password reset OTPs table:', error);
  } finally {
    await pool.end();
  }
}

createPasswordResetTable();