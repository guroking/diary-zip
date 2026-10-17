// 간단한 연결 점검 스크립트: node test.js [API_BASE]
// 예) node test.js https://diary-server-z721.onrender.com
const base = (process.argv[2] || process.env.API_BASE || 'http://localhost:5000').replace(/\/$/, '');

(async () => {
    try {
        const res = await fetch(`${base}/health`);
        const data = await res.json();
        console.log('HTTP', res.status);
        console.log(JSON.stringify(data, null, 2));
        if (!data.ok) throw new Error('서버가 정상 응답하지 않았습니다.');
        if (!data.ai_configured) {
            console.log('\n⚠️ OPENAI_API_KEY가 서버에 설정되어 있지 않습니다. Render Web Service의 Environment를 확인하세요.');
            process.exitCode = 2;
        } else if (data.ai_last_error && !data.ai_last_success) {
            console.log('\n⚠️ 최근 AI 호출이 실패했습니다. 위 ai_last_error의 status/code를 확인하세요.');
            process.exitCode = 3;
        } else {
            console.log('\n✅ 서버 정상. 일기를 하나 저장하면 ai_last_success에 모델명이 기록됩니다.');
        }
    } catch (err) {
        console.error('❌ 점검 실패:', err.message);
        process.exitCode = 1;
    }
})();
