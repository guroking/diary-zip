const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); // 데이터베이스 연결 (기존 세팅 유지)
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. 데이터베이스 테이블 초기화 (프론트엔드 규격에 맞게 자동 재생성)
async function initDB() {
    try {
        // 유저 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                login_id VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
        // 기존 낡은 구조의 다이어리 테이블을 삭제하고 프론트엔드 규격에 맞춰 새로 생성
        await pool.query(`DROP TABLE IF EXISTS diaries;`);
        await pool.query(`
            CREATE TABLE diaries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                user_emoji VARCHAR(50),
                user_score INTEGER,
                is_locked BOOLEAN DEFAULT false,
                ai_emoji VARCHAR(50),
                ai_score INTEGER,
                diary_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ 프론트엔드 규격에 맞는 회원 및 다이어리 테이블 세팅 완료');
    } catch (err) {
        console.error('❌ 테이블 생성 실패:', err);
    }
}
initDB();

// 2. 인증(토큰) 확인 미들웨어
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: '인증이 필요합니다.' });
    // 임시로 user_id 자체를 토큰으로 사용합니다.
    const token = authHeader.split(' ')[1];
    req.userId = token; 
    next();
};

// === [API 1] 회원가입 및 로그인 ===
app.post('/api/auth/register', async (req, res) => {
    try {
        const { login_id, password } = req.body;
        await pool.query('INSERT INTO users (login_id, password) VALUES ($1, $2)', [login_id, password]);
        res.status(201).json({ message: '가입 성공' });
    } catch (err) {
        res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { login_id, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE login_id = $1 AND password = $2', [login_id, password]);
        if (result.rows.length === 0) return res.status(401).json({ error: '아이디나 비밀번호가 틀립니다.' });
        
        // 프론트엔드의 localStorage에 저장될 토큰을 발급합니다.
        res.json({ token: result.rows[0].id.toString() });
    } catch (err) {
        res.status(500).json({ error: '서버 에러' });
    }
});

// === [API 2] 다이어리 작성 (AI 결과 반환) ===
app.post('/api/diaries', authenticate, async (req, res) => {
    try {
        const { content, user_emoji, user_score, is_locked } = req.body;
        
        // AI 모델이 연동되기 전까지 앱이 멈추지 않도록 임시 AI 분석 데이터를 반환합니다.
        const ai_emoji = user_emoji; 
        const ai_score = user_score;
        const mockAiResult = {
            title: "오늘 하루도 수고하셨어요!",
            one_line_summary: "솔직한 감정을 남겨주셔서 감사합니다.",
            three_line_summary: [
                "기록하신 감정이 잘 전달되었어요.",
                "이런 기록들이 모여 나만의 소중한 책이 될 거예요.",
                "내일은 오늘보다 더 행복한 하루가 될 겁니다."
            ],
            ai_emoji: ai_emoji,
            ai_score: ai_score,
            ai_comment: "다이어리에 적어주신 감정이 너무 잘 느껴져요. 푹 쉬고 내일도 파이팅!",
            gratitude: "하루를 무사히 마친 것",
            reflection: "조금 아쉬웠던 점 훌훌 털기",
            reminders: ["물 많이 마시기", "일찍 잠자리에 들기"]
        };

        await pool.query(
            'INSERT INTO diaries (user_id, content, user_emoji, user_score, is_locked, ai_emoji, ai_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.userId, content, user_emoji, user_score, is_locked, ai_emoji, ai_score]
        );

        res.status(201).json({ ai_result: mockAiResult });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '일기 저장 실패' });
    }
});

// === [API 3] 달력 조회 ===
app.get('/api/calendar/month', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT diary_date, is_locked, ai_emoji, ai_score FROM diaries WHERE user_id = $1 ORDER BY diary_date ASC',
            [req.userId]
        );
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: '달력 조회 에러' });
    }
});

// === [API 4] 이번 달 통계 조회 ===
app.get('/api/calendar/insight', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT ai_emoji, ai_score FROM diaries WHERE user_id = $1', [req.userId]);
        
        const totalDiaries = result.rows.length;
        if (totalDiaries === 0) {
            return res.json({ data: { totalDiaries: 0, averageScore: 0, topEmoji: '🤔' } });
        }

        const averageScore = Math.round(result.rows.reduce((sum, row) => sum + row.ai_score, 0) / totalDiaries);
        
        const emojiCounts = {};
        result.rows.forEach(row => {
            emojiCounts[row.ai_emoji] = (emojiCounts[row.ai_emoji] || 0) + 1;
        });
        const topEmoji = Object.keys(emojiCounts).reduce((a, b) => emojiCounts[a] > emojiCounts[b] ? a : b);

        res.json({ data: { averageScore, topEmoji, totalDiaries } });
    } catch (err) {
        res.status(500).json({ error: '통계 조회 에러' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 서버 구동 완료: http://localhost:${PORT}`);
});