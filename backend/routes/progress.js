const router = require('express').Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/auth');
const csrfMiddleware = require('../middleware/csrf');

router.post('/sync', authMiddleware, csrfMiddleware, progressController.sync);

module.exports = router;
