const fs = require('fs');
const path = require('path');

const qsPath = path.join(__dirname, '../questions/default.json');
const metaPath = path.join(__dirname, '../level_meta.json');

const questions = JSON.parse(fs.readFileSync(qsPath, 'utf8'));
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')).levels;

let errors = 0;

function err(msg) {
  console.error('[ERROR]', msg);
  errors++;
}

// 1. Tidak ada duplicate ID di questions/default.json
const ids = new Set();
questions.forEach((q, i) => {
  if (ids.has(q.id)) err('Duplicate ID found: ' + q.id + ' at index ' + i);
  ids.add(q.id);
});

// 2, 5, 6, 7, 8. Validasi atribut soal
const levelCount = {};
questions.forEach(q => {
  if (q._originalLevel === undefined || q._originalLevel < 1 || q._originalLevel > 30) err('Invalid _originalLevel in question ' + q.id);
  levelCount[q._originalLevel] = (levelCount[q._originalLevel] || 0) + 1;
  
  if (!q.options || q.options.length !== 4) err('Question ' + q.id + ' does not have exactly 4 options');
  else {
    const opts = new Set(q.options);
    if (opts.size !== 4) err('Question ' + q.id + ' has duplicate options');
    if (q.options.some(o => !o || o.trim() === '')) err('Question ' + q.id + ' has empty options');
  }
  
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) err('Question ' + q.id + ' has invalid correctIndex');
  if (!q.category || q.category.trim() === '') err('Question ' + q.id + ' has empty category');
  if (!q.difficulty || q.difficulty.trim() === '') err('Question ' + q.id + ' has empty difficulty');
  if (!q.question || q.question.trim() === '') err('Question ' + q.id + ' has empty question text');
  if (!q.explanation || q.explanation.trim() === '') err('Question ' + q.id + ' has empty explanation');
});

// 3, 4, 9. Validasi metadata
const metaLevels = new Set(meta.map(m => m.level));
for (let i = 1; i <= 30; i++) {
  if (!metaLevels.has(i)) err('Metadata for level ' + i + ' is missing');
  if ((levelCount[i] || 0) !== 30) err('Level ' + i + ' has ' + (levelCount[i] || 0) + ' questions instead of 30');
}

meta.forEach(m => {
  if (!m.name || !m.difficulty || !m.emoji || !m.desc) err('Metadata for level ' + m.level + ' is incomplete');
  if (!levelCount[m.level]) err('Metadata exists for level ' + m.level + ' but no questions found');
});

if (errors > 0) {
  console.error('\nValidation failed with ' + errors + ' errors.');
  process.exit(1);
} else {
  console.log('\nValidation passed! All 900 questions and metadata are valid.');
  process.exit(0);
}
