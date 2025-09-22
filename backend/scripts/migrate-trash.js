import pool from '../config/database.js';

async function createTrashTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trash (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL,
        item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('note', 'notebook', 'agenda', 'task', 'chat')),
        title VARCHAR(255) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trash_user_id ON trash(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trash_item_type ON trash(item_type);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash(deleted_at);
    `);

    console.log('Trash table created successfully');
  } catch (error) {
    console.error('Error creating trash table:', error);
  } finally {
    await pool.end();
  }
}

createTrashTable();