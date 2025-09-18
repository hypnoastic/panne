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

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database schema...\n');
    
    const tables = ['users', 'notebooks', 'notes', 'versions', 'collaborators', 'sharing_links'];
    
    for (const table of tables) {
      console.log(`📋 Table: ${table}`);
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
      
      if (result.rows.length === 0) {
        console.log(`  ❌ Table does not exist\n`);
      } else {
        result.rows.forEach(row => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();