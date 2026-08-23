const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./database-url');
require('dotenv').config();

let pool;

try {
  const config = getDatabaseConfig(false); // Runtime API should NEVER have multipleStatements
  if (!config) {
    console.error('[database] configuration missing');
    pool = {
      query: async () => { throw new Error('DATABASE_URL missing'); },
      getConnection: async () => { throw new Error('DATABASE_URL missing'); },
      end: async () => {}
    };
  } else {
    pool = mysql.createPool(config);
  }
} catch (err) {
  console.error('[database] invalid connection format');
  pool = {
    query: async () => { throw new Error('invalid connection format'); },
    getConnection: async () => { throw new Error('invalid connection format'); },
    end: async () => {}
  };
}

module.exports = pool;
