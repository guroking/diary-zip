const db = require('../config/db');

// 1. 월간 뷰: 이번 달의 날짜, AI 표정, AI 점수만 가볍게 가져옵니다.
exports.getMonthData = async (req, res) => {
    try {
        const user_id = req.user.id;
        // 프론트엔드에서 /api/calendar/month?year=2026&month=10 형태로 요청합니다.
        const { year, month } = req.query; 

        if (!year || !month) return res.status(400).json({ error: "연도와 월 정보가 필요합니다." });

        const yearMonth = `${year}-${month.padStart(2, '0')}-%`; // 예: '2026-10-%'

        const [rows] = await db.execute(
            `SELECT d.diary_date, d.is_locked, s.ai_emoji, s.ai_score 
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = ? AND d.diary_date LIKE ?
             ORDER BY d.diary_date ASC`,
            [user_id, yearMonth]
        );
        
        res.status(200).json({ data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "월간 데이터 조회 실패" });
    }
};

// 2. 주간 뷰: 선택한 주(Week)의 날짜와 1줄 요약 리스트만 가져옵니다.
exports.getWeekData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { startDate, endDate } = req.query; 

        if (!startDate || !endDate) return res.status(400).json({ error: "시작일과 종료일이 필요합니다." });

        const [rows] = await db.execute(
            `SELECT d.diary_date, d.is_locked, s.one_line_summary 
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = ? AND d.diary_date BETWEEN ? AND ?
             ORDER BY d.diary_date ASC`,
            [user_id, startDate, endDate]
        );

        res.status(200).json({ data: rows });
    } catch (error) {
        res.status(500).json({ error: "주간 데이터 조회 실패" });
    }
};

// 3. 일간 뷰: 특정 날짜의 요약 + 상세 데이터를 모두 가져옵니다.
exports.getDayData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { date } = req.query; 

        if (!date) return res.status(400).json({ error: "날짜 정보가 필요합니다." });

        const [rows] = await db.execute(
            `SELECT d.content, d.user_emoji, d.user_score, d.is_locked, 
                    s.title, s.one_line_summary, s.three_line_summary, 
                    s.ai_emoji, s.ai_score, s.ai_comment, s.gratitude, s.reflection, s.reminders
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = ? AND d.diary_date = ?`,
            [user_id, date]
        );

        if (rows.length === 0) return res.status(404).json({ message: "해당 날짜에 작성된 일기가 없습니다." });

        const diary = rows[0];
        
        // DB에 JSON 문자열로 저장된 배열을 프론트엔드가 쓰기 좋게 다시 배열로 변환
        diary.three_line_summary = JSON.parse(diary.three_line_summary);
        diary.reminders = JSON.parse(diary.reminders);

        res.status(200).json({ data: diary });
    } catch (error) {
        res.status(500).json({ error: "일간 데이터 조회 실패" });
    }
};

exports.getInsightData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { year, month } = req.query;

        if (!year || !month) return res.status(400).json({ error: "연도와 월 정보가 필요합니다." });

        const yearMonth = `${year}-${month.padStart(2, '0')}-%`;

        const [rows] = await db.execute(
            `SELECT s.ai_score, s.ai_emoji 
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = ? AND d.diary_date LIKE ?`,
            [user_id, yearMonth]
        );

        // 작성된 일기가 없을 경우 기본값 반환
        if (rows.length === 0) {
            return res.status(200).json({ data: { averageScore: 0, topEmoji: '없음', totalDiaries: 0 } });
        }

        const totalDiaries = rows.length;
        
        // 1) 평균 점수 계산 (소수점 반올림)
        const sumScore = rows.reduce((sum, row) => sum + row.ai_score, 0);
        const averageScore = Math.round(sumScore / totalDiaries);

        // 2) 가장 많이 등장한 이모지 찾기
        const emojiCounts = {};
        let topEmoji = rows[0].ai_emoji;
        let maxCount = 0;

        rows.forEach(row => {
            const e = row.ai_emoji;
            emojiCounts[e] = (emojiCounts[e] || 0) + 1;
            if (emojiCounts[e] > maxCount) {
                maxCount = emojiCounts[e];
                topEmoji = e;
            }
        });

        res.status(200).json({ data: { averageScore, topEmoji, totalDiaries } });
    } catch (error) {
        console.error("인사이트 에러:", error);
        res.status(500).json({ error: "인사이트 데이터 조회 실패" });
    }
};