require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../config/database-url');

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const dryRun = !isApply;

function generateQuestionKey(q) {
  return String(q.id);
}

async function runSeed() {
  console.log(`Starting Question Bank Seed... (Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'})`);
  
  const jsonPath = path.resolve(__dirname, '../../questions/default.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`FATAL: File not found at ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('FATAL: Invalid JSON format.');
    process.exit(1);
  }

  // --- VALIDATIONS ---
  if (data.length !== 900) {
    console.error(`FATAL: Expected 900 questions, got ${data.length}. If changed, update doc.`);
    process.exit(1);
  }

  let valid = true;
  const keys = new Set();
  const levelsSet = new Set();
  
  const parsedData = data.map(q => {
    if (!q.question || !q.category || !q.options || q.options.length === 0 || q.correctIndex === undefined || q.id === undefined) {
      console.error(`ERROR: Question ID ${q.id} missing mandatory fields.`);
      valid = false;
    }
    const key = generateQuestionKey(q);
    if (keys.has(key)) {
      console.error(`ERROR: Duplicate Question Key generated for ID ${q.id} (${key}).`);
      valid = false;
    }
    keys.add(key);
    levelsSet.add(q._originalLevel || 0);

    return { ...q, question_key: key };
  });

  if (!valid) {
    console.error('FATAL: Validation failed. Aborting seed.');
    process.exit(1);
  }
  
  console.log(`Validated: ${data.length} questions, ${levelsSet.size} unique levels.`);

  if (dryRun) {
    console.log('DRY-RUN completed successfully. Use --apply to write to database.');
    process.exit(0);
  }

  // --- DATABASE APPLY ---
  let pool;
  let connection;
  try {
    const config = getDatabaseConfig(false);
    if (!config) {
      console.error('FATAL: DATABASE_URL missing');
      process.exit(1);
    }
    pool = mysql.createPool(config);
    connection = await pool.getConnection();

    await connection.beginTransaction();

    let levelsInserted = 0;
    // 1. Upsert Levels
    for (const lvl of levelsSet) {
      const code = `level_${lvl}`;
      const name = `Level ${lvl}`;
      await connection.query(`
        INSERT INTO levels (id, code, name, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name)
      `, [lvl, code, name, lvl, true]);
      levelsInserted++;
    }

    // 2. Upsert Questions
    let qInserted = 0;
    let qUpdated = 0;

    for (const q of parsedData) {
      const optionsJson = JSON.stringify(q.options);
      
      const [result] = await connection.query(`
        INSERT INTO questions 
        (question_key, level_id, category, difficulty, question, options, correct_index, explanation, content_version, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, true)
        ON DUPLICATE KEY UPDATE 
          level_id=VALUES(level_id), 
          category=VALUES(category), 
          difficulty=VALUES(difficulty), 
          question=VALUES(question), 
          options=VALUES(options), 
          correct_index=VALUES(correct_index), 
          explanation=VALUES(explanation)
      `, [
        q.question_key, q._originalLevel || 0, q.category, q.difficulty || '', q.question, optionsJson, q.correctIndex, q.explanation || ''
      ]);

      if (result.affectedRows === 1) qInserted++;
      else if (result.affectedRows === 2) qUpdated++;
    }

    await connection.commit();
    console.log(`APPLY SUCCESS: Levels processed: ${levelsSet.size}. Questions inserted: ${qInserted}, updated: ${qUpdated}.`);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('FATAL: Database error during seed. Rolled back.', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    if (pool) await pool.end();
  }
}

runSeed();
