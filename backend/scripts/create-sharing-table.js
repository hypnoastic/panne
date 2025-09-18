import pool from '../config/database.js';

async function createSharingTable() {
  try {
    console.log('Creating sharing_links table...');
    
    // Create sharing_links table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sharing_links (
        id SERIAL PRIMARY KEY,
        note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
        share_id VARCHAR(255) UNIQUE NOT NULL,
        permission VARCHAR(20) DEFAULT 'view',
        expires_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    console.log('✅ sharing_links table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create sharing_links table:', error);
    process.exit(1);
  }
}

createSharingTable();