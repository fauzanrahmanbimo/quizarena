const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/auth');
const csrfMiddleware = require('../middleware/csrf');

const windowMs = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 1 * 60 * 1000;
const maxReqs = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 10;

const syncLimiter = rateLimit({
  windowMs: windowMs,
  max: maxReqs,
  message: { error: 'Too many sync requests, please try again later.' }
});

router.post('/sync', authMiddleware, csrfMiddleware, syncLimiter, progressController.sync);
router.get('/', authMiddleware, progressController.getProgress);

module.exports = router;
