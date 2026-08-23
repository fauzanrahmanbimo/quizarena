const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('[database] configuration missing');
  pool = {
    query: async () => { throw new Error('DATABASE_URL missing'); },
    getConnection: async () => { throw new Error('DATABASE_URL missing'); },
    end: async () => {}
  };
} else {
  try {
    if (process.env.DATABASE_URL) {
      // Must pass URL string directly to createPool as instructed
      pool = mysql.createPool(process.env.DATABASE_URL);
    } else {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }
  } catch (err) {
    console.error('[database] invalid connection format');
    pool = {
      query: async () => { throw new Error('invalid connection format'); },
      getConnection: async () => { throw new Error('invalid connection format'); },
      end: async () => {}
    };
  }
}

module.exports = pool;
