import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTrashTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trash (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        data JSONB,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add deleted_at column to ai_chats table
    await pool.query(`
      ALTER TABLE ai_chats 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);

    console.log('Trash table created successfully');
  } catch (error) {
    console.error('Error creating trash table:', error);
  } finally {
    await pool.end();
  }
}

createTrashTable();