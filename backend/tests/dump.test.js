const { spawn } = require('child_process');
const fs = require('fs');
const { runDump } = require('../scripts/dump-database');

jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn()
}));

describe('Logical Backup Script', () => {
  let originalEnv;
  let mockProcessExit;
  
  beforeEach(() => {
    originalEnv = process.env;
    jest.resetModules();
    jest.clearAllMocks();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Mock default file system behaviors
    fs.existsSync.mockReturnValue(true);
    fs.createWriteStream.mockReturnValue({
      on: jest.fn(),
      close: jest.fn()
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    mockProcessExit.mockRestore();
  });

  test('blocks backup if hostname is internal Railway network', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@mysql.railway.internal:3306/db';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await runDump();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('private Railway internal network'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('BACKUP BLOCKED'));
    expect(mockProcessExit).toHaveBeenCalledWith(1);
    expect(spawn).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('calls mysqldump securely with required flags and environmental password', async () => {
    process.env.DATABASE_URL = 'mysql://user:super_secret_password@db.example.com:3306/quizarena';
    
    // Mock child process events
    const mockChildProcess = {
      stdout: { pipe: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') callback(0); // Mock successful exit
      })
    };
    spawn.mockReturnValue(mockChildProcess);
    
    fs.statSync.mockReturnValue({ size: 1024 });

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runDump();

    // Verify spawn arguments
    expect(spawn).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawn.mock.calls[0];
    
    expect(command).toBe('mysqldump');
    
    // Verify password is NOT in arguments
    const argsStr = args.join(' ');
    expect(argsStr).not.toContain('super_secret_password');
    expect(argsStr).toContain('--host=db.example.com');
    expect(argsStr).toContain('--user=user');
    expect(argsStr).toContain('--single-transaction');
    expect(argsStr).toContain('--databases');
    expect(argsStr).toContain('quizarena');
    expect(argsStr).toContain('--default-character-set=utf8mb4');

    // Verify security options
    expect(options.windowsHide).toBe(true);
    expect(options.shell).toBeUndefined(); // ensure shell: true is NOT set
    expect(options.env.MYSQL_PWD).toBe('super_secret_password'); // passed via env

    consoleLogSpy.mockRestore();
  });

  test('removes partial dump file if mysqldump fails', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@db.example.com:3306/db';
    
    const mockChildProcess = {
      stdout: { pipe: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') callback(1); // Mock failure exit
      })
    };
    spawn.mockReturnValue(mockChildProcess);
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await runDump();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Backup failed. mysqldump exited with code:', 1);
    expect(fs.unlinkSync).toHaveBeenCalledTimes(1); // Partial file removed
    expect(mockProcessExit).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
  });
});
