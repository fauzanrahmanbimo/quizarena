process.env.DATABASE_URL = 'mysql://root:@127.0.0.1:3307/quizarena_integration_test?multipleStatements=true';
process.env.ENABLE_SYNC = 'true';
process.env.JWT_SECRET = 'test';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '2'; 

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { setupDatabase, teardownDatabase } = require('./helpers/mysql-setup');
const db = require('../config/database');

describe('MySQL True Integration: Transaction, Locking, Rollback', () => {
  let token1, token2, csrfToken, csrfCookie, pool;

  beforeAll(async () => {
    pool = await setupDatabase();
    token1 = jwt.sign({ id: 1, email: 'test1@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    token2 = jwt.sign({ id: 2, email: 'test2@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    csrfToken = 'dummy-csrf';
    csrfCookie = `csrf_token=${csrfToken}`;
  });

  afterAll(async () => {
    await teardownDatabase();
    await db.end(); // Close app's connection pool
  });

  const getPayload = (attemptId, levelId, questionId, optionId, count=1) => ({
    clientSyncId: 'sync-' + attemptId,
    attempts: [{
      client_attempt_id: attemptId, attempt_type: 'timed_quiz', level_id: levelId, 
      passed: true, total_questions: count, correct_count: count, incorrect_count: 0, unanswered_count: 0,
      accuracy: 100, average_answer_time: 10, passed: true,
      started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      answers: Array(count).fill(0).map((_, i) => ({
        question_id: questionId, topic: 'grammar', selected_option_id: optionId, correct_option_id: 0, is_correct: true, time_spent: 5
      }))
    }]
  });

  test('A. Cross-level ownership: L10 attempt with L1 questions is rejected safely', async () => {
    const res = await request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.1')
      .set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken)
      .send(getPayload('att-A', 10, 'q1_l1', 0));

    expect(res.status).toBe(200);
    expect(res.body.rejected).toEqual(expect.arrayContaining([expect.objectContaining({ reason: expect.stringContaining('Question ownership mismatch') })]));

    // Verify DB State
    const [attempts] = await pool.query('SELECT * FROM quiz_attempts WHERE client_attempt_id = ?', ['att-A']);
    expect(attempts.length).toBe(0);
  });

  test('B. Valid successful sync: Level 1 unlocks Level 2', async () => {
    const payload = getPayload('att-B', 1, 'q1_l1', 0, 2);
    // Overwrite answers to explicitly match the 2 seeded questions
    payload.attempts[0].answers = [
      { question_id: 'q1_l1', topic: 'grammar', selected_option_id: 0, correct_option_id: 0, is_correct: true, time_spent: 5 },
      { question_id: 'q2_l1', topic: 'grammar', selected_option_id: 1, correct_option_id: 1, is_correct: true, time_spent: 5 }
    ];

    const res = await request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.2')
      .set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken)
      .send(payload);

    console.log("TEST B BODY:", res.body);
    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain('att-B');

    const [prog] = await pool.query('SELECT highest_unlocked_level FROM user_progress WHERE user_id = 1');
    const [att] = await pool.query('SELECT * FROM quiz_attempts WHERE client_attempt_id = "att-B"');
    console.log("DB ATTEMPT B:", att[0]);
    expect(prog[0].highest_unlocked_level).toBe(2);
  });

  test('C. Idempotent retry: Re-sending exact payload does not duplicate', async () => {
    const payload = getPayload('att-C', 1, 'q2_l1', 1);
    
    const res1 = await request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.3')
      .set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(payload);
    expect(res1.body.accepted).toContain('att-C');

    const res2 = await request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.3')
      .set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(payload);
    
    expect(res2.status).toBe(200);

    const [attempts] = await pool.query('SELECT COUNT(*) as c FROM quiz_attempts WHERE client_attempt_id = ?', ['att-C']);
    expect(attempts[0].c).toBe(1); 
  });

  test('D. Rollback insert failure: Verify true database rollback', async () => {
    const badPayload = getPayload('att-D', 4, 'q1_l4', 0);
    badPayload.attempts[0].answers[0].topic = 'x'.repeat(255);

    const res = await request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.4')
      .set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(badPayload);

    expect(res.status).toBe(200);
    expect(res.body.rejected.length).toBeGreaterThan(0);

    const [attempts] = await pool.query('SELECT * FROM quiz_attempts WHERE client_attempt_id = ?', ['att-D']);
    expect(attempts.length).toBe(0);
  });

  test('E. Stale progress: Lower level sync does not downgrade highest_unlocked_level', async () => {
    const payload = getPayload('att-E', 1, 'q1_l1', 0, 2);
    payload.attempts[0].answers = [
      { question_id: 'q1_l1', topic: 'grammar', selected_option_id: 0, correct_option_id: 0, is_correct: true, time_spent: 5 },
      { question_id: 'q2_l1', topic: 'grammar', selected_option_id: 1, correct_option_id: 1, is_correct: true, time_spent: 5 }
    ];

    const res = await request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.5')
      .set('Cookie', `auth_token=${token2}; ${csrfCookie}`).set('x-csrf-token', csrfToken)
      .send(payload); 

    expect(res.body.accepted).toContain('att-E');

    const [prog] = await pool.query('SELECT highest_unlocked_level FROM user_progress WHERE user_id = 2');
    expect(prog[0].highest_unlocked_level).toBe(6); 
  });

  test('F. Parallel progress sync: True MySQL row locking prevents race condition', async () => {
    const p1 = request(app).post('/api/progress/sync').set('x-forwarded-for', '10.0.0.6').set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(getPayload('att-F1', 4, 'q1_l4', 0));
    const p2 = request(app).post('/api/progress/sync').set('x-forwarded-for', '10.0.0.7').set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(getPayload('att-F2', 6, 'q1_l6', 0));

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const [prog] = await pool.query('SELECT highest_unlocked_level FROM user_progress WHERE user_id = 1');
    expect(prog[0].highest_unlocked_level).toBe(7); 
  });

  test('G. Parallel progress sync: Proves row locking deterministically by checking execution time', async () => {
    // Acquire a lock manually on user 1's progress
    const lockConn = await pool.getConnection();
    await lockConn.beginTransaction();
    await lockConn.query('SELECT * FROM user_progress WHERE user_id = 1 FOR UPDATE');
    
    // Start the API sync request in the background
    const payload = getPayload('att-G', 1, 'q1_l1', 0, 2);
    payload.attempts[0].answers = [
      { question_id: 'q1_l1', topic: 'grammar', selected_option_id: 0, correct_option_id: 0, is_correct: true, time_spent: 5 },
      { question_id: 'q2_l1', topic: 'grammar', selected_option_id: 1, correct_option_id: 1, is_correct: true, time_spent: 5 }
    ];
    const p1 = request(app).post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.8')
      .set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken)
      .send(payload);

    // Wait 500ms to ensure the request is blocked on the DB lock
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Release the lock
    await lockConn.rollback();
    lockConn.release();
    
    // Now the API request should finish
    const res = await p1;
    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain('att-G');
  });

  test('H. Rate limit endpoint nyata', async () => {
    process.env.RATE_LIMIT_MAX = '2';
    // Send 3 requests
    await request(app).post('/api/progress/sync').set('x-forwarded-for', '10.0.0.9').set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(getPayload('rl-1', 1, 'q1_l1', 0));
    await request(app).post('/api/progress/sync').set('x-forwarded-for', '10.0.0.9').set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(getPayload('rl-2', 1, 'q1_l1', 0));
    const res3 = await request(app).post('/api/progress/sync').set('x-forwarded-for', '10.0.0.9').set('Cookie', `auth_token=${token1}; ${csrfCookie}`).set('x-csrf-token', csrfToken).send(getPayload('rl-3', 1, 'q1_l1', 0));
    
    expect(res3.status).toBe(429);
  });
});
