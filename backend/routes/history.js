const router = require('express').Router();
const historyController = require('../controllers/historyController');
const auth = require('../middleware/auth');

router.post('/', auth, historyController.saveHistory);
router.get('/', auth, historyController.getHistory);
router.get('/stats', auth, historyController.getStats);

module.exports = router;
