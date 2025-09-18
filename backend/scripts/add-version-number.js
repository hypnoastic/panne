import pool from '../config/database.js';

async function addVersionNumber() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add version_number column to versions table
    await client.query(`
      ALTER TABLE versions 
      ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1
    `);

    await client.query('COMMIT');
    console.log('✅ Added version_number column to versions table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding version_number column:', error);
    throw error;
  } finally {
    client.release();
  }
}

addVersionNumber().catch(console.error);