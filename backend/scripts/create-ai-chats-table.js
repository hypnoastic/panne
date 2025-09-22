import pool from '../config/database.js';

async function createAiChatsTable() {
  try {
    console.log('Creating ai_chats table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_chats (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('ai_chats table created successfully');
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);
    `);
    
    console.log('Index created successfully');
    
  } catch (error) {
    console.error('Error creating ai_chats table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAiChatsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createAiChatsTable;