const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/auth');
const csrfMiddleware = require('../middleware/csrf');

const syncLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 sync requests per minute per IP
  message: { error: 'Too many sync requests, please try again later.' }
});

router.post('/sync', authMiddleware, csrfMiddleware, syncLimiter, progressController.sync);
router.get('/', authMiddleware, progressController.getProgress);

module.exports = router;
