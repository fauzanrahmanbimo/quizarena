require('dotenv').config();
const { spawn } = require('child_process');
const { getDatabaseConfig } = require('../config/database-url');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function runDump() {
  console.log('Starting logical database backup...');
  let configStr = getDatabaseConfig(false);
  
  if (!configStr || typeof configStr === 'object') {
    // If it's an object, it means DATABASE_URL was missing. Check if we have individual DB vars.
    if (!process.env.DB_HOST || !process.env.DB_USER) {
       console.error('FATAL: No database credentials available to perform backup.');
       process.exit(1);
    }
    // We construct a mock URL to reuse logic
    configStr = `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`;
  }

  const dbUrl = new URL(configStr);
  const host = dbUrl.hostname;
  const port = dbUrl.port || '3306';
  const user = dbUrl.username;
  const password = dbUrl.password;
  const database = dbUrl.pathname.replace('/', '');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(os.homedir(), 'Downloads', 'quizarena-db-backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `backup_${database}_${timestamp}.sql`);

  console.log(`Connecting to database host: ${host} (port: ${port})`);
  console.log(`Target database: ${database}`);
  console.log(`Destination: ${backupFile}`);

  const args = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    `--password=${password}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    database
  ];

  const dumpProcess = spawn('mysqldump', args, {
    windowsHide: true,
  });

  const writeStream = fs.createWriteStream(backupFile);
  dumpProcess.stdout.pipe(writeStream);

  let errorOutput = '';
  dumpProcess.stderr.on('data', (data) => {
    // Note: mysqldump outputs a warning about using password on CLI. We ignore it safely.
    errorOutput += data.toString();
  });

  dumpProcess.on('close', (code) => {
    if (code === 0) {
      console.log('Backup completed successfully.');
      console.log(`File size: ${fs.statSync(backupFile).size} bytes.`);
      console.log('You can now verify the backup using PowerShell.');
    } else {
      console.error('Backup failed. mysqldump exited with code:', code);
      if (errorOutput && !errorOutput.includes('Using a password on the command line interface can be insecure')) {
        console.error('Error details:', errorOutput);
      }
      process.exit(1);
    }
  });

  dumpProcess.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('FATAL: mysqldump command not found. Please install MySQL Client Tools and ensure they are on your system PATH.');
    } else {
      console.error('Failed to start mysqldump:', err);
    }
    process.exit(1);
  });
}

runDump();
