import pool from '../config/database.js';

async function fixTrashTableItemId() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing trash table item_id column to support both integer and UUID values...');
    
    await client.query('BEGIN');
    
    // Change item_id from UUID to TEXT to support both integer and UUID values
    await client.query(`
      ALTER TABLE trash 
      ALTER COLUMN item_id TYPE TEXT
    `);
    
    await client.query('COMMIT');
    console.log('✅ Trash table item_id column updated to TEXT successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing trash table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTrashTableItemId().catch(console.error);