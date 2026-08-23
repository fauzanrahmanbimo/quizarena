const fs = require('fs');
const path = require('path');
const { verifyBackup } = require('../scripts/verify-backup');

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn()
}));

describe('verifyBackup', () => {
  let mockProcessExit;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    originalEnv = process.env;
  });

  afterEach(() => {
    mockProcessExit.mockRestore();
    process.env = originalEnv;
  });

  test('fails if file does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    verifyBackup('/fake/path.sql');
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test('fails if file size is 0', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 0 });
    verifyBackup('/fake/path.sql');
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test('passes with valid content and deletes file if secret found', () => {
    process.env.DB_PASSWORD = 'super_secret_password';
    
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024 });
    fs.readFileSync.mockReturnValue('MySQL dump CREATE TABLE something; INSERT INTO; but wait here is super_secret_password in plain text!');

    verifyBackup('/fake/path.sql');
    
    expect(fs.unlinkSync).toHaveBeenCalledWith('/fake/path.sql');
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  test('passes verification if structure is valid and secrets are absent', () => {
    process.env.DB_PASSWORD = 'super_secret_password';
    
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024 });
    fs.readFileSync.mockReturnValue('MySQL dump\nCREATE TABLE something;\nINSERT INTO table VALUES (1);');

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    verifyBackup('/fake/path.sql');
    
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(mockProcessExit).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Verification completed successfully.'));
    
    consoleLogSpy.mockRestore();
  });
});
