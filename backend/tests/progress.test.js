process.env.JWT_SECRET = 'test';

process.env.ENABLE_SYNC = 'true';
process.env.SYNC_LOG_HASH_SECRET = 'test-secret';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../config/database');

const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../config/database', () => ({
  getConnection: jest.fn(),
  query: jest.fn()
}));

describe('Progress Sync API Canary Gates', () => {
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
    db.getConnection.mockResolvedValue(mockConnection);
    mockConnection.query.mockResolvedValue([ { insertId: 1 } ]);
    db.query.mockResolvedValue([[]]);
    process.env.ENABLE_SYNC = 'true';
  });

  const getValidPayload = () => ({
    clientSyncId: 'sync-req-1',
    attempts: [{
      client_attempt_id: 'att-1',
      attempt_type: 'timed_quiz',
      level_id: 1,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      total_questions: 10,
      correct_count: 8,
      incorrect_count: 2,
      unanswered_count: 0,
      accuracy: 80,
      average_answer_time: 12,
      passed: true,
      answers: []
    }]
  });

  // A. Tanpa token -> 401
  test('A. No token -> 401', async () => {
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
    expect(res.status).toBe(401);
  });

  // B. Token invalid -> 401
  test('B. Invalid token -> 401', async () => {
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}_token; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
    expect(res.status).toBe(401);
  });

  // C. Token valid + ENABLE_SYNC unset/false -> 501
  test('C. Valid token + ENABLE_SYNC=false -> 501', async () => {
    process.env.ENABLE_SYNC = 'false';
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
    expect(res.status).toBe(501);
  });

  // D. Token valid + ENABLE_SYNC=true + payload valid -> sukses
  test('D. Valid token + ENABLE_SYNC=true + payload valid -> 200', async () => {
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain('att-1');
  });

  // E. Token valid + payload schema invalid -> 400
  test('E. Payload schema invalid -> 400', async () => {
    const payload = getValidPayload();
    payload.extraField = 'hack'; // Unrecognized root field
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(payload);
    expect(res.status).toBe(400);
  });

  // F. Payload melampaui MAX_ATTEMPTS -> 413
  test('F. Payload > MAX_ATTEMPTS -> 413', async () => {
    const payload = getValidPayload();
    payload.attempts = new Array(26).fill(payload.attempts[0]);
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(payload);
    expect(res.status).toBe(413);
  });

  // G. User A tidak bisa menulis data atas nama User B
  test('G. User ID is strictly extracted from JWT, rejecting payload injection', async () => {
    await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
    
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO quiz_attempts'),
      expect.arrayContaining(['att-1', 1]) // 1 is the user_id from token
    );
  });

  // H. Kirim event dengan client_attempt_id identik dua kali -> tidak ada record ganda
  test('H. Duplicate client_attempt_id returns accepted without duplicate insertion', async () => {
    const dupError = new Error('Duplicate');
    dupError.code = 'ER_DUP_ENTRY';
    mockConnection.query.mockRejectedValueOnce(dupError);

    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
    
    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain('att-1');
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  // I. Event lama/stale tidak boleh overwrite state/progress terbaru
  test('I. Stale event does not overwrite newer progress', async () => {
    // DB returns existing highest_unlocked_level = 5, targetUnlock = 5
    db.query.mockResolvedValueOnce([[{ highest_unlocked_level: 5, recommended_level: 10 }]]);
    
    const payload = getValidPayload();
    payload.attempts[0].level_id = 1;
    
    await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(payload);
      
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_progress'),
      expect.arrayContaining([1, 10, 5])
    );
  });

  // J. Rate limit terlampaui -> 429
  // Because rate limit is memory-based per IP, we'll verify it by looking at router stack
  // A clean integration test would hit 11 times, but this is safer for Jest
  test('K. Database connection failure -> 500 without stack trace', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    db.getConnection.mockRejectedValue(new Error('FATAL DB OFFLINE'));
    
    const res = await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
      
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('"level":"error"');
    consoleSpy.mockRestore();
  });

  // L. Pengecekan log test: tidak mengandung raw user ID, token, dll.
  test('L. Log safe output verification', async () => {
    const consoleInfoSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await request(app)
      .post('/api/progress/sync')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(getValidPayload());
      
    const logOutput = consoleInfoSpy.mock.calls[0][0];
    expect(logOutput).toContain('"action":"cloud_sync"');
    expect(logOutput).not.toContain('auth_token');
    expect(logOutput).not.toContain('sync-req-1'); // payload not logged
    const parsedLog = JSON.parse(logOutput);
    expect(parsedLog.user).not.toBe(1);
    expect(parsedLog.user.length).toBe(16); // Hash length (HMAC is hex 64 chars, but we substring(0,16))
    
    consoleInfoSpy.mockRestore();
  });
test('Z. Rate limit terlampaui -> 429', async () => {
        for (let i = 0; i < 11; i++) {
       await request(app)
        .post('/api/progress/sync')
        .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
        .set('x-csrf-token', csrfToken)
        .send({});
    }
    const res = await request(app)
        .post('/api/progress/sync')
        .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
        .set('x-csrf-token', csrfToken)
        .send({});
    expect(res.status).toBe(429);
  });
  
  });
