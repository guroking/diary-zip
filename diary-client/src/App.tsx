import React, { useState, useEffect } from 'react';

// --- 타입 정의 ---
interface SummaryData {
  title: string;
  one_line_summary: string;
  three_line_summary: string[];
  ai_emoji: string;
  ai_score: number;
  ai_comment: string;
  gratitude: string | null;
  reflection: string | null;
  reminders: string[];
}

interface CalendarMonthData {
  diary_date: string;
  is_locked: number;
  ai_emoji: string;
  ai_score: number;
}

interface InsightData {
  averageScore: number;
  topEmoji: string;
  totalDiaries: number;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState<'home' | 'write' | 'calendar' | 'insight'>('write');

  // 인증 상태
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // 일기 작성 상태
  const [content, setContent] = useState('');
  const [userEmoji, setUserEmoji] = useState('😐');
  const [userScore, setUserScore] = useState<number>(50);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryData | null>(null);

  // 달력 및 통계 상태
  const [monthData, setMonthData] = useState<CalendarMonthData[]>([]);
  const [insightData, setInsightData] = useState<InsightData | null>(null);

  const EMOJI_LIST = ['😆', '😃', '😐', '😢', '😡', '😱'];

  // --- API 호출 함수 ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    try {
     const res = await fetch(`https://diary-server-z721.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: loginId, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isLoginMode) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthMessage('');
      } else {
        setAuthMessage('회원가입 완료! 로그인해주세요.');
        setIsLoginMode(true);
        setLoginId('');
        setPassword('');
      }
    } catch (err: any) {
      setAuthMessage(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setActiveTab('write');
    setResult(null);
  };

  const handleDiarySubmit = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/diaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, user_emoji: userEmoji, user_score: userScore, is_locked: isLocked })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      setResult(resData.ai_result);
      setContent('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 달력 데이터 불러오기
  useEffect(() => {
    if (activeTab === 'calendar' && token) {
      const fetchCalendar = async () => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        try {
          const res = await fetch(`http://localhost:3000/api/calendar/month?year=${year}&month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setMonthData(data.data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchCalendar();
    }
  }, [activeTab, token]);

  // 인사이트 데이터 불러오기
  useEffect(() => {
    if (activeTab === 'insight' && token) {
      const fetchInsight = async () => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        try {
          const res = await fetch(`http://localhost:3000/api/calendar/insight?year=${year}&month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setInsightData(data.data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchInsight();
    }
  }, [activeTab, token]);

  // --- Toss 스타일 디자인 시스템 ---
  const colors = {
    bg: '#f2f4f6',
    white: '#ffffff',
    primary: '#3182f6',
    textMain: '#191f28',
    textSub: '#8b95a1',
    inputBg: '#f9fafb',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    borderRadius: '24px',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  };

  return (
    <div style={{
      backgroundColor: colors.bg,
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", Pretendard, Roboto, sans-serif',
      color: colors.textMain
    }}>
      {/* 글로벌 스타일 (웹폰트 및 슬라이더 스타일링) */}
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type=range] {
          -webkit-appearance: none; width: 100%; background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; height: 24px; width: 24px;
          border-radius: 50%; background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer; margin-top: -8px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%; height: 8px; cursor: pointer; background: #e5e8eb; border-radius: 4px;
        }
        input:focus, textarea:focus { outline: none; border-color: ${colors.primary}; }
        .emoji-btn { transition: transform 0.2s ease; }
        .emoji-btn:active { transform: scale(0.9); }
      `}</style>

      {/* 모바일 뷰어 컨테이너 */}
      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', paddingBottom: '90px' }}>

        {/* ==========================================
            화면 1: 로그인 / 회원가입 (비로그인 상태)
        ========================================== */}
        {!token ? (
          <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              반가워요! <br /> Diary.zip 입니다.
            </h1>
            <p style={{ color: colors.textSub, marginBottom: '40px' }}>
              나만의 AI 다이어리를 시작해보세요.
            </p>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text" placeholder="아이디를 입력해주세요" value={loginId}
                onChange={e => setLoginId(e.target.value)} required
                style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid #e5e8eb', backgroundColor: colors.inputBg, fontSize: '16px', color: '#191f28' }}
              />
              <input
                type="password" placeholder="비밀번호를 입력해주세요" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid #e5e8eb', backgroundColor: colors.inputBg, fontSize: '16px', color: '#191f28' }}
              />
              <button type="submit" style={{
                padding: '18px', background: colors.primary, color: '#fff', border: 'none',
                borderRadius: '16px', fontSize: '16px', fontWeight: 700, marginTop: '8px', cursor: 'pointer'
              }}>
                {isLoginMode ? '시작하기' : '가입하기'}
              </button>
            </form>

            <p style={{ color: '#f04452', textAlign: 'center', marginTop: '16px', fontWeight: 500 }}>{authMessage}</p>

            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setAuthMessage(''); setLoginId(''); setPassword(''); }}
              style={{ background: 'none', border: 'none', color: colors.textSub, cursor: 'pointer', marginTop: '20px', fontSize: '15px' }}>
              {isLoginMode ? '계정이 없으신가요? 간편 가입하기' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        ) : (

          /* ==========================================
              화면 2: 메인 앱 (로그인 상태)
          ========================================== */
          <>
            {/* 상단 헤더 */}
            <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: colors.bg, zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Diary.zip 🗂️️</h2>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: colors.textSub, fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
                로그아웃
              </button>
            </div>

            <div style={{ padding: '0 24px' }}>
              {/* 탭 1: 홈 */}
              {activeTab === 'home' && (
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>좋은 하루예요 👋</h3>
                  <p style={{ color: colors.textSub, margin: 0, lineHeight: 1.5 }}>
                    오늘 하루는 어땠나요?<br />작성 탭에서 오늘의 감정을 기록해보세요.
                  </p>
                </div>
              )}

              {/* 탭 2: 일기 작성 */}
              {activeTab === 'write' && (
                <div>
                  <div style={cardStyle}>
                    <p style={{ margin: '0 0 16px 0', fontWeight: 700, fontSize: '18px' }}>오늘의 기분은 어땠나요?</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem' }}>
                      {EMOJI_LIST.map(emoji => (
                        <span key={emoji} className="emoji-btn" onClick={() => setUserEmoji(emoji)}
                          style={{ cursor: 'pointer', opacity: userEmoji === emoji ? 1 : 0.2, filter: userEmoji === emoji ? 'none' : 'grayscale(100%)' }}>
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <p style={{ margin: '0 0 20px 0', fontWeight: 700, fontSize: '18px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>오늘 하루 점수</span>
                      <span style={{ color: colors.primary }}>{userScore}점</span>
                    </p>
                    <input type="range" min="1" max="100" value={userScore} onChange={(e) => setUserScore(Number(e.target.value))} />
                  </div>

                  <div style={{ ...cardStyle, padding: '16px 24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} style={{ width: '20px', height: '20px', marginRight: '12px', accentColor: colors.primary }} />
                      {isLocked ? '🔒 나만 보는 비밀 일기로 저장할게요' : '🔓 달력에 기분이 공개돼요'}
                    </label>
                  </div>

                  <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                    <textarea
                      value={content} onChange={(e) => setContent(e.target.value)} placeholder="오늘 하루 있었던 일을 편하게 적어주세요."
                      style={{ width: '100%', height: '200px', padding: '24px', border: 'none', fontSize: '16px', lineHeight: 1.6, resize: 'none' }} disabled={isLoading}
                    />
                  </div>

                  <button onClick={handleDiarySubmit} disabled={isLoading || !content.trim()} style={{
                    width: '100%', padding: '18px', background: isLoading ? '#a9cbf9' : colors.primary, color: 'white',
                    border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(49, 130, 246, 0.3)'
                  }}>
                    {isLoading ? 'AI가 다이어리를 분석하고 있어요...' : '일기 저장하고 AI 분석 받기'}
                  </button>

                  {/* 분석 결과 카드 */}
                  {result && (
                    <div style={{ ...cardStyle, marginTop: '24px', border: `2px solid ${colors.primary}`, backgroundColor: '#f9fbff' }}>
                      <h3 style={{ margin: '0 0 8px 0', color: colors.primary }}>{result.title}</h3>
                      <p style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: 600 }}>{result.one_line_summary}</p>

                      <div style={{ backgroundColor: '#eaf2ff', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>🤖 AI 코멘트 {result.ai_emoji} (AI 평가: {result.ai_score}점)</p>
                        <p style={{ margin: 0, lineHeight: 1.5, color: '#333d4b' }}>{result.ai_comment}</p>
                      </div>

                      <h4 style={{ margin: '0 0 12px 0' }}>📝 핵심 3줄 요약</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#4e5968', lineHeight: 1.6 }}>
                        {result.three_line_summary.map((line, idx) => <li key={idx}>{line}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 탭 3: 달력 뷰 */}
              {activeTab === 'calendar' && (
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>이번 달 감정 모아보기 📅</h3>
                  {monthData.length === 0 ? <p style={{ color: colors.textSub, textAlign: 'center', padding: '40px 0' }}>작성된 일기가 없어요.</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                      {monthData.map((day, idx) => (
                        <div key={idx} style={{ padding: '12px 0', textAlign: 'center', backgroundColor: colors.bg, borderRadius: '16px' }}>
                          <div style={{ fontSize: '12px', color: colors.textSub, marginBottom: '4px', fontWeight: 600 }}>
                            {new Date(day.diary_date).getDate()}일
                          </div>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                            {day.is_locked ? '🔒' : day.ai_emoji}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>
                            {day.ai_score}점
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 탭 4: 인사이트 */}
              {activeTab === 'insight' && (
                <div>
                  <h3 style={{ margin: '0 0 16px 4px', fontSize: '20px' }}>이번 달 나의 감정 통계</h3>
                  {insightData && insightData.totalDiaries > 0 ? (
                    <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 24px' }}>
                      <p style={{ fontSize: '16px', margin: '0 0 32px 0', color: colors.textSub }}>
                        이번 달은 총 <strong style={{ color: colors.textMain }}>{insightData.totalDiaries}개</strong>의 기록이 모였어요.
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{insightData.topEmoji}</div>
                          <div style={{ fontWeight: 700, color: colors.textMain }}>주로 느낀 감정</div>
                        </div>

                        <div style={{ width: '1px', height: '60px', backgroundColor: '#e5e8eb' }}></div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '36px', fontWeight: 800, color: colors.primary, marginBottom: '12px' }}>
                            {insightData.averageScore}<span style={{ fontSize: '20px' }}>점</span>
                          </div>
                          <div style={{ fontWeight: 700, color: colors.textMain }}>평균 AI 점수</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px', color: colors.textSub }}>
                      아직 작성된 일기가 없어요.<br />첫 일기를 작성하면 통계를 분석해드려요.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 하단 탭 네비게이션 */}
            <div style={{
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: '480px', backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)', borderTop: '1px solid #f2f4f6',
              display: 'flex', justifyContent: 'space-around', padding: '12px 0 24px 0', zIndex: 100
            }}>
              {[
                { id: 'home', icon: '🏠', label: '홈' },
                { id: 'write', icon: '✍️', label: '작성' },
                { id: 'calendar', icon: '📅', label: '달력' },
                { id: 'insight', icon: '📊', label: '통계' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '4px', width: '60px'
                }}>
                  <span style={{ fontSize: '20px', filter: activeTab === tab.id ? 'none' : 'grayscale(100%) opacity(0.5)' }}>{tab.icon}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? colors.textMain : colors.textSub
                  }}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;