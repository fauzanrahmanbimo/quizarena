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

describe('Progress Sync Options Validation', () => {
  let token, csrfToken, csrfCookie, mockConnection;
  
  beforeEach(() => {
    token = jwt.sign({ sub: 'user_123', aud: 'quizarena' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    csrfToken = 'dummy-csrf';
    csrfCookie = `csrf_token=${csrfToken}`;
    
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes('SELECT question_key')) return Promise.resolve([[{ question_key: 'q1', correct_index: 0, level_id: 1, options_count: 4 }]]);
      if (queryStr.includes('SELECT level_id, COUNT(*)')) return Promise.resolve([[{ level_id: 1, cnt: 1 }]]);
      return Promise.resolve([[]]);
    });

    mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn(),
      query: jest.fn()
    };
    db.getConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => jest.clearAllMocks());

  const getPayload = (optionValue) => ({
    clientSyncId: 'test-sync',
    attempts: [{
      client_attempt_id: 'att-opt', attempt_type: 'timed_quiz', level_id: 1, passed: true, score: 100, total_questions: 1, correct_count: 1, incorrect_count: 0, unanswered_count: 0,
      started_at: new Date().toISOString(), completed_at: new Date().toISOString(), accuracy: 100, average_answer_time: 10,
      answers: [{ question_id: 'q1', topic: 'grammar', selected_option_id: optionValue, correct_option_id: 0, is_correct: true, time_spent: 5 }]
    }]
  });

  const testRejection = async (optionValue) => {
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getPayload(optionValue));

    if (res.status === 400) {
      expect(res.body.error).toBeDefined();
    } else {
      expect(res.status).toBe(200);
      expect(res.body.rejected).toEqual(expect.arrayContaining([
        expect.objectContaining({ client_attempt_id: 'att-opt', reason: 'Invalid selected_option_id' })
      ]));
    }
  };

  test('V1. Rejects negative selected_option_id', async () => await testRejection(-1));
  test('V2. Rejects float selected_option_id', async () => await testRejection(1.5));
  test('V3. Rejects string selected_option_id', async () => await testRejection("1"));
  test('V4. Rejects out of bounds selected_option_id', async () => await testRejection(4));
});
