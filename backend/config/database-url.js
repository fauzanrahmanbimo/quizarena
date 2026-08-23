const { URL } = require('url');

/**
 * Returns a securely parsed database configuration.
 * Returns a connection string (if DATABASE_URL is present) or a config object.
 * Returns null if no configuration is present.
 */
function getDatabaseConfig(enableMultipleStatements = false) {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    return null;
  }

  if (process.env.DATABASE_URL) {
    try {
      const dbUrl = new URL(process.env.DATABASE_URL);
      
      // Mutate search params safely
      if (enableMultipleStatements) {
        dbUrl.searchParams.set('multipleStatements', 'true');
      }

      // Default safe connection pool properties for CLI and apps if missing
      if (!dbUrl.searchParams.has('connectionLimit')) {
        dbUrl.searchParams.set('connectionLimit', '10');
      }
      
      return dbUrl.toString();
    } catch (err) {
      throw new Error('invalid connection format');
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quizarena',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: enableMultipleStatements
  };
}

module.exports = { getDatabaseConfig };
