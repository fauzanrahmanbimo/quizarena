const router = require('express').Router();
const questionController = require('../controllers/questionController');
const auth = require('../middleware/auth');

router.get('/', questionController.getQuestions);
router.post('/', auth, questionController.addQuestion);
router.put('/:id', auth, questionController.updateQuestion);
router.delete('/:id', auth, questionController.deleteQuestion);

module.exports = router;
