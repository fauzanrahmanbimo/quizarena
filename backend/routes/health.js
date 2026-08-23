const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Timeout applied via promise race to prevent hanging requests if DB is unresponsive
    const queryPromise = db.query('SELECT 1 AS ok');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    );
    
    await Promise.race([queryPromise, timeoutPromise]);
    
    res.status(200).json({
      status: 'ok',
      database: 'connected'
    });
  } catch (err) {
    // Secure error logging, no leak to client
    console.error('[health] database check failed:', err.message);
    
    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected'
    });
  }
});

module.exports = router;
