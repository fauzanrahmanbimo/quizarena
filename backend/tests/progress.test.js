process.env.ENABLE_SYNC='true';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../config/database');

const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../config/database', () => {
  return {
    query: jest.fn(),
    getConnection: jest.fn(() => Promise.resolve(mockConnection))
  };
});

describe('Progress Sync API', () => {
  let token;
  let csrfToken;
  let csrfCookie;
  const userId = 1;

  beforeAll(async () => {
    token = jwt.sign({ id: userId, email: 'test@example.com' }, process.env.JWT_SECRET || 'test');
    const res = await request(app).get('/api/auth/csrf');
    csrfToken = res.body.csrfToken;
    csrfCookie = res.headers['set-cookie'][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.query.mockReset(); // Clear previous mock responses
    mockConnection.query.mockResolvedValue([[]]); // Default response
    db.query.mockReset();
    db.query.mockResolvedValue([[]]); // Default response
  });

  test('POST /api/progress/sync without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', [csrfCookie])
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/progress/sync with invalid payload returns 400', async () => {
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', [`auth_token=${token}`, csrfCookie])
      .set('x-csrf-token', csrfToken)
      .send({ clientSyncId: 123 }); // clientSyncId must be string
    expect(res.status).toBe(400);
  });

  test('POST /api/progress/sync with valid payload accepts data', async () => {
    mockConnection.query.mockResolvedValueOnce([{ insertId: 1 }]); // quiz_attempts
    mockConnection.query.mockResolvedValueOnce([]); // quiz_answers

    const attempt = {
      client_attempt_id: 'uuid-1',
      attempt_type: 'timed_quiz',
      level_id: 1,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      total_questions: 10,
      correct_count: 8,
      incorrect_count: 2,
      unanswered_count: 0,
      accuracy: 80,
      average_answer_time: 5,
      passed: true,
      answers: []
    };

    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', [`auth_token=${token}`, csrfCookie])
      .set('x-csrf-token', csrfToken)
      .send({ clientSyncId: 'sync-1', attempts: [attempt] });
      
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.accepted).toContain('uuid-1');
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test('POST /api/progress/sync handles duplication gracefully (idempotency)', async () => {
    const dupError = new Error('Duplicate');
    dupError.code = 'ER_DUP_ENTRY';
    mockConnection.query.mockRejectedValueOnce(dupError); // quiz_attempts fails with duplicate

    const attempt = {
      client_attempt_id: 'uuid-dup',
      attempt_type: 'timed_quiz',
      level_id: 1,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      total_questions: 10,
      correct_count: 8,
      incorrect_count: 2,
      unanswered_count: 0,
      accuracy: 80,
      average_answer_time: 5,
      passed: true,
      answers: []
    };

    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', [`auth_token=${token}`, csrfCookie])
      .set('x-csrf-token', csrfToken)
      .send({ clientSyncId: 'sync-2', attempts: [attempt] });
      
    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain('uuid-dup');
    expect(mockConnection.rollback).toHaveBeenCalled(); // Rollback since it's already there
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

  test('GET /api/progress returns user data', async () => {
    db.query.mockResolvedValueOnce([[{ recommended_level: 2, highest_unlocked_level: 3 }]]);
    db.query.mockResolvedValueOnce([[{ client_attempt_id: 'uuid-1', passed: 1, completed_at: new Date() }]]);

    const res = await request(app)
      .get('/api/progress')
      .set('Cookie', [`auth_token=${token}`, csrfCookie])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.progress.highest_unlocked_level).toBe(3);
    expect(res.body.attempts.length).toBe(1);
    expect(res.body.attempts[0].passed).toBe(true);
  });
});
