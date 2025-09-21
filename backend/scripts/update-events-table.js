import pool from '../config/database.js';

async function updateEventsTable() {
  try {
    console.log('🔄 Updating events table for calendar functionality...');

    // Check if the events table exists and get its current structure
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'events'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Create events table if it doesn't exist
      await pool.query(`
        CREATE TABLE events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          time VARCHAR(10),
          date DATE NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Events table created successfully');
    } else {
      // Check if we need to add new columns
      const columns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'events' AND table_schema = 'public';
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      
      // Add missing columns
      if (!columnNames.includes('title')) {
        await pool.query('ALTER TABLE events ADD COLUMN title VARCHAR(255)');
        console.log('✅ Added title column');
      }
      
      if (!columnNames.includes('description')) {
        await pool.query('ALTER TABLE events ADD COLUMN description TEXT');
        console.log('✅ Added description column');
      }
      
      if (!columnNames.includes('time')) {
        await pool.query('ALTER TABLE events ADD COLUMN time VARCHAR(10)');
        console.log('✅ Added time column');
      }
      
      if (!columnNames.includes('date')) {
        await pool.query('ALTER TABLE events ADD COLUMN date DATE');
        console.log('✅ Added date column');
      }

      // Migrate existing data if name column exists
      if (columnNames.includes('name') && columnNames.includes('title')) {
        await pool.query('UPDATE events SET title = name WHERE title IS NULL');
        console.log('✅ Migrated name to title');
      }

      // Set default date for existing records without date
      if (columnNames.includes('date')) {
        await pool.query(`
          UPDATE events 
          SET date = CURRENT_DATE 
          WHERE date IS NULL
        `);
        console.log('✅ Set default dates for existing records');
      }

      // Make title and date NOT NULL if they aren't already
      try {
        await pool.query('ALTER TABLE events ALTER COLUMN title SET NOT NULL');
        await pool.query('ALTER TABLE events ALTER COLUMN date SET NOT NULL');
        console.log('✅ Set NOT NULL constraints');
      } catch (error) {
        console.log('⚠️  Constraints may already exist:', error.message);
      }
    }

    console.log('🎉 Events table update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating events table:', error);
    throw error;
  }
}

// Run the migration
updateEventsTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });