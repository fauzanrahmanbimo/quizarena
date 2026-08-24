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

describe('Progress Sync Atomicity & Rollback (True State Test)', () => {
  let token, csrfToken, csrfCookie, mockConnection;
  
  // Fake Database State
  let committedState = { attempts: [], answers: [], progress: [] };
  let stagedState = { attempts: [], answers: [], progress: [] };
  let transactionActive = false;

  beforeEach(() => {
    token = jwt.sign({ sub: 'user_123', aud: 'quizarena' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    csrfToken = 'dummy-csrf';
    csrfCookie = `csrf_token=${csrfToken}`;
    
    committedState = { attempts: [], answers: [], progress: [] };
    stagedState = { attempts: [], answers: [], progress: [] };
    transactionActive = false;

    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes('SELECT question_key')) return Promise.resolve([[{ question_key: 'q1', correct_index: 0, level_id: 1, options_count: 4 }]]);
      if (queryStr.includes('SELECT level_id, COUNT(*)')) return Promise.resolve([[{ level_id: 1, cnt: 1 }]]);
      if (queryStr.includes('SELECT * FROM user_progress')) return Promise.resolve([[]]);
      if (queryStr.includes('SELECT client_attempt_id')) return Promise.resolve([[]]);
      return Promise.resolve([[]]);
    });

    mockConnection = {
      beginTransaction: jest.fn().mockImplementation(async () => {
        transactionActive = true;
      }),
      commit: jest.fn().mockImplementation(async () => {
        if (!transactionActive) throw new Error('No active transaction');
        committedState.attempts.push(...stagedState.attempts);
        committedState.answers.push(...stagedState.answers);
        committedState.progress.push(...stagedState.progress);
        stagedState = { attempts: [], answers: [], progress: [] };
        transactionActive = false;
      }),
      rollback: jest.fn().mockImplementation(async () => {
        stagedState = { attempts: [], answers: [], progress: [] };
        transactionActive = false;
      }),
      release: jest.fn(),
      query: jest.fn()
    };
    db.getConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => jest.clearAllMocks());

  const getPayload = (id) => ({
    clientSyncId: 'test-sync',
    attempts: [{
      client_attempt_id: id, attempt_type: 'timed_quiz', level_id: 1, passed: true, score: 100, total_questions: 1, correct_count: 1, incorrect_count: 0, unanswered_count: 0,
      started_at: new Date().toISOString(), completed_at: new Date().toISOString(), accuracy: 100, average_answer_time: 10,
      answers: [{ question_id: 'q1', topic: 'grammar', selected_option_id: 0, correct_option_id: 0, is_correct: true, time_spent: 5 }]
    }]
  });

  const runTestWithFailure = async (errorTriggerQuery, testName) => {
    mockConnection.query.mockImplementation(async (queryStr) => {
      if (queryStr.includes(errorTriggerQuery)) throw new Error('Simulated DB Crash: ' + testName);
      if (queryStr.includes('FOR UPDATE')) return [[{ highest_unlocked_level: 1, recommended_level: null }]];
      if (queryStr.includes('INSERT INTO quiz_attempts')) {
        stagedState.attempts.push(testName);
        return [{ insertId: 1 }];
      }
      if (queryStr.includes('INSERT INTO quiz_answers')) {
        stagedState.answers.push(testName + '-ans');
        return [{ affectedRows: 1 }];
      }
      if (queryStr.includes('INSERT INTO user_progress')) {
        stagedState.progress.push(testName + '-prog');
        return [{ affectedRows: 1 }];
      }
      return [[]];
    });

    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getPayload(testName));

    expect(res.status).toBe(200);
    expect(res.body.rejected).toEqual(expect.arrayContaining([expect.objectContaining({ client_attempt_id: testName })]));
    
    // Assert True Rollback State (No committed writes)
    expect(committedState.attempts.length).toBe(0);
    expect(committedState.answers.length).toBe(0);
    expect(committedState.progress.length).toBe(0);
    
    // Assert Rollback Function called exactly once
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);

    // Verify Retry is possible (simulate successful retry)
    mockConnection.query.mockImplementation(async (queryStr) => {
      if (queryStr.includes('FOR UPDATE')) return [[{ highest_unlocked_level: 1, recommended_level: null }]];
      if (queryStr.includes('INSERT INTO quiz_attempts')) { stagedState.attempts.push(testName); return [{ insertId: 1 }]; }
      if (queryStr.includes('INSERT INTO quiz_answers')) { stagedState.answers.push(testName + '-ans'); return [{ affectedRows: 1 }]; }
      if (queryStr.includes('INSERT INTO user_progress')) { stagedState.progress.push(testName + '-prog'); return [{ affectedRows: 1 }]; }
      return [[]];
    });

    const resRetry = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getPayload(testName));

    expect(resRetry.status).toBe(200);
    expect(resRetry.body.accepted).toContain(testName);
    
    // Assert Retry actually committed data
    expect(committedState.attempts.length).toBe(1);
    expect(committedState.answers.length).toBe(1);
    expect(committedState.progress.length).toBe(1);
    expect(committedState.attempts[0]).toBe(testName);
  };

  test('A1. Rollback on quiz_attempts insert failure', async () => await runTestWithFailure('INSERT INTO quiz_attempts', 'att-fail-attempts'));
  test('A2. Rollback on quiz_answers insert failure', async () => await runTestWithFailure('INSERT INTO quiz_answers', 'att-fail-answers'));
  test('A3. Rollback on FOR UPDATE select failure', async () => await runTestWithFailure('FOR UPDATE', 'att-fail-lock'));
  test('A4. Rollback on user_progress update failure', async () => await runTestWithFailure('INSERT INTO user_progress', 'att-fail-progress'));
  
  test('A5. Rollback on commit failure', async () => {
    mockConnection.commit.mockImplementation(async () => {
      throw new Error('Simulated Commit Failure');
    });
    mockConnection.query.mockImplementation(async (queryStr) => {
      if (queryStr.includes('FOR UPDATE')) return [[{ highest_unlocked_level: 1, recommended_level: null }]];
      if (queryStr.includes('INSERT INTO quiz_attempts')) { stagedState.attempts.push('att-fail-commit'); return [{ insertId: 1 }]; }
      if (queryStr.includes('INSERT INTO quiz_answers')) { stagedState.answers.push('att-fail-commit-ans'); return [{ affectedRows: 1 }]; }
      if (queryStr.includes('INSERT INTO user_progress')) { stagedState.progress.push('att-fail-commit-prog'); return [{ affectedRows: 1 }]; }
      return [[]];
    });

    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getPayload('att-fail-commit'));

    expect(res.status).toBe(200);
    // Even if commit fails, the data should NOT be in committedState because commit threw an error.
    expect(committedState.attempts.length).toBe(0);
    expect(committedState.answers.length).toBe(0);
    expect(committedState.progress.length).toBe(0);
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
  });
});
