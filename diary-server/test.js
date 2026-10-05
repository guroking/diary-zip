async function runTest() {
    console.log('📝 1. 다이어리 작성(POST) 테스트를 시작합니다...');
    try {
        const postResponse = await fetch('https://diary-server-z721.onrender.com/api/diaries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '첫 번째 테스트 일기',
                content: '백엔드 서버와 Render 데이터베이스가 완벽하게 연결되었습니다!'
            })
        });
        const postData = await postResponse.json();
        console.log('✅ 작성 완료 결과:\n', postData);

        console.log('\n📖 2. 다이어리 목록 조회(GET) 테스트를 시작합니다...');
        const getResponse = await fetch('https://diary-server-z721.onrender.com/api/diaries');
        const getData = await getResponse.json();
        console.log('✅ 조회 완료 결과:\n', getData);
        
    } catch (err) {
        console.error('❌ 테스트 중 에러 발생:', err);
    }
}

runTest();