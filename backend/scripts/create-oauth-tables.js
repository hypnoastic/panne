import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrations = [
  // Update users table to support OAuth
  `ALTER TABLE users 
   ALTER COLUMN password_hash DROP NOT NULL`,
   
  `ALTER TABLE users 
   ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
   ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local',
   ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
   ADD COLUMN IF NOT EXISTS refresh_token TEXT`,

  // Email verification OTPs table
  `CREATE TABLE IF NOT EXISTS email_verification_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // OAuth refresh tokens table (for secure storage)
  `CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
  )`
];

const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider)`,
  `CREATE INDEX IF NOT EXISTS idx_email_verification_otps_email ON email_verification_otps(email)`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id)`
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting OAuth migrations...');
    
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`);
      try {
        await client.query(migrations[i]);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`Migration ${i + 1} already applied, skipping...`);
        } else {
          throw error;
        }
      }
    }
    
    for (let i = 0; i < indexes.length; i++) {
      console.log(`Creating index ${i + 1}/${indexes.length}...`);
      try {
        await client.query(indexes[i]);
      } catch (indexError) {
        console.warn(`Warning: Could not create index ${i + 1}: ${indexError.message}`);
      }
    }
    
    console.log('✅ OAuth migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();