process.env.ENABLE_SYNC = 'true';
process.env.JWT_SECRET = 'test';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const jwt = require('jsonwebtoken');

jest.mock('../config/database', () => {
  const original = jest.requireActual('../config/database');
  return {
    query: jest.fn(),
    getConnection: jest.fn(),
    format: original.format
  };
});

// Deferred promise utility
class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

describe('Progress Sync Concurrency & Stale Writes', () => {
  let token, csrfToken, csrfCookie;
  
  beforeEach(() => {
    token = jwt.sign({ sub: 'user_123', aud: 'quizarena' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    csrfToken = 'dummy-csrf';
    csrfCookie = `csrf_token=${csrfToken}`;
    jest.clearAllMocks();
  });

  test('C1. Concurrent requests resolve sequentially due to FOR UPDATE lock', async () => {
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes('SELECT question_key')) {
        return Promise.resolve([[{ question_key: 'q3', correct_index: 0, level_id: 3, options_count: 4 }, { question_key: 'q5', correct_index: 0, level_id: 5, options_count: 4 }]]);
      }
      if (queryStr.includes('SELECT level_id, COUNT(*)')) {
        return Promise.resolve([[{ level_id: 3, cnt: 1 }, { level_id: 5, cnt: 1 }]]);
      }
      if (queryStr.includes('SELECT * FROM user_progress')) return Promise.resolve([[]]);
      if (queryStr.includes('SELECT client_attempt_id')) return Promise.resolve([[]]);
      return Promise.resolve([[]]);
    });

    let currentHighest = 2;
    let lockHolder = null;
    const lockWaitQueue = [];

    // Custom lock acquisition
    const acquireLock = async (id) => {
      if (!lockHolder) {
        lockHolder = id;
        return;
      }
      const deferred = new Deferred();
      lockWaitQueue.push({ id, deferred });
      await deferred.promise;
    };

    const releaseLock = (id) => {
      if (lockHolder === id) {
        if (lockWaitQueue.length > 0) {
          const next = lockWaitQueue.shift();
          lockHolder = next.id;
          next.deferred.resolve();
        } else {
          lockHolder = null;
        }
      }
    };

    let cxnIdCounter = 0;
    db.getConnection.mockImplementation(async () => {
      const cxnId = ++cxnIdCounter;
      let transactionActive = false;
      return {
        beginTransaction: jest.fn().mockImplementation(async () => { transactionActive = true; }),
        commit: jest.fn().mockImplementation(async () => { releaseLock(cxnId); transactionActive = false; }),
        rollback: jest.fn().mockImplementation(async () => { releaseLock(cxnId); transactionActive = false; }),
        release: jest.fn().mockImplementation(() => { releaseLock(cxnId); }),
        query: jest.fn().mockImplementation(async (queryStr, params) => {
          if (queryStr.includes('FOR UPDATE')) {
            await acquireLock(cxnId);
            return [[{ highest_unlocked_level: currentHighest, recommended_level: null }]];
          }
          if (queryStr.includes('INSERT INTO user_progress') || queryStr.includes('UPDATE user_progress')) {
            const newMax = queryStr.includes('INSERT') ? params[2] : params[0];
            if (newMax > currentHighest) currentHighest = newMax;
            return [{ affectedRows: 1 }];
          }
          if (queryStr.includes('INSERT INTO quiz_attempts')) return [{ insertId: 1 }];
          if (queryStr.includes('INSERT INTO quiz_answers')) return [{ affectedRows: 1 }];
          return [[]];
        })
      };
    });

    const payloadA = {
      clientSyncId: 'sync-A',
      attempts: [{
        client_attempt_id: 'att-A', attempt_type: 'timed_quiz', level_id: 3, passed: true, score: 100, total_questions: 1, correct_count: 1, incorrect_count: 0, unanswered_count: 0,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString(), accuracy: 100, average_answer_time: 10,
        answers: [{ question_id: 'q3', topic: 'grammar', selected_option_id: 0, correct_option_id: 0, is_correct: true, time_spent: 5 }]
      }]
    };

    const payloadB = {
      clientSyncId: 'sync-B',
      attempts: [{
        client_attempt_id: 'att-B', attempt_type: 'timed_quiz', level_id: 5, passed: true, score: 100, total_questions: 1, correct_count: 1, incorrect_count: 0, unanswered_count: 0,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString(), accuracy: 100, average_answer_time: 10,
        answers: [{ question_id: 'q5', topic: 'grammar', selected_option_id: 0, correct_option_id: 0, is_correct: true, time_spent: 5 }]
      }]
    };

    const [resA, resB] = await Promise.all([
      request(app).post('/api/progress/sync').set('Cookie', `auth_token=${token}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(payloadA),
      request(app).post('/api/progress/sync').set('Cookie', `auth_token=${token}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(payloadB)
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    
    // Proves that requests evaluated the max independently but did not downgrade each other. 
    // Both pass, unlocking level 4 and 6 respectively.
    // The final result should be 6 because 5 unlocks 6.
    expect(currentHighest).toBe(6); 
  });
});
