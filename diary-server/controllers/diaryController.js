const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.createDiary = async (req, res) => {
    const client = await db.getClient();
    
    try {
        const { content, user_emoji, user_score, is_locked = false } = req.body;
        const user_id = req.user.id; 

        if (!content || !user_emoji || user_score == null) {
            return res.status(400).json({ error: "일기 내용, 표정, 점수는 필수 항목입니다." });
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", // 최신 안정 버전
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
        너는 'Diary.zip' 서비스의 다이어리 분석 전문가야.
        사용자의 일기를 읽고 반드시 아래 규칙에 맞춰 JSON 형식으로 답변해 줘.

        [User's Self-Assessment]
        - User's Emotion Score: ${user_score} / 100
        - User's Selected Emoji: ${user_emoji}

        [출력 규칙]
        1. "title": 오늘 하루를 요약하는 제목 (15자 이내)
        2. "one_line_summary": 핵심 감정이나 사건을 요약한 한 줄
        3. "three_line_summary": 시간 흐름이나 주요 사건을 3줄로 나눈 배열
        4. "ai_emoji": 상황에 맞는 객관적인 이모지 1개
        5. "ai_score": 객관적으로 평가한 점수 (1~100 숫자)
        6. "ai_comment": 유저의 점수와 비교하여 위로와 격려를 담은 1~2줄 코멘트
        7. "gratitude": 감사한 일 1개 (없으면 null)
        8. "reflection": 반성할 일 1개 (없으면 null)
        9. "reminders": 내일 할 일이나 까먹은 것들의 배열 (없으면 [])
        
        [일기 내용]
        ${content}
        `;

        const result = await model.generateContent(prompt);
        const aiData = JSON.parse(result.response.text());

        await client.query('BEGIN');

        const diaryDate = new Date().toISOString().split('T')[0]; 
        
        // PostgreSQL은 RETURNING id를 통해 방금 INSERT된 row의 id를 바로 가져올 수 있습니다.
        const diaryResult = await client.query(
            'INSERT INTO diaries (user_id, diary_date, content, user_emoji, user_score, is_locked) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, diaryDate, content, user_emoji, user_score, is_locked]
        );

        const newDiaryId = diaryResult.rows[0].id;

        await client.query(
            'INSERT INTO diary_ai_summaries (diary_id, title, one_line_summary, three_line_summary, ai_emoji, ai_score, ai_comment, gratitude, reflection, reminders) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [
                newDiaryId,
                aiData.title,
                aiData.one_line_summary,
                JSON.stringify(aiData.three_line_summary),
                aiData.ai_emoji,
                aiData.ai_score,
                aiData.ai_comment,
                aiData.gratitude || null,
                aiData.reflection || null,
                JSON.stringify(aiData.reminders || [])
            ]
        );

        await client.query('COMMIT');
        
        res.status(201).json({ 
            message: "일기가 성공적으로 분석 및 저장되었습니다.", 
            diary_id: newDiaryId,
            ai_result: aiData 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Diary Creation Error:", error);
        res.status(500).json({ error: "일기 분석 및 저장 중 오류가 발생했습니다." });
    } finally {
        client.release();
    }
};