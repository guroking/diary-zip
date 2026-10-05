const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./config/db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 🔒 암호화 유틸리티 설정 ---
// .env에 ENCRYPTION_KEY가 없다면 임시 32바이트 키를 생성합니다 (실무에서는 .env에 고정값 설정 권장)
const SECRET_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text; // 암호화되지 않은 기존 데이터 호환
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = textParts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return "[복호화 실패]";
    }
}

// --- 🚨 브루트포스(연속 실패) 방어 메모리 캐시 ---
// 실무에서는 Redis를 쓰지만, 단일 서버 환경이므로 메모리 객체로 간단하게 방어선 구축
const failedAttempts = {}; // { userId: { count: 숫자, lockUntil: 시간 } }

function checkBruteForce(userId) {
    const record = failedAttempts[userId];
    if (!record) return { isLocked: false };
    
    if (record.lockUntil && Date.now() < record.lockUntil) {
        const remainingSec = Math.ceil((record.lockUntil - Date.now()) / 1000);
        return { isLocked: true, remainingSec };
    }
    if (record.lockUntil && Date.now() >= record.lockUntil) {
        delete failedAttempts[userId]; // 시간 지남 해제
    }
    return { isLocked: false };
}

function recordFailedAttempt(userId) {
    if (!failedAttempts[userId]) {
        failedAttempts[userId] = { count: 1 };
    } else {
        failedAttempts[userId].count += 1;
    }

    // 5회 이상 틀리면 3분(180초) 동안 잠금
    if (failedAttempts[userId].count >= 5) {
        failedAttempts[userId].lockUntil = Date.now() + 3 * 60 * 1000;
    }
}

function clearFailedAttempt(userId) {
    delete failedAttempts[userId];
}

// 1. 데이터베이스 테이블 초기화 (보안 실패 추적 컬럼 등)
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                login_id VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                secondary_password VARCHAR(255),
                require_on_login BOOLEAN DEFAULT false,
                require_on_diary BOOLEAN DEFAULT false
            );
        `);
        
        try { await pool.query('ALTER TABLE users ADD COLUMN secondary_password VARCHAR(255);'); } catch (e) {}
        try { await pool.query('ALTER TABLE users ADD COLUMN require_on_login BOOLEAN DEFAULT false;'); } catch (e) {}
        try { await pool.query('ALTER TABLE users ADD COLUMN require_on_diary BOOLEAN DEFAULT false;'); } catch (e) {}

        await pool.query(`
            CREATE TABLE IF NOT EXISTS diaries (
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
        console.log('✅ 데이터 암호화 및 보안 방어 로직이 포함된 DB 세팅 완료');
    } catch (err) {
        console.error('❌ 테이블 생성 실패:', err);
    }
}
initDB();

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: '인증이 필요합니다.' });
    req.userId = authHeader.split(' ')[1];
    next();
};

// === [API 1] 인증 및 로그인 ===
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
        
        const user = result.rows[0];
        
        // 로그인 시점 브루트포스 체크
        const lockStatus = checkBruteForce(user.id);
        if (lockStatus.isLocked) {
            return res.status(429).json({ error: `보안상 이유로 계정이 잠겼습니다. ${lockStatus.remainingSec}초 후에 다시 시도해주세요.` });
        }

        res.json({ 
            token: user.id.toString(),
            settings: {
                secondary_password: user.secondary_password,
                require_on_login: user.require_on_login,
                require_on_diary: user.require_on_diary
            }
        });
    } catch (err) {
        res.status(500).json({ error: '서버 에러' });
    }
});

// === [API 2] 2차 보안 설정 및 2차 비밀번호 검증 엔드포인트 (방어 로직 포함) ===
app.post('/api/settings', authenticate, async (req, res) => {
    try {
        const { secondary_password, require_on_login, require_on_diary } = req.body;
        await pool.query(
            'UPDATE users SET secondary_password = $1, require_on_login = $2, require_on_diary = $3 WHERE id = $4',
            [secondary_password, require_on_login, require_on_diary, req.userId]
        );
        res.json({ message: '설정이 성공적으로 저장되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: '설정 저장 에러' });
    }
});

// 2차 비밀번호 검증 전용 엔드포인트 (연속 실패 시 3분 락 적용)
app.post('/api/auth/verify-lock', authenticate, async (req, res) => {
    const lockStatus = checkBruteForce(req.userId);
    if (lockStatus.isLocked) {
        return res.status(429).json({ error: `비밀번호 입력 시도가 너무 많아 일시 차단되었습니다. (${lockStatus.remainingSec}초 남음)` });
    }

    try {
        const { secondary_password } = req.body;
        const result = await pool.query('SELECT secondary_password FROM users WHERE id = $1', [req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });

        const dbPassword = result.rows[0].secondary_password;
        if (dbPassword === secondary_password) {
            clearFailedAttempt(req.userId); // 성공 시 카운트 초기화
            return res.json({ success: true, message: '잠금 해제 성공' });
        } else {
            recordFailedAttempt(req.userId); // 실패 시 누적
            const currentRecord = failedAttempts[req.userId] || { count: 1 };
            const remainingTries = Math.max(0, 5 - currentRecord.count);
            return res.status(401).json({ 
                error: `비밀번호가 일치하지 않습니다. (실패: ${currentRecord.count}/5회, 남은 기회: ${remainingTries}회)` 
            });
        }
    } catch (err) {
        res.status(500).json({ error: '검증 서버 에러' });
    }
});

// === [API 3] 다이어리 작성 (본문 AES-256 양방향 암호화 저장) ===
app.post('/api/diaries', authenticate, async (req, res) => {
    try {
        const { content, user_emoji, user_score, is_locked } = req.body;
        
        // 데이터베이스 저장 전 본문 암호화 수행
        const encryptedContent = encrypt(content);

        const mockAiResult = {
            title: "오늘 하루도 수고하셨어요!",
            one_line_summary: "솔직한 감정을 남겨주셔서 감사합니다.",
            three_line_summary: [
                "기록하신 감정이 잘 전달되었어요.",
                "이런 기록들이 모여 나만의 소중한 책이 될 거예요.",
                "내일은 오늘보다 더 행복한 하루가 될 겁니다."
            ],
            ai_emoji: user_emoji,
            ai_score: user_score,
            ai_comment: "다이어리에 적어주신 감정이 너무 잘 느껴져요. 푹 쉬고 내일도 파이팅!",
            gratitude: "하루를 무사히 마친 것",
            reflection: "조금 아쉬웠던 점 훌훌 털기",
            reminders: ["물 많이 마시기", "일찍 잠자리에 들기"]
        };

        await pool.query(
            'INSERT INTO diaries (user_id, content, user_emoji, user_score, is_locked, ai_emoji, ai_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.userId, encryptedContent, user_emoji, user_score, is_locked, user_emoji, user_score]
        );

        res.status(201).json({ ai_result: mockAiResult });
    } catch (err) {
        res.status(500).json({ error: '일기 저장 실패' });
    }
});

// === [API 4] 달력 조회 (비공개 일기 복호화 처리) ===
app.get('/api/calendar/month', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, diary_date, content, is_locked, ai_emoji, ai_score FROM diaries WHERE user_id = $1 ORDER BY diary_date ASC',
            [req.userId]
        );
        
        // 읽어올 때 복호화 처리
        const decryptedRows = result.rows.map(row => ({
            ...row,
            content: decrypt(row.content)
        }));

        res.json({ data: decryptedRows });
    } catch (err) {
        res.status(500).json({ error: '달력 조회 에러' });
    }
});

// === [API 5] 통계 조회 ===
app.get('/api/calendar/insight', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT ai_emoji, ai_score FROM diaries WHERE user_id = $1', [req.userId]);
        const totalDiaries = result.rows.length;
        if (totalDiaries === 0) return res.json({ data: { totalDiaries: 0, averageScore: 0, topEmoji: '🤔' } });

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
    console.log(`🚀 보안 강화된 서버 구동 완료: http://localhost:${PORT}`);
});