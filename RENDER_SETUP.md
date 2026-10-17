# Render 설정 매뉴얼 (OpenAI 전환)

Diary.zip은 **Static Site(프론트엔드)** 와 **Web Service(백엔드 API)** 두 개의 Render 서비스로 구성됩니다.
AI 호출은 백엔드에서만 일어나므로, **환경변수는 반드시 백엔드 Web Service에** 넣어야 합니다.

## 1. 백엔드 Web Service 환경변수

Render 대시보드 → 백엔드 서비스(예: `diary-server`) → **Environment** 탭

### 삭제
| Key | 비고 |
|---|---|
| `GEMINI_API_KEY` | 더 이상 사용하지 않음 |
| `GEMINI_MODEL` | 있으면 삭제 |

### 추가
| Key | Value | 비고 |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | OpenAI 대시보드에서 **새로 발급**한 키. 대화·문서에 노출된 키는 폐기 |
| `OPENAI_MODEL` | 예: `gpt-4o-mini` | 선택. 비우면 `gpt-4o-mini` → `gpt-4.1-mini` 순서로 자동 시도 |
| `OPENAI_TIMEOUT_MS` | `25000` | 선택 |

### 그대로 유지 (절대 변경 금지)
| Key | 이유 |
|---|---|
| `DATABASE_URL` | billiards-record와 공유하는 DB |
| `ENCRYPTION_KEY` | 바꾸면 기존 일기 복호화 불가 |
| `JWT_SECRET` | 바꾸면 모든 사용자 재로그인 필요 |

저장(Save Changes)하면 Render가 자동으로 재배포합니다.

## 2. 백엔드 빌드/시작 설정 확인

백엔드 서비스 → **Settings**

| 항목 | 값 |
|---|---|
| Root Directory | `diary-server` |
| Build Command | `npm install` |
| Start Command | `npm start` |

`package-lock.json`은 의존성 변경에 맞춰 Render가 `npm install` 시 새로 생성하므로 Build Command에 `npm ci`를 쓰지 마세요.

## 3. 배포 후 확인 순서

1. **Manual Deploy → Deploy latest commit** 으로 최신 커밋 배포
2. 브라우저에서 `https://<백엔드주소>/health` 접속
   - `ai_configured: true` 이어야 합니다. `false`면 1번의 `OPENAI_API_KEY`가 백엔드가 아닌 다른 서비스에 들어간 것입니다.
3. 앱에서 일기 1개 저장
   - 결과 카드 하단에 "AI 분석 서버에 연결하지 못해..." 문구가 **없으면** 성공
4. 다시 `/health` 접속
   - 성공 시 `ai_last_success`에 모델명이 기록됩니다.
   - 실패 시 `ai_last_error`의 `status`, `code`, `message`를 보고 아래 표로 원인 확인

| ai_last_error | 원인 | 조치 |
|---|---|---|
| `status: 401` | 키가 틀리거나 폐기됨 | OpenAI에서 새 키 발급 후 `OPENAI_API_KEY` 교체 |
| `code: insufficient_quota` / `status: 429` | 결제 수단 없음 또는 한도 초과 | OpenAI Billing에서 결제/크레딧 확인 |
| `status: 404` 또는 `model_not_found` | 모델명 오타 또는 계정에서 사용 불가 | `OPENAI_MODEL` 값을 사용 가능한 모델로 변경하거나 비우기 |
| `status: 400` | 요청 파라미터 거부 | 서버는 Responses API 실패 시 Chat Completions로 자동 재시도함. 지속되면 `OPENAI_MODEL` 변경 |
| `ai_configured: false` | 키가 서버에 없음 | 백엔드 Web Service의 Environment 확인 |

로컬에서도 `cd diary-server && node test.js https://<백엔드주소>` 로 같은 내용을 확인할 수 있습니다.

## 4. 프론트엔드 Static Site

변경할 것이 없습니다. (`OPENAI_API_KEY`를 프론트엔드에 넣지 마세요. 브라우저에 노출됩니다.)

| 항목 | 값 |
|---|---|
| Root Directory | `diary-client` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |
