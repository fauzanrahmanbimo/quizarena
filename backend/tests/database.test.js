const mysql = require('mysql2/promise');

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn()
}));

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('passes safely parsed DATABASE_URL string to mysql.createPool', () => {
    process.env.DATABASE_URL = 'mysql://user:pass@host:3306/db';
    
    // Set up mock before requiring
    const mysql = require('mysql2/promise');
    mysql.createPool.mockReturnValueOnce({ dummy: 'pool' });
    
    const pool = require('../config/database');
    
    expect(mysql.createPool).toHaveBeenCalledWith(expect.stringContaining('mysql://user:pass@host:3306/db?connectionLimit=10'));
    expect(pool).toHaveProperty('dummy', 'pool');
  });

  test('handles missing DATABASE_URL by creating an unavailable pool that throws safely', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const pool = require('../config/database');
    
    expect(consoleSpy).toHaveBeenCalledWith('[database] configuration missing');
    await expect(pool.query('SELECT 1')).rejects.toThrow('DATABASE_URL missing');
    
    consoleSpy.mockRestore();
  });

  test('handles invalid connection string format safely without crashing', async () => {
    process.env.DATABASE_URL = 'invalid-url-format';

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const pool = require('../config/database');
    
    expect(consoleSpy).toHaveBeenCalledWith('[database] invalid connection format');
    await expect(pool.query('SELECT 1')).rejects.toThrow('invalid connection format');
    
    consoleSpy.mockRestore();
  });
});
