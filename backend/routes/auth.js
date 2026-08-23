const router = require('express').Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const csrfMiddleware = require('../middleware/csrf');
const rateLimit = require('express-rate-limit');

// Specific rate limit for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 requests per 15 minutes
  message: { error: 'Terlalu banyak percobaan. Silakan coba lagi setelah 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/csrf', authController.getCsrf);

// Apply CSRF to state-changing auth routes
router.post('/register', authLimiter, csrfMiddleware, authController.register);
router.post('/login', authLimiter, csrfMiddleware, authController.login);
router.post('/logout', csrfMiddleware, authController.logout);

router.get('/me', authMiddleware, authController.me);

module.exports = router;
