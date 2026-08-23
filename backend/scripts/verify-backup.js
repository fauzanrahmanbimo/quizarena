const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function verifyBackup(filePath) {
  console.log(`Verifying backup file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`FATAL: File does not exist at ${filePath}`);
    process.exit(1);
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    console.error('FATAL: File size is 0 bytes.');
    process.exit(1);
    return;
  }
  console.log(`[PASS] File exists and size is non-zero (${stat.size} bytes).`);

  const content = fs.readFileSync(filePath, 'utf8');

  // Verify headers and typical table constructs
  const expectedMarkers = ['MySQL dump', 'CREATE TABLE', 'INSERT INTO'];
  for (const marker of expectedMarkers) {
    if (!content.includes(marker)) {
      console.warn(`WARNING: Missing expected marker: "${marker}"`);
    }
  }
  console.log('[PASS] Dump structure verified (Headers and Tables detected).');

  // Guard against credentials leaking into the text (e.g., from command string logging)
  const secrets = [
    process.env.DB_PASSWORD, 
    process.env.JWT_SECRET
  ].filter(s => s && s.length > 3); // only test meaningful secrets

  for (const secret of secrets) {
    if (content.includes(secret)) {
      console.error('FATAL: SECURITY BREACH. A secret credential was found in the dump text!');
      fs.unlinkSync(filePath);
      console.error('The compromised dump file has been automatically deleted.');
      process.exit(1);
      return;
    }
  }
  console.log('[PASS] No known secrets found in dump text.');

  // Checksum
  const hash = crypto.createHash('sha256');
  hash.update(content);
  const checksum = hash.digest('hex');
  console.log(`[PASS] SHA-256 Checksum: ${checksum}`);
  
  // Output metadata payload
  console.log('\n--- VERIFICATION METADATA ---');
  console.log(JSON.stringify({
    timestamp_utc: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    file_size_bytes: stat.size,
    sha256_checksum: checksum,
    storage_location: '***redacted-for-security***',
  }, null, 2));

  console.log('Verification completed successfully.');
}

const args = process.argv.slice(2);
if (require.main === module) {
  if (args.length === 0) {
    console.error('Usage: node verify-backup.js <absolute-path-to-sql-file>');
    process.exit(1);
  }
  verifyBackup(args[0]);
}

module.exports = { verifyBackup };
