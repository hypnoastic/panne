import pool from '../config/database.js';

async function addDeletedAtColumn() {
  try {
    console.log('Adding deleted_at column to notes table...');
    
    // Check if column already exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notes' AND column_name = 'deleted_at'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Add deleted_at column
      await pool.query(`
        ALTER TABLE notes 
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ Added deleted_at column to notes table');
    } else {
      console.log('✅ deleted_at column already exists');
    }
    
    // Check if preferences column exists in users table
    const prefsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'preferences'
    `);
    
    if (prefsCheck.rows.length === 0) {
      // Add preferences column
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✅ Added preferences column to users table');
    } else {
      console.log('✅ preferences column already exists');
    }
    
    console.log('✅ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addDeletedAtColumn();