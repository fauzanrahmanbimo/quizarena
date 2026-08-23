const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
  let timeoutId;
  try {
    const queryPromise = db.query('SELECT 1 AS ok');
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });
    
    await Promise.race([queryPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    
    res.status(200).json({
      status: 'ok',
      database: 'connected'
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('[health] database check failed:', err.message);
    
    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected'
    });
  }
});

module.exports = router;
