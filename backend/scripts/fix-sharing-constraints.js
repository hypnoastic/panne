import pool from '../config/database.js';

async function fixSharingConstraints() {
  try {
    console.log('Fixing sharing_links table constraints...');
    
    // Drop the old role constraint
    await pool.query('ALTER TABLE sharing_links DROP CONSTRAINT IF EXISTS sharing_links_role_check');
    
    // Add new permission constraint
    await pool.query(`
      ALTER TABLE sharing_links 
      ADD CONSTRAINT sharing_links_permission_check 
      CHECK (permission IN ('view', 'edit', 'viewer', 'editor'))
    `);
    
    console.log('✅ sharing_links constraints fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix sharing_links constraints:', error);
    process.exit(1);
  }
}

fixSharingConstraints();