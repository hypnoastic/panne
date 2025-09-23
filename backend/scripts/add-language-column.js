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

async function addLanguageColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding language column to users table...');
    
    // Check if language column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'language'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Add language column
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN language VARCHAR(10) DEFAULT 'en'
      `);
      console.log('✅ Language column added successfully!');
    } else {
      console.log('✅ Language column already exists!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addLanguageColumn();