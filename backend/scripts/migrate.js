require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { getDatabaseConfig } = require('../config/database-url');

async function runMigration(direction = 'up') {
  let pool;
  try {
    const config = getDatabaseConfig(true); // Allow multipleStatements for migrations
    if (!config) {
      console.error('Migration failed: DATABASE_URL missing');
      process.exit(1);
    }
    pool = mysql.createPool(config);

    // Ensure migrations table exists first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const file = direction === 'up' ? '01_p1_additive_schema.sql' : '01_p1_down.sql';
    
    // Check if applied
    if (direction === 'up') {
      const [rows] = await pool.query('SELECT version FROM schema_migrations WHERE version = ?', [file]);
      if (rows.length > 0) {
        console.log(`Migration ${file} already applied. Skipping.`);
        return;
      }
    }

    const filePath = path.join(__dirname, '..', 'migrations', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Running migration: ${file}...`);
    await pool.query(sql);
    
    if (direction === 'up') {
      await pool.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      console.log(`Applied: ${file}`);
    } else {
      await pool.query('DELETE FROM schema_migrations WHERE version = ?', ['01_p1_additive_schema.sql']);
      console.log(`Rolled back: 01_p1_additive_schema.sql`);
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

const dir = process.argv[2] === 'down' ? 'down' : 'up';
runMigration(dir);
