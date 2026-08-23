require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration(direction = 'up') {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quizarena',
    multipleStatements: true
  });

  try {
    const file = direction === 'up' ? '01_p1_additive_schema.sql' : '01_p1_down.sql';
    const filePath = path.join(__dirname, '..', 'migrations', file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Running migration: ${file}...`);
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const dir = process.argv[2] === 'down' ? 'down' : 'up';
runMigration(dir);
