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

async function verifyDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying database structure...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables created:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log('\n✅ Database verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase();