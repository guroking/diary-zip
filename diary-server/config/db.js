const { Pool } = require('pg');
require('dotenv').config();

// Supabase에서 제공하는 Connection String(DATABASE_URL)을 사용합니다.
// ⚠️ 이 DB는 billiards-record 프로젝트와 공유합니다.
//    두 서비스가 커넥션 한도를 나눠 쓰므로 풀 크기를 보수적으로 제한합니다.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // 클라우드 DB 접속 시 SSL 인증서 우회
    },
    max: Number(process.env.DB_POOL_MAX) || 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// 유휴 커넥션 오류로 프로세스가 죽지 않도록 처리
pool.on('error', (err) => {
    console.error('⚠️ 유휴 DB 커넥션 오류:', err.message);
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
