import pool from '../config/database.js';

async function fixSharingTable() {
  try {
    console.log('Fixing sharing_links table schema...');
    
    // Check if token column exists and rename it to share_id
    const tokenColumnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sharing_links' AND column_name = 'token'
    `);
    
    if (tokenColumnExists.rows.length > 0) {
      console.log('Renaming token column to share_id...');
      await pool.query('ALTER TABLE sharing_links RENAME COLUMN token TO share_id');
    }
    
    // Check if role column exists and rename it to permission
    const roleColumnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sharing_links' AND column_name = 'role'
    `);
    
    if (roleColumnExists.rows.length > 0) {
      console.log('Renaming role column to permission...');
      await pool.query('ALTER TABLE sharing_links RENAME COLUMN role TO permission');
    }
    
    console.log('✅ sharing_links table schema fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix sharing_links table:', error);
    process.exit(1);
  }
}

fixSharingTable();