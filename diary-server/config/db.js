const { Pool } = require('pg');
require('dotenv').config();

// Supabase에서 제공하는 Connection String(DATABASE_URL)을 사용합니다.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // 클라우드 DB 접속 시 SSL 인증서 우회
    }
});

// 연결 테스트
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Supabase 데이터베이스 연결 실패:', err.stack);
    } else {
        console.log('✅ Supabase 데이터베이스 연결 성공!', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    execute: (text, params) => pool.query(text, params) // 기존 mysql2의 execute 호환용
};