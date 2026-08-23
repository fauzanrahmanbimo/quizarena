const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Runtime MySQL Migration Test', () => {
  let pool;
  
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      console.warn('Skipping actual DB test: TEST_DATABASE_URL not set. Please provide a MySQL test instance URL.');
      return;
    }
    pool = mysql.createPool(process.env.TEST_DATABASE_URL);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('Migration up is applied and idempotent', async () => {
    if (!pool) return;
    
    // Clean up test DB before test (assuming it's safe test DB)
    await pool.query('DROP TABLE IF EXISTS schema_migrations, user_progress, diagnostic_results, quiz_answers, quiz_attempts');
    await pool.query('CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY)');

    // 1st run
    const out1 = execSync(`node ${path.join(__dirname, '../scripts/migrate.js')} up`, { 
      env: { ...process.env, DB_NAME: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL } 
    }).toString();
    
    expect(out1).toContain('Applied: 01_p1_additive_schema.sql');

    // 2nd run
    const out2 = execSync(`node ${path.join(__dirname, '../scripts/migrate.js')} up`, { 
      env: { ...process.env, DB_NAME: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL } 
    }).toString();
    
    expect(out2).toContain('already applied. Skipping.');

    // Verify schema features
    const [rows] = await pool.query("SHOW INDEX FROM quiz_attempts WHERE Key_name = 'unique_attempt_per_user'");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].Column_name).toBe('user_id');
  });
});
