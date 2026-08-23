const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

jest.mock('../config/database', () => ({
  query: jest.fn(),
  end: jest.fn()
}));

describe('GET /health', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 OK and valid JSON when database is connected', async () => {
    db.query.mockResolvedValueOnce([[{ ok: 1 }]]);

    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      status: 'ok',
      database: 'connected'
    });
  });

  test('returns 503 Unavailable and safe JSON when database query fails', async () => {
    db.query.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:3306'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/health');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[health] database check failed:', 
      'ECONNREFUSED 127.0.0.1:3306'
    );
    
    expect(res.statusCode).toBe(503);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      status: 'unavailable',
      database: 'disconnected'
    });
    
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('ECONNREFUSED');
    expect(bodyStr).not.toContain('DATABASE_URL');
    expect(bodyStr).not.toContain('MYSQL_URL');
    expect(bodyStr).not.toContain('password');

    consoleSpy.mockRestore();
  });

  test('returns 503 when database query times out', async () => {
    let mockTimeoutId;
    db.query.mockImplementationOnce(() => new Promise(resolve => {
      mockTimeoutId = setTimeout(resolve, 6000);
    }));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      status: 'unavailable',
      database: 'disconnected'
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[health] database check failed:', 
      'Database query timeout'
    );
    
    // Clear the mock timeout to prevent open handles
    if (mockTimeoutId) clearTimeout(mockTimeoutId);
    consoleSpy.mockRestore();
  }, 10000);
});
