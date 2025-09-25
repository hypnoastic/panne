import pool from '../config/database.js';

async function fixPasswordHashNullable() {
  try {
    console.log('Making password_hash column nullable for OAuth users...');
    
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN password_hash DROP NOT NULL;
    `);
    
    console.log('✅ password_hash column is now nullable');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixPasswordHashNullable();