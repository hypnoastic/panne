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

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    gemini_api_key TEXT,
    locale VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Notebooks table
  `CREATE TABLE IF NOT EXISTS notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Notes table
  `CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Versions table
  `CREATE TABLE IF NOT EXISTS versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    version_number INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Collaborators table
  `CREATE TABLE IF NOT EXISTS collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'owner')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(note_id, user_id)
  )`,

  // Sharing links table
  `CREATE TABLE IF NOT EXISTS sharing_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor')),
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
];

const indexes = [
  `CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id) WHERE user_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON notes(notebook_id) WHERE notebook_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_versions_note_id ON versions(note_id) WHERE note_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_collaborators_note_id ON collaborators(note_id) WHERE note_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id) WHERE user_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_sharing_links_token ON sharing_links(token) WHERE token IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(is_deleted, deleted_at) WHERE is_deleted = true`
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create tables first
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Creating table ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }
    
    // Create indexes after tables exist
    for (let i = 0; i < indexes.length; i++) {
      console.log(`Creating index ${i + 1}/${indexes.length}...`);
      try {
        await client.query(indexes[i]);
      } catch (indexError) {
        console.warn(`Warning: Could not create index ${i + 1}: ${indexError.message}`);
      }
    }
    
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();