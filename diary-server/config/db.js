const { Pool } = require('pg');
require('dotenv').config();

// DATABASE_URL(PostgreSQL 연결 문자열)을 사용합니다.
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

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    end: () => pool.end()
};
