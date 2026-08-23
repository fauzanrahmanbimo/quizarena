describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears module cache so database.js is re-evaluated
    jest.doMock('mysql2/promise', () => ({
      createPool: jest.fn()
    }));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('passes DATABASE_URL string directly to mysql.createPool', () => {
    process.env.DATABASE_URL = 'mysql://user:pass@host:3306/db';
    
    const mysql = require('mysql2/promise');
    mysql.createPool.mockReturnValueOnce({ dummy: 'pool' });
    
    const pool = require('../config/database');
    
    expect(mysql.createPool).toHaveBeenCalledWith('mysql://user:pass@host:3306/db');
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
    
    const mysql = require('mysql2/promise');
    mysql.createPool.mockImplementationOnce(() => {
      throw new Error('Some internal parse error containing secret');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const pool = require('../config/database');
    
    expect(consoleSpy).toHaveBeenCalledWith('[database] invalid connection format');
    await expect(pool.query('SELECT 1')).rejects.toThrow('invalid connection format');
    
    consoleSpy.mockRestore();
  });
});
