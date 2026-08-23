require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../config/database-url');

async function verifyParity() {
  console.log('Starting Parity Verification...');
  
  const jsonPath = path.resolve(__dirname, '../../questions/default.json');
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const sourceData = JSON.parse(rawData);

  let pool;
  try {
    const config = getDatabaseConfig(false);
    if (!config) {
      console.warn('Parity check skipped. No test database available.');
      process.exit(0);
    }
    pool = mysql.createPool(config);

    const [dbQuestions] = await pool.query('SELECT question_key FROM questions');
    const dbKeys = new Set(dbQuestions.map(q => q.question_key));
    const sourceKeys = new Set(sourceData.map(q => String(q.id)));

    let missingInDb = 0;
    let unexpectedInDb = 0;

    for (const key of sourceKeys) {
      if (!dbKeys.has(key)) missingInDb++;
    }

    for (const key of dbKeys) {
      if (!sourceKeys.has(key)) unexpectedInDb++;
    }

    console.log('Parity Verification Report:');
    console.log(`Source Total: ${sourceData.length}`);
    console.log(`Database Total: ${dbQuestions.length}`);
    console.log(`Missing in DB: ${missingInDb}`);
    console.log(`Unexpected in DB: ${unexpectedInDb}`);

    if (sourceData.length !== 900 || dbQuestions.length !== 900 || missingInDb > 0 || unexpectedInDb > 0) {
      console.error('PARITY CHECK FAILED.');
      process.exit(1);
    } else {
      console.log('PARITY CHECK PASSED.');
      process.exit(0);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR') {
      console.warn('Parity check skipped. No test database available.');
      process.exit(0);
    }
    console.error('Database error during parity check:', err);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

verifyParity();
