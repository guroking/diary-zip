const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const authMiddleware = require('../middlewares/authMiddleware');

// 모든 일기 관련 API는 로그인이 필요하므로 authMiddleware를 거칩니다.
router.use(authMiddleware.verifyToken);

// POST /api/diaries (일기 작성 및 AI 분석)
router.post('/', diaryController.createDiary);

module.exports = router;