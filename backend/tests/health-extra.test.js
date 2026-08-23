const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

jest.mock('../config/database', () => ({
  query: jest.fn(),
  end: jest.fn()
}));

describe('GET /health (Extra Security)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 503 and securely logs missing DB URL', async () => {
    db.query.mockRejectedValueOnce(new Error('DATABASE_URL missing'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[health] database check failed: configuration missing')
    );
    
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('DATABASE_URL');
    consoleSpy.mockRestore();
  });

  test('returns 503 and securely logs invalid connection format', async () => {
    db.query.mockRejectedValueOnce(new Error('invalid connection format'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[health] database check failed: invalid connection format')
    );
    consoleSpy.mockRestore();
  });

  test('returns 503 and safely classifies authentication failure', async () => {
    const err = new Error('Access denied');
    err.code = 'ER_ACCESS_DENIED_ERROR';
    db.query.mockRejectedValueOnce(err);
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[health] database check failed: authentication failed')
    );
    consoleSpy.mockRestore();
  });
});
