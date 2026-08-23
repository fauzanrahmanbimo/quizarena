const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
  let timeoutId;
  try {
    const queryPromise = db.query('SELECT 1 AS ok');
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Database query timeout')), 3000);
    });
    
    await Promise.race([queryPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    
    res.status(200).json({
      status: 'ok',
      database: 'connected'
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    
    let internalErrorClass = 'database unavailable';
    if (err.message === 'DATABASE_URL missing') internalErrorClass = 'configuration missing';
    else if (err.message === 'invalid connection format') internalErrorClass = 'invalid connection format';
    else if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_DBACCESS_DENIED_ERROR') internalErrorClass = 'authentication failed';
    else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') internalErrorClass = 'network unreachable';

    // Secure error logging: ONLY log the safe category
    console.error(`[health] database check failed: ${internalErrorClass}`);
    
    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected'
    });
  }
});

module.exports = router;
