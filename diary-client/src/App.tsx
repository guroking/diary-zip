import React, { useState, useEffect, useCallback, useMemo } from 'react';

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
  source?: 'ai' | 'fallback';
}

interface CalendarEntry {
  id: number;
  date_key: string;
  is_locked: boolean;
  ai_emoji: string;
  ai_score: number;
}

interface DiaryDetail {
  id: number;
  date_key: string;
  time_label: string;
  content: string;
  user_emoji: string;
  user_score: number;
  is_locked: boolean;
  ai_emoji: string;
  ai_score: number;
  ai_result: SummaryData | null;
}

interface InsightData {
  averageScore: number;
  averageUserScore: number;
  topEmoji: string;
  totalDiaries: number;
  emojiCounts: { emoji: string; count: number }[];
}

interface UserSettings {
  has_secondary_password?: boolean;
  require_on_login?: boolean;
  require_on_diary?: boolean;
}

type Tab = 'write' | 'calendar' | 'insight' | 'settings';
type ThemeMode = 'system' | 'light' | 'dark';

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API_BASE = 'https://diary-zip-api.onrender.com';
const EMOJI_LIST = ['😆', '😃', '😐', '😢', '😡', '😱'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DRAFT_KEY = 'diary_draft';
const MAX_LENGTH = 5000;

const pad = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${w})`;
};
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
const sanitizeSettings = (raw: unknown): UserSettings => {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    has_secondary_password: Boolean(s.has_secondary_password),
    require_on_login: Boolean(s.require_on_login),
    require_on_diary: Boolean(s.require_on_diary),
  };
};
const readToken = (): string | null => {
  const t = localStorage.getItem('token');
  if (t && t.split('.').length === 3) return t;
  localStorage.removeItem('token');
  localStorage.removeItem('settings');
  return null;
};
const readSettings = (): UserSettings => {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem('settings') || '{}'));
  } catch {
    return {};
  }
};
const unlockHeaders = (t: string | null): Record<string, string> => (t ? { 'X-Unlock-Token': t } : {});

const colors = {
  bg: 'var(--bg)', card: 'var(--card)', primary: 'var(--primary)', primarySoft: 'var(--primary-soft)',
  primaryDisabled: 'var(--primary-disabled)', textMain: 'var(--text)', textBody: 'var(--text-body)',
  textSub: 'var(--text-sub)', inputBg: 'var(--input-bg)', border: 'var(--border)', danger: 'var(--danger)',
};
const cardStyle: React.CSSProperties = { backgroundColor: colors.card, borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: 'var(--shadow)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, backgroundColor: colors.inputBg, fontSize: '16px', color: colors.textMain };
const primaryBtn: React.CSSProperties = { width: '100%', padding: '16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { background: 'none', border: 'none', color: colors.textSub, cursor: 'pointer', fontWeight: 600, fontSize: '14px' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 500, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' };
const sheetStyle: React.CSSProperties = { width: '100%', maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto', backgroundColor: colors.card, color: colors.textMain, borderRadius: '24px 24px 0 0', padding: '24px 24px 40px' };
const checkboxStyle: React.CSSProperties = { width: '20px', height: '20px', marginRight: '12px', accentColor: 'var(--primary)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: 600 };

function AnalysisCard({ data }: { data: SummaryData }) {
  const lines = Array.isArray(data.three_line_summary) ? data.three_line_summary : [];
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  return (
    <div>
      <h3 style={{ margin: '0 0 8px 0', color: colors.primary }}>{data.title}</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: 600 }}>{data.one_line_summary}</p>
      <div style={{ backgroundColor: colors.primarySoft, padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>🤖 AI 코멘트 {data.ai_emoji} (AI 평가: {data.ai_score}점)</p>
        <p style={{ margin: 0, lineHeight: 1.6, color: colors.textBody }}>{data.ai_comment}</p>
      </div>
      {lines.length > 0 && (
        <>
          <h4 style={{ margin: '0 0 12px 0' }}>📝 핵심 3줄 요약</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: colors.textBody, lineHeight: 1.7 }}>
            {lines.map((line, idx) => <li key={idx}>{line}</li>)}
          </ol>
        </>
      )}
      {(data.gratitude || data.reflection || reminders.length > 0) && (
        <div style={{ marginTop: '20px', display: 'grid', gap: '10px' }}>
          {data.gratitude && <div style={{ backgroundColor: colors.inputBg, borderRadius: '12px', padding: '12px 16px' }}><strong>🙏 감사한 일</strong><p style={{ margin: '4px 0 0', color: colors.textBody }}>{data.gratitude}</p></div>}
          {data.reflection && <div style={{ backgroundColor: colors.inputBg, borderRadius: '12px', padding: '12px 16px' }}><strong>🪞 돌아볼 점</strong><p style={{ margin: '4px 0 0', color: colors.textBody }}>{data.reflection}</p></div>}
          {reminders.length > 0 && <div style={{ backgroundColor: colors.inputBg, borderRadius: '12px', padding: '12px 16px' }}><strong>⏰ 잊지 말 것</strong><ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: colors.textBody, lineHeight: 1.6 }}>{reminders.map((r, idx) => <li key={idx}>{r}</li>)}</ul></div>}
        </div>
      )}
      {data.source === 'fallback' && <p style={{ margin: '16px 0 0', fontSize: '12px', color: colors.textSub }}>※ AI 분석 서버에 연결하지 못해 일기 내용을 바탕으로 간단히 요약했어요.</p>}
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(readToken);
  const [settings, setSettings] = useState<UserSettings>(readSettings);
  const [activeTab, setActiveTab] = useState<Tab>('write');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = useState(() => {
    const s = readSettings();
    return !(s.require_on_login && s.has_secondary_password);
  });
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [pendingDiaryId, setPendingDiaryId] = useState<number | null>(null);
  const [lockInput, setLockInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [lockLoading, setLockLoading] = useState(false);
  const [secCurrent, setSecCurrent] = useState('');
  const [secNew, setSecNew] = useState('');
  const [secRemove, setSecRemove] = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [content, setContent] = useState(() => localStorage.getItem(DRAFT_KEY) || '');
  const [userEmoji, setUserEmoji] = useState('😐');
  const [userScore, setUserScore] = useState<number>(50);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryData | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [monthData, setMonthData] = useState<CalendarEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [detail, setDetail] = useState<DiaryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dayEntries, setDayEntries] = useState<CalendarEntry[] | null>(null);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  useEffect(() => {
    const timer = setTimeout(() => { if (content) localStorage.setItem(DRAFT_KEY, content); else localStorage.removeItem(DRAFT_KEY); }, 400);
    return () => clearTimeout(timer);
  }, [content]);
  const clearSession = useCallback(() => {
    localStorage.removeItem('token'); localStorage.removeItem('settings'); setToken(null); setSettings({}); setActiveTab('write'); setResult(null); setDetail(null); setDayEntries(null); setPendingDiaryId(null); setUnlockToken(null); setIsAppUnlocked(true); setLockInput(''); setLockError(''); setSecCurrent(''); setSecNew(''); setSecRemove(false);
  }, []);
  const applySettings = useCallback((raw: unknown) => { const next = sanitizeSettings(raw); setSettings(next); localStorage.setItem('settings', JSON.stringify(next)); return next; }, []);
  const authFetch = useCallback(async (path: string, init: RequestInit = {}, extraHeaders: Record<string, string> = {}) => {
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extraHeaders } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { if (res.status === 401 && data.code === 'AUTH_REQUIRED') clearSession(); throw new ApiError(data.error || data.message || '요청 처리 중 오류가 발생했습니다.', res.status, data.code); }
    return data;
  }, [token, clearSession]);
  useEffect(() => { if (!token) return; authFetch('/api/settings').then(d => { if (d.settings) applySettings(d.settings); }).catch(() => {}); }, [token, authFetch, applySettings]);
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register'; setAuthLoading(true);
    try { const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login_id: loginId, password }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.'); if (isLoginMode) { localStorage.setItem('token', data.token); const next = applySettings(data.settings); setToken(data.token); setAuthMessage(''); setPassword(''); setIsAppUnlocked(!(next.require_on_login && next.has_secondary_password)); } else { setAuthMessage('회원가입 완료! 로그인해주세요.'); setIsLoginMode(true); setLoginId(''); setPassword(''); } } catch (err) { setAuthMessage(errorMessage(err)); } finally { setAuthLoading(false); }
  };
  const handleLogout = () => { clearSession(); setContent(''); localStorage.removeItem(DRAFT_KEY); };
  const handleSaveSettings = async () => {
    if (secSaving) return; if (secNew && secNew.length < 4) { alert('2차 비밀번호는 4자 이상으로 설정해주세요.'); return; } const willHave = secRemove ? false : Boolean(settings.has_secondary_password || secNew); if (!willHave && (settings.require_on_login || settings.require_on_diary)) { alert('잠금 옵션을 사용하려면 2차 비밀번호를 먼저 설정해주세요.'); return; } if (settings.has_secondary_password && !secCurrent) { alert('설정을 바꾸려면 현재 2차 비밀번호를 입력해주세요.'); return; } setSecSaving(true);
    try { const data = await authFetch('/api/settings', { method: 'POST', body: JSON.stringify({ require_on_login: Boolean(settings.require_on_login), require_on_diary: Boolean(settings.require_on_diary), current_secondary_password: secCurrent || undefined, new_secondary_password: secRemove ? undefined : secNew || undefined, remove_secondary_password: secRemove }) }); applySettings(data.settings); setSecCurrent(''); setSecNew(''); setSecRemove(false); setUnlockToken(null); alert('보안 설정이 성공적으로 저장되었습니다!'); } catch (err) { alert(`설정 저장 중 오류가 발생했습니다.\n${errorMessage(err)}`); } finally { setSecSaving(false); }
  };
  const openDiary = async (id: number, tokenForUnlock: string | null = unlockToken) => { setDayEntries(null); setDetail(null); setDetailLoading(true); try { const data = await authFetch(`/api/diaries/${id}`, {}, unlockHeaders(tokenForUnlock)); setDetail(data.data); } catch (err) { if (err instanceof ApiError && err.code === 'UNLOCK_REQUIRED') { setUnlockToken(null); setLockInput(''); setLockError(''); setPendingDiaryId(id); } else alert(errorMessage(err)); } finally { setDetailLoading(false); } };
  const requestOpenDiary = (entry: CalendarEntry) => { if (entry.is_locked && settings.require_on_diary && settings.has_secondary_password && !unlockToken) { setDayEntries(null); setLockInput(''); setLockError(''); setPendingDiaryId(entry.id); } else openDiary(entry.id); };
  const handleDayClick = (entries: CalendarEntry[]) => { if (!entries.length) return; if (entries.length === 1) requestOpenDiary(entries[0]); else setDayEntries(entries); };
  const handleUnlock = async () => { if (!lockInput || lockLoading) return; setLockLoading(true); try { const data = await authFetch('/api/auth/verify-lock', { method: 'POST', body: JSON.stringify({ secondary_password: lockInput }) }); const newUnlock: string | null = data.unlock_token || null; setUnlockToken(newUnlock); setLockInput(''); setLockError(''); if (!isAppUnlocked) setIsAppUnlocked(true); if (pendingDiaryId !== null) { const id = pendingDiaryId; setPendingDiaryId(null); await openDiary(id, newUnlock); } } catch (err) { setLockError(errorMessage(err)); } finally { setLockLoading(false); } };
  const handleDeleteDiary = async (id: number) => { if (!window.confirm('이 일기를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return; try { await authFetch(`/api/diaries/${id}`, { method: 'DELETE' }, unlockHeaders(unlockToken)); setDetail(null); setMonthData(prev => prev.filter(d => d.id !== id)); } catch (err) { if (err instanceof ApiError && err.code === 'UNLOCK_REQUIRED') { setUnlockToken(null); setDetail(null); alert('잠금 해제 시간이 지났어요. 일기를 다시 열어 주세요.'); } else alert(errorMessage(err)); } };
  const handleDiarySubmit = async () => { if (!content.trim() || isLoading) return; setIsLoading(true); try { const resData = await authFetch('/api/diaries', { method: 'POST', body: JSON.stringify({ content, user_emoji: userEmoji, user_score: userScore, is_locked: isLocked }) }); setResult(resData.ai_result); setContent(''); localStorage.removeItem(DRAFT_KEY); } catch (err) { alert(errorMessage(err)); } finally { setIsLoading(false); } };
  const changeMonth = (delta: number) => { const d = new Date(viewYear, viewMonth - 1 + delta, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth() + 1); };
  const goToday = () => { const d = new Date(); setViewYear(d.getFullYear()); setViewMonth(d.getMonth() + 1); };
  useEffect(() => { if (!token || activeTab !== 'calendar') return; let cancelled = false; setCalendarLoading(true); authFetch(`/api/calendar/month?year=${viewYear}&month=${viewMonth}`).then(d => { if (!cancelled) setMonthData(d.data || []); }).catch(e => { if (!cancelled) { console.error(e); setMonthData([]); } }).finally(() => { if (!cancelled) setCalendarLoading(false); }); return () => { cancelled = true; }; }, [activeTab, token, viewYear, viewMonth, authFetch]);
  useEffect(() => { if (!token || activeTab !== 'insight') return; let cancelled = false; setInsightLoading(true); authFetch(`/api/calendar/insight?year=${viewYear}&month=${viewMonth}`).then(d => { if (!cancelled) setInsightData(d.data || null); }).catch(e => { if (!cancelled) { console.error(e); setInsightData(null); } }).finally(() => { if (!cancelled) setInsightLoading(false); }); return () => { cancelled = true; }; }, [activeTab, token, viewYear, viewMonth, authFetch]);
  const calendarCells = useMemo(() => { const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay(); const daysInMonth = new Date(viewYear, viewMonth, 0).getDate(); const byDate: Record<string, CalendarEntry[]> = {}; monthData.forEach(entry => { if (!byDate[entry.date_key]) byDate[entry.date_key] = []; byDate[entry.date_key].push(entry); }); const cells: ({ day: number; key: string; entries: CalendarEntry[] } | null)[] = []; for (let i = 0; i < firstDay; i++) cells.push(null); for (let d = 1; d <= daysInMonth; d++) { const key = `${viewYear}-${pad(viewMonth)}-${pad(d)}`; cells.push({ day: d, key, entries: byDate[key] || [] }); } return cells; }, [viewYear, viewMonth, monthData]);
  const renderMonthNav = () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><button type="button" onClick={() => changeMonth(-1)} style={{ ...ghostBtn, fontSize: '20px', padding: '4px 12px' }} aria-label="이전 달">‹</button><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><strong style={{ fontSize: '18px' }}>{viewYear}년 {viewMonth}월</strong><button type="button" onClick={goToday} style={{ ...ghostBtn, fontSize: '12px', border: `1px solid ${colors.border}`, borderRadius: '999px', padding: '4px 10px' }}>오늘</button></div><button type="button" onClick={() => changeMonth(1)} style={{ ...ghostBtn, fontSize: '20px', padding: '4px 12px' }} aria-label="다음 달">›</button></div>;
  const showLockModal = !isAppUnlocked || pendingDiaryId !== null;
  const maxEmojiCount = insightData && insightData.emojiCounts && insightData.emojiCounts.length > 0 ? insightData.emojiCounts[0].count : 1;
  return <div style={{ backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', color: colors.textMain }}><style>{`input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; background: transparent; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 24px; width: 24px; border-radius: 50%; background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; margin-top: -8px; } input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 8px; cursor: pointer; background: var(--border); border-radius: 4px; } input:focus, textarea:focus { outline: none; border-color: var(--primary); } textarea::placeholder, input::placeholder { color: var(--text-sub); } .emoji-btn { transition: transform 0.2s ease; } .emoji-btn:active { transform: scale(0.9); }`}</style><div style={{ width: '100%', maxWidth: '480px', position: 'relative', paddingBottom: '100px' }}>{!token ? <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center' }}><h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', color: colors.textMain }}>반가워요! <br /> Diary.zip 입니다.</h1><p style={{ color: colors.textSub, margin: '0 0 40px 0' }}>나만의 AI 다이어리를 시작해보세요.</p><form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><input type="text" autoComplete="username" placeholder="아이디를 입력해주세요" value={loginId} onChange={e => setLoginId(e.target.value)} required style={{ ...inputStyle, padding: '18px 20px', borderRadius: '16px' }} /><input type="password" autoComplete={isLoginMode ? 'current-password' : 'new-password'} placeholder={isLoginMode ? '비밀번호를 입력해주세요' : '비밀번호 (4자 이상)'} value={password} onChange={e => setPassword(e.target.value)} required minLength={isLoginMode ? undefined : 4} style={{ ...inputStyle, padding: '18px 20px', borderRadius: '16px' }} /><button type="submit" disabled={authLoading} style={{ ...primaryBtn, padding: '18px', borderRadius: '16px', marginTop: '8px', background: authLoading ? colors.primaryDisabled : colors.primary }}>{authLoading ? '잠시만요... (서버가 깨어나는 중일 수 있어요)' : isLoginMode ? '시작하기' : '가입하기'}</button></form><p style={{ color: colors.danger, textAlign: 'center', marginTop: '16px', fontWeight: 500 }}>{authMessage}</p><button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setAuthMessage(''); setLoginId(''); setPassword(''); }} style={{ ...ghostBtn, marginTop: '20px', fontSize: '15px', fontWeight: 500 }}>{isLoginMode ? '계정이 없으신가요? 간편 가입하기' : '이미 계정이 있으신가요? 로그인'}</button></div> : <><div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: colors.bg, zIndex: 10 }}><h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: colors.textMain }}>Diary.zip 🗂</h2><button type="button" onClick={handleLogout} style={ghostBtn}>로그아웃</button></div><div style={{ padding: '0 24px' }}>{activeTab === 'write' && <div><div style={cardStyle}><p style={{ margin: '0 0 16px 0', fontWeight: 700, fontSize: '18px' }}>오늘의 기분은 어땠나요?</p><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2rem' }}>{EMOJI_LIST.map(emoji => <span key={emoji} role="button" aria-label={`기분 ${emoji}`} className="emoji-btn" onClick={() => setUserEmoji(emoji)} style={{ cursor: 'pointer', opacity: userEmoji === emoji ? 1 : 0.25, filter: userEmoji === emoji ? 'none' : 'grayscale(100%)' }}>{emoji}</span>)}</div></div><div style={cardStyle}><p style={{ margin: '0 0 20px 0', fontWeight: 700, fontSize: '18px', display: 'flex', justifyContent: 'space-between' }}><span>오늘 하루 점수</span><span style={{ color: colors.primary }}>{userScore}점</span></p><input type="range" min="1" max="100" value={userScore} onChange={e => setUserScore(Number(e.target.value))} /></div><div style={{ ...cardStyle, padding: '16px 24px' }}><label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}><input type="checkbox" checked={isLocked} onChange={e => setIsLocked(e.target.checked)} style={checkboxStyle} />{isLocked ? '🔒 나만 보는 비밀 일기로 저장할게요' : '🔓 달력에 기분이 공개돼요'}</label></div><div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}><textarea value={content} maxLength={MAX_LENGTH} onChange={e => setContent(e.target.value)} placeholder="오늘 하루 있었던 일을 편하게 적어주세요." style={{ width: '100%', height: '220px', padding: '24px', border: 'none', fontSize: '16px', lineHeight: 1.6, resize: 'none', backgroundColor: colors.card, color: colors.textMain, display: 'block' }} disabled={isLoading} /><div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px 14px', fontSize: '12px', color: colors.textSub }}><span>{content ? '💾 자동 임시저장 중' : ''}</span><span>{content.length} / {MAX_LENGTH}자</span></div></div><button type="button" onClick={handleDiarySubmit} disabled={isLoading || !content.trim()} style={{ ...primaryBtn, padding: '18px', borderRadius: '16px', background: isLoading || !content.trim() ? colors.primaryDisabled : colors.primary, boxShadow: '0 4px 14px rgba(49, 130, 246, 0.3)' }}>{isLoading ? 'AI가 다이어리를 분석하고 있어요...' : '일기 저장하고 AI 분석 받기'}</button>{result && <div style={{ ...cardStyle, marginTop: '24px', border: `2px solid ${colors.primary}` }}><AnalysisCard data={result} /></div>}</div>}{activeTab === 'calendar' && <div style={cardStyle}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><button type="button" onClick={() => changeMonth(-1)} style={{ ...ghostBtn, fontSize: '20px', padding: '4px 12px' }} aria-label="이전 달">‹</button><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><strong style={{ fontSize: '18px' }}>{viewYear}년 {viewMonth}월</strong><button type="button" onClick={goToday} style={{ ...ghostBtn, fontSize: '12px', border: `1px solid ${colors.border}`, borderRadius: '999px', padding: '4px 10px' }}>오늘</button></div><button type="button" onClick={() => changeMonth(1)} style={{ ...ghostBtn, fontSize: '20px', padding: '4px 12px' }} aria-label="다음 달">›</button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>{WEEKDAYS.map((w, i) => <div key={w} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: i === 0 ? colors.danger : colors.textSub }}>{w}</div>)}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', opacity: calendarLoading ? 0.4 : 1, transition: 'opacity 0.2s' }}>{calendarCells.map((cell, idx) => { if (cell === null) return <div key={`empty-${idx}`} />; const first = cell.entries[0]; const hasEntry = cell.entries.length > 0; return <button key={cell.key} type="button" onClick={() => handleDayClick(cell.entries)} disabled={!hasEntry} style={{ minHeight: '64px', border: cell.key === todayKey ? `2px solid ${colors.primary}` : '2px solid transparent', background: hasEntry ? colors.inputBg : 'transparent', borderRadius: '12px', padding: '6px 0', cursor: hasEntry ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: colors.textMain }}><span style={{ fontSize: '11px', fontWeight: 600, color: idx % 7 === 0 ? colors.danger : colors.textSub }}>{cell.day}</span>{hasEntry && <><span style={{ fontSize: '20px', lineHeight: 1.1 }}>{first.is_locked ? '🔒' : first.ai_emoji}</span><span style={{ fontSize: '10px', fontWeight: 700, color: colors.primary }}>{first.is_locked ? '' : `${first.ai_score}점`}{cell.entries.length > 1 ? ` +${cell.entries.length - 1}` : ''}</span></>}</button>; })}</div>{!calendarLoading && monthData.length === 0 && <p style={{ color: colors.textSub, textAlign: 'center', padding: '24px 0 0', margin: 0 }}>이 달에 작성된 일기가 없어요.</p>}</div>}{activeTab === 'insight' && <div><div style={{ ...cardStyle, padding: '16px 24px 0' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}><button type="button" onClick={() => changeMonth(-1)} style={{ ...ghostBtn, fontSize: '20px', padding: '4px 12px' }} aria-label="이전 달">‹</button><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><strong style={{ fontSize: '18px' }}>{viewYear}년 {viewMonth}월</strong><button type="button" onClick={goToday} style={{ ...ghostBtn, fontSize: '12px', border: `1px solid ${colors.border}`, borderRadius: '999px', padding: '4px 10px' }}>오늘</button></div><button type="button" onClick={() => changeMonth(1)} style={{ ...ghostBtn, fontSize: '20px', padding: '4px 12px' }} aria-label="다음 달">›</button></div></div>{insightLoading ? <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px', color: colors.textSub }}>통계를 불러오는 중이에요...</div> : insightData && insightData.totalDiaries > 0 ? <><div style={{ ...cardStyle, textAlign: 'center', padding: '32px 24px' }}><p style={{ fontSize: '16px', margin: '0 0 32px 0', color: colors.textSub }}>이 달에는 총 <strong style={{ color: colors.textMain }}>{insightData.totalDiaries}개</strong>의 기록이 모였어요.</p><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ flex: 1 }}><div style={{ fontSize: '48px', marginBottom: '12px' }}>{insightData.topEmoji}</div><div style={{ fontWeight: 700 }}>주로 느낀 감정</div></div><div style={{ width: '1px', height: '60px', backgroundColor: colors.border }}></div><div style={{ flex: 1 }}><div style={{ fontSize: '36px', fontWeight: 800, color: colors.primary, marginBottom: '12px' }}>{insightData.averageScore}<span style={{ fontSize: '20px' }}>점</span></div><div style={{ fontWeight: 700 }}>평균 AI 점수</div></div></div><p style={{ margin: '24px 0 0', fontSize: '14px', color: colors.textSub }}>내가 매긴 평균 점수는 <strong style={{ color: colors.textMain }}>{insightData.averageUserScore}점</strong>{insightData.averageUserScore < insightData.averageScore ? '이에요. 생각보다 괜찮은 한 달을 보내고 있어요!' : insightData.averageUserScore > insightData.averageScore ? '이에요. 스스로에게 후한 편이네요 😊' : '으로 AI와 같아요.'}</p></div>{insightData.emojiCounts && insightData.emojiCounts.length > 0 && <div style={cardStyle}><h4 style={{ margin: '0 0 16px 0' }}>감정 분포</h4><div style={{ display: 'grid', gap: '10px' }}>{insightData.emojiCounts.map(item => <div key={item.emoji} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span style={{ fontSize: '22px', width: '28px', textAlign: 'center' }}>{item.emoji}</span><div style={{ flex: 1, height: '10px', backgroundColor: colors.inputBg, borderRadius: '5px', overflow: 'hidden' }}><div style={{ width: `${Math.round((item.count / maxEmojiCount) * 100)}%`, height: '100%', backgroundColor: colors.primary, borderRadius: '5px' }} /></div><span style={{ fontSize: '13px', fontWeight: 700, color: colors.textSub, width: '32px', textAlign: 'right' }}>{item.count}회</span></div>)}</div></div>}</> : <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px', color: colors.textSub }}>이 달에 작성된 일기가 없어요.</div>}</div>}{activeTab === 'settings' && <div><h3 style={{ margin: '0 0 16px 4px', fontSize: '20px' }}>화면 설정 🎨</h3><div style={cardStyle}><label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>테마</label><div style={{ display: 'flex', gap: '8px' }}>{([['system', '시스템'], ['light', '라이트'], ['dark', '다크']] as [ThemeMode, string][]).map(([mode, label]) => <button key={mode} type="button" onClick={() => setTheme(mode)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${theme === mode ? colors.primary : colors.border}`, background: theme === mode ? colors.primarySoft : colors.inputBg, color: theme === mode ? colors.primary : colors.textMain, fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>{label}</button>)}</div></div><h3 style={{ margin: '24px 0 16px 4px', fontSize: '20px' }}>보안 설정 ⚙️</h3><div style={cardStyle}><p style={{ margin: '0 0 20px 0', fontSize: '14px', color: colors.textSub, lineHeight: 1.5 }}>{settings.has_secondary_password ? '🔐 2차 비밀번호가 설정되어 있어요. 비밀번호는 서버에 암호화(해시)된 형태로만 저장돼요.' : '아직 2차 비밀번호가 없어요. 설정하면 앱 잠금과 비밀 일기 잠금을 사용할 수 있어요.'}</p>{settings.has_secondary_password && <div style={{ marginBottom: '20px' }}><label style={labelStyle}>현재 2차 비밀번호</label><input type="password" autoComplete="current-password" placeholder="설정을 바꾸려면 입력하세요" value={secCurrent} onChange={e => setSecCurrent(e.target.value)} style={inputStyle} /></div>}{!secRemove && <div style={{ marginBottom: '20px' }}><label style={labelStyle}>{settings.has_secondary_password ? '새 2차 비밀번호 (바꿀 때만 입력)' : '2차 비밀번호 설정'}</label><input type="password" autoComplete="new-password" placeholder="4자 이상" value={secNew} onChange={e => setSecNew(e.target.value)} style={inputStyle} /></div>}<div style={{ marginBottom: '16px' }}><label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}><input type="checkbox" checked={settings.require_on_login || false} disabled={secRemove} onChange={e => setSettings({ ...settings, require_on_login: e.target.checked })} style={checkboxStyle} />앱 켤 때마다 2차 비밀번호 요구</label></div><div style={{ marginBottom: '16px' }}><label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}><input type="checkbox" checked={settings.require_on_diary || false} disabled={secRemove} onChange={e => setSettings({ ...settings, require_on_diary: e.target.checked })} style={checkboxStyle} />비밀 일기(🔒) 열 때 2차 비밀번호 요구</label></div>{settings.has_secondary_password && <div style={{ marginBottom: '16px' }}><label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600, color: colors.danger }}><input type="checkbox" checked={secRemove} onChange={e => { setSecRemove(e.target.checked); if (e.target.checked) { setSecNew(''); setSettings({ ...settings, require_on_login: false, require_on_diary: false }); } }} style={checkboxStyle} />2차 비밀번호 삭제 (잠금 옵션도 함께 꺼져요)</label></div>}<button type="button" onClick={handleSaveSettings} disabled={secSaving} style={{ ...primaryBtn, marginTop: '8px', background: secSaving ? colors.primaryDisabled : colors.primary }}>{secSaving ? '저장 중...' : '설정 저장하기'}</button></div></div>}</div><div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', backgroundColor: 'var(--nav-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-around', padding: '12px 0 calc(12px + env(safe-area-inset-bottom, 12px)) 0', zIndex: 100 }}>{([{ id: 'write', icon: '✍️', label: '작성' }, { id: 'calendar', icon: '📅', label: '달력' }, { id: 'insight', icon: '📊', label: '통계' }, { id: 'settings', icon: '⚙️', label: '설정' }] as { id: Tab; icon: string; label: string }[]).map(tab => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}><span style={{ fontSize: '20px', filter: activeTab === tab.id ? 'none' : 'grayscale(100%) opacity(0.5)' }}>{tab.icon}</span><span style={{ fontSize: '11px', fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? colors.textMain : colors.textSub }}>{tab.label}</span></button>)}</div></div></> }</div>;
}

export default App;
