const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middlewares/authMiddleware');

// 달력 조회 역시 로그인한 유저 본인의 데이터만 봐야 하므로 verifyToken을 통과시킵니다.
router.use(authMiddleware.verifyToken);

// GET /api/calendar/month
router.get('/month', calendarController.getMonthData);

// GET /api/calendar/week
router.get('/week', calendarController.getWeekData);

// GET /api/calendar/day
router.get('/day', calendarController.getDayData);

module.exports = router;