process.env.RATE_LIMIT_MAX = '2'; // Allow max 2 requests per window
process.env.NODE_ENV = 'production'; // To ensure rate limiter isn't bypassed if previously configured to bypass on 'test'
process.env.JWT_SECRET = 'test';

const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');

describe('Progress Sync Rate Limiting', () => {
  it('Z. Rate limit terlampaui -> 429', async () => {
    // Generate valid tokens
    const token = jwt.sign({ sub: 'user_123', aud: 'quizarena' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const csrfToken = 'dummy-csrf';
    const csrfCookie = `csrf_token=${csrfToken}`;

    // 1st request -> should pass rate limiter (even if 401 or 400 internally, rate limiter counts it)
    let res = await request(app)
      .post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.1')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send({});
    // We expect 400 Bad Request because payload is empty, but NOT 429 yet
    expect(res.status).not.toBe(429);

    // 2nd request -> should pass rate limiter
    res = await request(app)
      .post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.1')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(res.status).not.toBe(429);

    // 3rd request -> should hit rate limiter (429)
    res = await request(app)
      .post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.1')
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send({});
    
    expect(res.status).toBe(429);
    expect(res.body.error).toBeDefined();

    // Resetting state: different IP should be allowed
    res = await request(app)
      .post('/api/progress/sync')
      .set('x-forwarded-for', '10.0.0.2') // Different IP
      .set('Cookie', `auth_token=${token}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(res.status).not.toBe(429);
  });
});
