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
    if (!process.env.DB_HOST || !process.env.DB_USER) {
       console.error('FATAL: No database credentials available to perform backup.');
       process.exit(1);
       return;
    }
    configStr = `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`;
  }

  const dbUrl = new URL(configStr);
  const host = dbUrl.hostname;
  const port = dbUrl.port || '3306';
  const user = dbUrl.username;
  const password = dbUrl.password;
  const database = dbUrl.pathname.replace('/', '');

  if (host.endsWith('.railway.internal')) {
    console.error('FATAL: The DATABASE_URL points to a private Railway internal network (.railway.internal).');
    console.error('Your local machine cannot connect to this private network directly via `railway run`.');
    console.error('To proceed, please temporarily enable the "Public TCP Proxy" on your MySQL service in the Railway UI,');
    console.error('update your local environment or use that public URL for the backup, and disable it afterward.');
    console.error('Status: BACKUP BLOCKED');
    process.exit(1);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(os.homedir(), 'Downloads', 'quizarena-db-backups');
  
  // Guard: Reject if target path is inside the repository
  const repoDir = path.resolve(__dirname, '../../');
  if (backupDir.startsWith(repoDir)) {
    console.error('FATAL: Security Guard - Cannot store backup inside the repository directory.');
    process.exit(1);
    return;
  }
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `backup_${database}_${timestamp}.sql`);

  console.log(`Connecting to database host: ${host} (port: ${port})`);
  console.log(`Target database: ${database}`);
  console.log(`Destination: ${backupFile}`);

  // Secure arguments: NO password in args, NO shell injection.
  const args = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    '--databases',
    database,
    '--default-character-set=utf8mb4'
  ];

  // Inject password securely via environment variable
  const env = Object.assign({}, process.env, {
    MYSQL_PWD: password
  });

  const dumpProcess = spawn('mysqldump', args, {
    env,
    windowsHide: true,
  });

  const writeStream = fs.createWriteStream(backupFile);
  dumpProcess.stdout.pipe(writeStream);

  let errorOutput = '';
  dumpProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  dumpProcess.on('close', (code) => {
    if (code === 0) {
      console.log('Backup completed successfully.');
      console.log(`File size: ${fs.statSync(backupFile).size} bytes.`);
    } else {
      console.error('Backup failed. mysqldump exited with code:', code);
      if (errorOutput && !errorOutput.includes('Using a password on the command line interface can be insecure')) {
        console.error('Error details:', errorOutput);
      }
      // Remove partial file on failure
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
        console.error('Partial backup file removed.');
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
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
    process.exit(1);
  });
}

module.exports = { runDump };

if (require.main === module) {
  runDump();
}
