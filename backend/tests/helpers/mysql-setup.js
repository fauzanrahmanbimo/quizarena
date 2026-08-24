const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: '',
  database: 'quizarena_integration_test',
  multipleStatements: true
};

let pool;

async function setupDatabase() {
  // Connect without database to create it
  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });

  await connection.query(`DROP DATABASE IF EXISTS ${DB_CONFIG.database}`);
  await connection.query(`CREATE DATABASE ${DB_CONFIG.database}`);
  await connection.end();

  // Now connect with database to run schema and migrations
  pool = mysql.createPool(DB_CONFIG);
  
  // 1. Run schema.sql
  const schemaPath = path.join(__dirname, '../../schema.sql');
  let schemaSql = fs.readFileSync(schemaPath, 'utf8');
  schemaSql = schemaSql.replace(/CREATE DATABASE IF NOT EXISTS.*?;/g, '')
                       .replace(/USE .*?;/g, '');
  await pool.query(schemaSql);

  // Drop questions table from legacy schema so migration 02 recreates it with question_key
  await pool.query('DROP TABLE IF EXISTS questions');

  // 2. Run migrations manually (since script uses process.exit and dotenv)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const upFiles = files.filter(f => !f.includes('_down'));

  for (const file of upFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
  }

  // 3. Seed Users
  await pool.query(`INSERT INTO users (id, email, password) VALUES (1, 'test1@example.com', 'hashed'), (2, 'test2@example.com', 'hashed')`);

  // 4. Seed Questions (Question Bank Parity requirement)
  // Seed levels first
  await pool.query(`
    INSERT INTO levels (id, code, name, title, sort_order) VALUES
    (1, 'L1', 'Level 1', 'Basic', 1),
    (4, 'L4', 'Level 4', 'Intermediate', 4),
    (6, 'L6', 'Level 6', 'Advanced', 6),
    (10, 'L10', 'Level 10', 'Expert', 10)
  `);

  await pool.query(`
    INSERT INTO questions (question_key, level_id, category, question, options, correct_index, explanation, is_active)
    VALUES 
    ('q1_l1', 1, 'grammar', 'q1?', JSON_ARRAY('a','b','c','d'), 0, 'exp', 1),
    ('q2_l1', 1, 'grammar', 'q2?', JSON_ARRAY('a','b','c','d'), 1, 'exp', 1),
    ('q1_l4', 4, 'grammar', 'q1?', JSON_ARRAY('a','b','c','d'), 0, 'exp', 1),
    ('q1_l6', 6, 'grammar', 'q1?', JSON_ARRAY('a','b','c','d'), 0, 'exp', 1),
    ('q1_l10', 10, 'grammar', 'q1?', JSON_ARRAY('a','b','c','d'), 0, 'exp', 1)
  `);

  // 5. Seed initial progress for user 2 (Stale Progress test)
  await pool.query(`
    INSERT INTO user_progress (user_id, highest_unlocked_level)
    VALUES (2, 6)
  `);

  return pool;
}

async function teardownDatabase() {
  if (pool) {
    await pool.query(`DROP DATABASE IF EXISTS ${DB_CONFIG.database}`);
    await pool.end();
  }
}

module.exports = { setupDatabase, teardownDatabase, DB_CONFIG };
