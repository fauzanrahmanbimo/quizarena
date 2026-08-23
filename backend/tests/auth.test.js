const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

// Mock db for testing route logic without DB connection
jest.mock('../config/database', () => ({
  query: jest.fn()
}));

describe('Auth & Security', () => {
  let csrfToken, cookie;

  beforeAll(async () => {
    // 1. Test GET /api/auth/csrf
    const res = await request(app).get('/api/auth/csrf');
    expect(res.statusCode).toEqual(200);
    expect(res.body.csrfToken).toBeDefined();
    
    // Extract csrf cookie
    cookie = res.headers['set-cookie'][0];
    csrfToken = res.body.csrfToken;
  });

  test('CORS blocks unknown origins', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://evil.com');
    expect(res.statusCode).toEqual(403);
  });

  test('CORS allows valid origins', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:3000');
    // Using supertest .options might return 204 or pass
    expect(res.statusCode).not.toEqual(403);
  });

  test('Login fails without CSRF token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toEqual('Validasi CSRF gagal.');
  });

  test('Login works with CSRF token and valid credentials', async () => {
    // Mock DB behavior for login
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 1);
    db.query.mockResolvedValueOnce([[{ id: 1, email: 'test@test.com', password: hash }]]);

    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.statusCode).toEqual(200);
    // Check HttpOnly auth cookie is set
    const authCookie = res.headers['set-cookie'].find(c => c.startsWith('auth_token='));
    expect(authCookie).toBeDefined();
    expect(authCookie).toContain('HttpOnly');
    expect(res.body.user.email).toEqual('test@test.com');
    // Ensure it does not return the password hash
    expect(res.body.user.password).toBeUndefined();
  });

  test('Me endpoint returns unauthorized without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toEqual(401);
  });
});
