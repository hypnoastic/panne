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
    
    // Check notes table columns
    const notesResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'notes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📝 Notes table columns:');
    if (notesResult.rows.length === 0) {
      console.log('❌ Notes table does not exist!');
    } else {
      notesResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Check table constraints
    const constraintsResult = await client.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notes' AND column_name = 'notebook_id';
    `);
    
    console.log('\n📋 Notebook_id constraint:');
    constraintsResult.rows.forEach(row => {
      console.log(`  - nullable: ${row.is_nullable}, default: ${row.column_default}`);
    });
    
    // Check notebooks table
    const notebooksResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'notebooks' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📚 Notebooks table columns:');
    if (notebooksResult.rows.length === 0) {
      console.log('❌ Notebooks table does not exist!');
    } else {
      notebooksResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Check if ai_chats table exists
    const aiChatsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'ai_chats' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n🤖 AI Chats table columns:');
    if (aiChatsResult.rows.length === 0) {
      console.log('❌ AI Chats table does not exist!');
    } else {
      aiChatsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();