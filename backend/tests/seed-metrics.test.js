const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

jest.mock('mysql2/promise');

describe('Seed Metrics Integration', () => {
  let mockConnection;
  const originalJsonPath = path.resolve(__dirname, '../../questions/default.json');
  let originalData;

  beforeAll(() => {
    if (fs.existsSync(originalJsonPath)) {
      originalData = fs.readFileSync(originalJsonPath, 'utf8');
    }
  });

  afterAll(() => {
    if (originalData) {
      fs.writeFileSync(originalJsonPath, originalData);
    }
  });
  
  beforeEach(() => {
    jest.resetModules();
    process.argv = ['node', 'seed-question-bank.js', '--apply'];
    process.env.DATABASE_URL = 'mysql://u:p@h:3306/db';
    
    mockConnection = {
      beginTransaction: jest.fn(),
      query: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    
    const mysqlLocal = require('mysql2/promise');
    mysqlLocal.createPool.mockReturnValue({
      getConnection: jest.fn().mockResolvedValue(mockConnection),
      end: jest.fn()
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('initial seed: inserted=900, updated=0, skipped=0', async () => {
    const questions = Array.from({ length: 900 }).map((_, i) => ({
      id: i + 1, question: `Q${i}`, category: 'Cat', options: ['A','B'], correctIndex: 0
    }));
    fs.writeFileSync(originalJsonPath, JSON.stringify(questions));

    // DB returns empty for existing
    mockConnection.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT question_key')) return [[]];
      return [{}];
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation((code) => { if(code) throw new Error('exit'); });

    require('../scripts/seed-question-bank.js');
    await new Promise(r => setTimeout(r, 100));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Questions inserted: 900, updated: 0, skipped: 0.'));
    consoleSpy.mockRestore();
  });

  test('identical reseed: inserted=0, updated=0, skipped=900', async () => {
    const questions = Array.from({ length: 900 }).map((_, i) => ({
      id: i + 1, question: `Q${i}`, category: 'Cat', options: ['A','B'], correctIndex: 0
    }));
    fs.writeFileSync(originalJsonPath, JSON.stringify(questions));
    
    // DB returns all 900 as existing identical
    const existing = questions.map(q => ({
      question_key: String(q.id),
      level_id: q._originalLevel || 0,
      category: q.category,
      difficulty: q.difficulty || '',
      question: q.question,
      options: JSON.stringify(q.options),
      correct_index: q.correctIndex,
      explanation: q.explanation || ''
    }));
    
    mockConnection.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT question_key')) return [existing];
      return [{}];
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation((code) => { if(code) throw new Error('exit'); });

    require('../scripts/seed-question-bank.js');
    await new Promise(r => setTimeout(r, 100));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Questions inserted: 0, updated: 0, skipped: 900.'));
    consoleSpy.mockRestore();
  });

  test('one content changed: inserted=0, updated=1, skipped=899', async () => {
    const questions = Array.from({ length: 900 }).map((_, i) => ({
      id: i + 1, question: `Q${i}`, category: 'Cat', options: ['A','B'], correctIndex: 0
    }));
    // Change one
    questions[0].question = 'Q0_MODIFIED';

    fs.writeFileSync(originalJsonPath, JSON.stringify(questions));
    
    const existing = questions.map(q => ({
      question_key: String(q.id),
      level_id: q._originalLevel || 0,
      category: q.category,
      difficulty: q.difficulty || '',
      question: q.id === 1 ? 'Q0_OLD_MODIFIED' : q.question, // Change first question in DB
      options: JSON.stringify(q.options),
      correct_index: q.correctIndex,
      explanation: q.explanation || ''
    }));
    
    mockConnection.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT question_key')) return [existing];
      return [{}];
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation((code) => { if(code) throw new Error('exit'); });

    require('../scripts/seed-question-bank.js');
    await new Promise(r => setTimeout(r, 100));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Questions inserted: 0, updated: 1, skipped: 899.'));
    consoleSpy.mockRestore();
  });
});
