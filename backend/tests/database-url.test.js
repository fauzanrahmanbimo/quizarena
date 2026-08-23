const { getDatabaseConfig } = require('../config/database-url');

describe('getDatabaseConfig (URL Helper)', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns fallback config object when DATABASE_URL is missing', () => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'root';

    const config = getDatabaseConfig(false);
    expect(config).toBeInstanceOf(Object);
    expect(config.host).toBe('localhost');
    expect(config.multipleStatements).toBe(false);
  });

  test('returns null when no configuration is present', () => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;

    const config = getDatabaseConfig(false);
    expect(config).toBeNull();
  });

  test('URL without query string gets defaults', () => {
    process.env = { ...originalEnv, DATABASE_URL: 'mysql://user:pass@host:3306/db' };
    
    const config = getDatabaseConfig(false);
    expect(config).toBe('mysql://user:pass@host:3306/db?connectionLimit=10');
  });

  test('URL with existing query string preserves it and appends safe defaults', () => {
    process.env = { ...originalEnv, DATABASE_URL: 'mysql://user:pass@host:3306/db?timezone=Z' };
    
    const config = getDatabaseConfig(false);
    expect(config).toContain('timezone=Z');
    expect(config).toContain('connectionLimit=10');
  });

  test('enableMultipleStatements safely adds search param', () => {
    process.env = { ...originalEnv, DATABASE_URL: 'mysql://user:pass@host:3306/db' };
    
    const config = getDatabaseConfig(true);
    expect(config).toContain('multipleStatements=true');
    expect(config).toContain('connectionLimit=10');
  });

  test('invalid URL throws generic error and does not leak original value', () => {
    process.env = { ...originalEnv, DATABASE_URL: 'invalid-url' };
    
    expect(() => {
      getDatabaseConfig(false);
    }).toThrow('invalid connection format');
  });
});
