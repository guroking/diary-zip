<div align="center">

# 🗂️ Diary.zip

### 오늘의 기록을 AI로 가볍게 압축하고, 내일의 나를 준비하는 감성 다이어리

<p>
  <a href="https://diary-zip.onrender.com/"><strong>🌐 Diary.zip 바로 시작하기</strong></a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js and Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/OpenAI-GPT-412991?logo=openai&logoColor=white" alt="OpenAI GPT" />
</p>

<p>무엇이든 편하게 적어 보세요.<br />Diary.zip이 하루의 핵심과 다음 행동을 정리해 드립니다.</p>

</div>

---

## ✨ 서비스 소개

Diary.zip은 긴 일기를 부담 없이 기록하고, AI의 도움으로 하루를 빠르게 돌아볼 수 있도록 만든 개인 다이어리 서비스입니다.

- 📝 **자유로운 기록** — 정리되지 않은 생각도 편하게 저장
- 🧠 **AI 1줄·3줄 요약** — 긴 일기에서 핵심만 빠르게 확인
- 🎯 **객관적인 하루 점수** — AI의 시선으로 바라본 하루의 점수와 나의 점수 비교
- 💛 **감사한 일과 돌아볼 점** — 일기 속 긍정적인 순간과 다시 생각해볼 부분 추출
- ✅ **할 일 추출** — 일기 속 계획과 미완료 작업을 놓치지 않도록 정리
- 🗓️ **달력과 통계** — 날짜별 기록과 월간 감정 흐름 확인
- 🌙 **다크모드** — 모바일에서도 편안하게 기록
- 🔐 **비공개 일기** — 로그인, 2차 잠금, 암호화로 민감한 기록 보호

## 🚀 빠른 시작

### 배포된 서비스

최상단의 **Diary.zip 바로 시작하기** 버튼을 눌러 서비스를 이용할 수 있습니다.

### 로컬 개발 환경

```bash
# 저장소 복제
git clone https://github.com/guroking/diary-zip.git
cd diary-zip

# 프론트엔드 설치 및 실행
cd diary-client
npm install
npm run dev

# 새 터미널에서 백엔드 설치 및 실행
cd ../diary-server
cp .env.example .env   # 값 채우기
npm install
npm start
```

## ⚙️ 환경 변수

`diary-server/.env` 또는 Render **백엔드 Web Service**의 Environment에 다음 값을 설정하세요. 예시는 `diary-server/.env.example`를 참고하세요.

```env
PORT=5000
DATABASE_URL=postgresql://username:password@host:5432/database
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
ENCRYPTION_KEY=your_long_random_encryption_key
JWT_SECRET=your_long_random_jwt_secret
```

### 환경 변수 주의사항

- `OPENAI_API_KEY`는 서버 전용 키입니다. 프론트엔드에 넣지 마세요.
- `OPENAI_MODEL`은 사용할 OpenAI 모델입니다. 현재 기본 모델은 `gpt-4o-mini`입니다.
- `ENCRYPTION_KEY`는 저장된 일기를 복호화하는 데 사용되므로 **설정 후 변경하지 마세요**.
- `JWT_SECRET` 변경 시 기존 로그인 토큰은 만료되어 다시 로그인해야 합니다.
- `.env` 파일과 API 키는 절대 Git에 커밋하지 마세요.
- `DATABASE_URL`은 공유 DB를 사용하는 다른 서비스와 함께 관리하므로 임의로 변경하지 마세요.

무작위 키 생성 예시:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

위 명령을 각각 실행해 `ENCRYPTION_KEY`와 `JWT_SECRET`에 서로 다른 값을 넣으세요.

Render 설정 절차는 [RENDER_SETUP.md](./RENDER_SETUP.md)를 참고하세요.

## 🧱 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, `pg` connection pool |
| Authentication | JWT, bcrypt |
| AI | OpenAI API (GPT-4o-mini) |
| Deployment | Render |

## 📁 프로젝트 구조

```text
diary-zip/
├── diary-client/       # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── assets/
│   └── package.json
├── diary-server/       # Express 백엔드
│   ├── config/db.js     # PostgreSQL 연결 설정
│   ├── server.js        # API 서버 (인증·암호화·AI 분석)
│   ├── test.js          # /health 점검 스크립트
│   ├── .env.example
│   └── package.json
├── RENDER_SETUP.md      # Render 배포/환경변수 매뉴얼
└── README.md
```

## 🔌 주요 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/health` | 서버 상태 및 AI 연결 진단 |
| `POST` | `/api/auth/register` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 및 JWT 발급 |
| `GET` | `/api/settings` | 2차 잠금 설정 조회 |
| `POST` | `/api/settings` | 2차 잠금 설정 변경 |
| `POST` | `/api/auth/verify-lock` | 2차 비밀번호 확인 및 잠금 해제 토큰 발급 |
| `POST` | `/api/diaries` | 일기 작성 및 AI 분석 |
| `GET` | `/api/diaries/:id` | 일기 상세 조회 |
| `DELETE` | `/api/diaries/:id` | 일기 삭제 |
| `GET` | `/api/calendar/month?year=&month=` | 월간 달력 데이터 |
| `GET` | `/api/calendar/insight?year=&month=` | 월간 통계 |

인증이 필요한 API는 로그인 후 발급된 Bearer 토큰을 사용합니다.

```http
Authorization: Bearer <access-token>
```

## 🤖 AI 분석 결과

AI 분석 결과에는 다음 항목이 포함됩니다.

```json
{
  "title": "오늘 하루를 요약하는 제목",
  "one_line_summary": "하루의 핵심을 요약한 한 문장",
  "three_line_summary": [
    "오늘 있었던 주요 사건",
    "일기에서 드러난 감정",
    "하루를 돌아볼 만한 생각"
  ],
  "ai_emoji": "🙂",
  "ai_score": 75,
  "ai_comment": "일기 내용을 바탕으로 한 AI 코멘트",
  "gratitude": "감사한 일",
  "reflection": "돌아볼 점",
  "reminders": ["내일 해야 할 일"]
}
```

### 점수의 의미

- **사용자 점수**: 사용자가 직접 느낀 하루의 점수입니다.
- **AI 점수**: AI가 일기의 사건과 감정 표현을 바탕으로 분석한 객관적인 참고 점수입니다.
- **월간 평균 AI 점수**: 해당 월에 기록한 일기들의 AI 점수 평균입니다.

AI 점수는 사용자의 감정을 대신 판단하는 값이 아니라, 같은 하루를 다른 관점에서 돌아보기 위한 보조 지표입니다.

## 🔒 보안 및 데이터 보호

- 로그인 비밀번호와 2차 비밀번호는 bcrypt 해시로 저장합니다.
- 인증은 서명된 JWT를 사용합니다.
- 일기 본문과 AI 분석 결과는 서버에서 암호화하여 저장합니다.
- 비공개 일기는 추가 잠금 해제 토큰을 요구합니다.
- API 키와 암호화 키는 클라이언트 코드에 노출하지 않습니다.
- 일기 본문은 AI 분석을 위해 OpenAI API로 전송됩니다.

> ⚠️ `ENCRYPTION_KEY`를 분실하거나 변경하면 기존 암호화 데이터를 복호화할 수 없습니다. 안전한 비밀번호 관리자에 별도로 백업하세요.

## 🗄️ 공유 데이터베이스 주의사항

Diary.zip은 `billiards-record`와 데이터베이스를 공유할 수 있습니다. Diary.zip의 데이터베이스 초기화 과정에서는 Diary.zip 전용 테이블만 관리하며, 다음 당구 기록 테이블은 삭제하거나 변경하지 않습니다.

- `universities`
- `players`
- `matches`

## 🗺️ 향후 개선 아이디어

- 주간·월간 회고 리포트
- 일기 검색 및 태그
- 데이터 내보내기 및 백업
- PWA 오프라인 작성 지원
- AI 분석 재실행 및 모델 설정

## 📄 라이선스

개인 프로젝트로 운영 중입니다. 사용 및 배포와 관련된 문의는 저장소 이슈를 이용해 주세요.

<div align="center">

**오늘의 마음을 기록하고, 내일의 나를 가볍게 시작하세요. 🌱**

</div>
