const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); // DB 연결 파일 경로 (맞게 설정되어 있다고 가정)
require('dotenv').config();

const app = express();

// JSON 데이터를 받기 위한 필수 설정 및 CORS 허용
app.use(cors());
app.use(express.json());

// 1. 서버가 켜질 때 자동으로 다이어리 테이블을 만드는 함수
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS diaries (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ 다이어리 테이블 생성 완료 또는 이미 존재함');
    } catch (err) {
        console.error('❌ 테이블 생성 실패:', err);
    }
}
initDB();

// === 다이어리 API 시작 ===

// 2. 다이어리 작성(저장) API
app.post('/api/diaries', async (req, res) => {
    try {
        const { title, content } = req.body;
        
        // 데이터베이스에 제목과 내용을 저장합니다.
        const result = await pool.query(
            'INSERT INTO diaries (title, content) VALUES ($1, $2) RETURNING *',
            [title, content]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('❌ 다이어리 작성 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

// 3. 다이어리 목록 조회 API
app.get('/api/diaries', async (req, res) => {
    try {
        // 데이터베이스에서 다이어리 목록을 최신순(내림차순)으로 가져옵니다.
        const result = await pool.query('SELECT * FROM diaries ORDER BY created_at DESC');
        
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        console.error('❌ 다이어리 조회 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

// === 다이어리 API 끝 ===

// 4. 서버 구동
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 서버 구동 완료: http://localhost:${PORT}`);
});