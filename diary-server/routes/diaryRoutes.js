const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/day', calendarController.getDayData);
router.get('/insight', calendarController.getInsightData);

router.post('/', authMiddleware.verifyToken, diaryController.createDiary);

module.exports = router;