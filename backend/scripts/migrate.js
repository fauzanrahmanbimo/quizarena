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

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    // In our setup, up scripts end with _schema.sql. E.g. 01_p1_additive_schema.sql, 02_p1_seed_schema.sql
    const upFiles = files.filter(f => !f.includes('_down'));
    const downFiles = files.filter(f => f.includes('_down')).reverse(); // highest to lowest

    const targetFiles = direction === 'up' ? upFiles : downFiles;

    for (const file of targetFiles) {
      const versionId = direction === 'up' ? file : file.replace('_down.sql', '_schema.sql');

      if (direction === 'up') {
        const [rows] = await pool.query('SELECT version FROM schema_migrations WHERE version = ?', [versionId]);
        if (rows.length > 0) {
          console.log(`Migration ${versionId} already applied. Skipping.`);
          continue;
        }
      } else {
        const [rows] = await pool.query('SELECT version FROM schema_migrations WHERE version = ?', [versionId]);
        if (rows.length === 0) {
          console.log(`Migration ${versionId} not applied. Skipping down migration.`);
          continue;
        }
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Running migration: ${file}...`);
      await pool.query(sql);
      
      if (direction === 'up') {
        await pool.query('INSERT INTO schema_migrations (version) VALUES (?)', [versionId]);
        console.log(`Applied: ${versionId}`);
      } else {
        await pool.query('DELETE FROM schema_migrations WHERE version = ?', [versionId]);
        console.log(`Rolled back: ${versionId}`);
      }
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
