const db = require('../config/db');

// 1. 월간 뷰
exports.getMonthData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { year, month } = req.query; 

        if (!year || !month) return res.status(400).json({ error: "연도와 월 정보가 필요합니다." });

        const yearMonth = `${year}-${month.padStart(2, '0')}-`; 

        const { rows } = await db.query(
            `SELECT d.diary_date, d.is_locked, s.ai_emoji, s.ai_score 
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = $1 AND d.diary_date::text LIKE $2
             ORDER BY d.diary_date ASC`,
            [user_id, yearMonth + '%']
        );
        
        res.status(200).json({ data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "월간 데이터 조회 실패" });
    }
};

// 2. 주간 뷰
exports.getWeekData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { startDate, endDate } = req.query; 

        if (!startDate || !endDate) return res.status(400).json({ error: "시작일과 종료일이 필요합니다." });

        const { rows } = await db.query(
            `SELECT d.diary_date, d.is_locked, s.one_line_summary 
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = $1 AND d.diary_date BETWEEN $2 AND $3
             ORDER BY d.diary_date ASC`,
            [user_id, startDate, endDate]
        );

        res.status(200).json({ data: rows });
    } catch (error) {
        res.status(500).json({ error: "주간 데이터 조회 실패" });
    }
};

// 3. 일간 뷰
exports.getDayData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { date } = req.query; 

        if (!date) return res.status(400).json({ error: "날짜 정보가 필요합니다." });

        const { rows } = await db.query(
            `SELECT d.content, d.user_emoji, d.user_score, d.is_locked, 
                    s.title, s.one_line_summary, s.three_line_summary, 
                    s.ai_emoji, s.ai_score, s.ai_comment, s.gratitude, s.reflection, s.reminders
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = $1 AND d.diary_date = $2`,
            [user_id, date]
        );

        if (rows.length === 0) return res.status(404).json({ message: "해당 날짜에 작성된 일기가 없습니다." });

        const diary = rows[0];
        
        // PostgreSQL은 jsonb 필드를 자동으로 객체/배열로 반환해주기도 하므로 타입 확인 후 파싱
        if (typeof diary.three_line_summary === 'string') {
            diary.three_line_summary = JSON.parse(diary.three_line_summary);
        }
        if (typeof diary.reminders === 'string') {
            diary.reminders = JSON.parse(diary.reminders);
        }

        res.status(200).json({ data: diary });
    } catch (error) {
        res.status(500).json({ error: "일간 데이터 조회 실패" });
    }
};

// 4. 인사이트 뷰
exports.getInsightData = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { year, month } = req.query;

        if (!year || !month) return res.status(400).json({ error: "연도와 월 정보가 필요합니다." });

        const yearMonth = `${year}-${month.padStart(2, '0')}-`;

        const { rows } = await db.query(
            `SELECT s.ai_score, s.ai_emoji 
             FROM diaries d
             JOIN diary_ai_summaries s ON d.id = s.diary_id
             WHERE d.user_id = $1 AND d.diary_date::text LIKE $2`,
            [user_id, yearMonth + '%']
        );

        if (rows.length === 0) {
            return res.status(200).json({ data: { averageScore: 0, topEmoji: '없음', totalDiaries: 0 } });
        }

        const totalDiaries = rows.length;
        const sumScore = rows.reduce((sum, row) => sum + row.ai_score, 0);
        const averageScore = Math.round(sumScore / totalDiaries);

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