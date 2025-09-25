import pool from '../config/database.js';

async function createOTPTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
    `);
    
    console.log('OTP table created successfully');
  } catch (error) {
    console.error('Error creating OTP table:', error);
  }
}

createOTPTable();