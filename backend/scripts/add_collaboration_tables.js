import pool from '../config/database.js';

async function createCollaborationTables() {
  try {
    // Add visibility column to sharing_links table
    await pool.query(`
      ALTER TABLE sharing_links 
      ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) DEFAULT 'private' 
      CHECK (visibility IN ('public', 'private'));
    `);

    // Create permission_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permission_requests (
        id SERIAL PRIMARY KEY,
        note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        UNIQUE(note_id, requester_id, status)
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_permission_requests_owner_id ON permission_requests(owner_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);
    `);

    console.log('Collaboration tables created successfully');
  } catch (error) {
    console.error('Error creating collaboration tables:', error);
  } finally {
    try {
      await pool.end();
    } catch (finalError) {
      console.error('Error closing pool:', finalError);
    }
  }
}

createCollaborationTables();