# 🗂️ Diary.zip

> **"두서없이 쏟아낸 오늘 하루, AI가 깔끔하게 압축해 드립니다."**  
> 장황한 감정 쓰레기통 일기를 **3줄 요약**, **감사/반성 회고**, **내일의 할 일(To-Do)**로 자동 구조화해 주는 지능형 다이어리 플랫폼

---

## 💡 기획 배경 및 개발 목적

* **바쁜 현대인을 위한 기록 부담 해소**: 일기를 쓰고는 싶지만 정제해서 쓸 시간도, 나중에 다시 긴 글을 읽을 여유도 부족한 대학생 및 직장인을 위해 기획되었습니다.
* **정서적 환기와 인지적 정리의 분리**: 잠들기 전 감정과 일과를 무작위로 쏟아내기만 하면, AI가 핵심 사건과 감정을 분석하여 일상의 부담을 덜고 의미 있는 회고를 가능하게 합니다.
* **'갓생' 파트너**: 일기 속에 무심코 적어둔 미완료 작업과 내일의 계획을 자동으로 감지하여 놓치지 않도록 관리합니다.

---

## 🎯 주요 타깃 및 활용 상황

* **Target**:
  * 감정 쓰레기통처럼 생각을 길게 늘어놓는 습관이 있는 사람
  * 일기를 길게 쓰다 정작 핵심을 다시 보기 귀찮은 사람
  * '갓생'을 살고 싶지만 일기 속 할 일들을 자주 깜빡하는 대학생/직장인
* **Use Cases**:
  * **Daily (잠들기 전)**: 머릿속 생각과 감정을 필터 없이 텍스트로 쏟아붓고, 앱을 닫기 전 AI가 정돈해 준 '한 줄 요약 + 3줄 요약 + 내일 할 일'을 확인.
  * **Weekly (주말 회고)**: 일주일 동안 누적된 '세 줄 요약'과 '감사/반성'만 빠르게 훑어보며 지난 한 주를 밀도 있게 정리.

---

## 🤖 핵심 AI 기능 (Core Engine)

### 1. 스마트 일기 압축 (Smart Text Compression)
* **동작 과정**:
  * **Input**: 사용자가 작성한 무정형의 장황한 원본 일기 텍스트.
  * **Processing**: 자연어 문맥 분석을 통해 하루를 관통하는 핵심 사건 및 시간 흐름 추출.
  * **Output**: 하루를 정의하는 **제목**, **1줄 핵심 요약**, 시간/사건 흐름에 따른 **3줄 요약**.

### 2. 회고 및 감정 추출 (Retrospection & Emotion Extraction)
* **동작 과정**:
  * **Input**: 원본 일기 텍스트.
  * **Processing**: 글 속에 내포된 긍정적 맥락(성취, 고마움)과 아쉬운 점(반성, 결핍)을 객관적으로 유추 및 구조화.
  * **Output**: **감사한 일 1개** + **반성할 일 1개** 도출.

### 3. 스마트 리마인더 (Action & To-Do Extractor)
* **동작 과정**:
  * **Input**: 원본 일기 텍스트.
  * **Processing**: 개체명 인식(NER) 및 시제 분석을 통해 미래 시제("내일 ~해야지", "과제 제출하기")나 완료되지 않은 행동 패턴 감지.
  * **Output**: 실행 가능한 할 일 목록 (`JSON Array`) 자동 파싱.

---

## 🏗️ 시스템 아키텍처

```
+---------------------------------------------------------------------------------+
|                              Client (diary-client)                              |
|   - React 18, TypeScript, Vite                                                  |
|   - 감정 덤프 에디터, 압축 리포트 뷰어, To-Do 체크리스트, 월간/주간 캘린더       |
+----------------------------------------+----------------------------------------+
                                         | HTTP / REST (JWT Auth)
                                         v
+---------------------------------------------------------------------------------+
|                              Server (diary-server)                              |
|   - Node.js, Express.js                                                         |
|   - Middleware: authMiddleware (JWT & 2차 PIN 검증)                             |
|   - Controllers: authController, diaryController, calendarController            |
+-------------------+------------------------------------+------------------------+
                    |                                    |
            pg (Connection Pool)                    REST API Call
                    v                                    v
+-----------------------------------+    +----------------------------------------+
|       Database (PostgreSQL)       |    |          AI NLP Pipeline Engine        |
|  - users (보안 PIN, 계정 정보)    |    |  - 1줄 / 3줄 요약 및 제목 생성         |
|  - diaries (원본 글, 요약, 회고)  |    |  - 감사 1개 / 반성 1개 맥락 추론       |
|  - todos (자동 추출된 할 일)      |    |  - 미완료 행동 개체명 추출 (JSON To-Do)|
+-----------------------------------+    +----------------------------------------+
```

---

## 🛠️ 기술 스택

* **Frontend**: React 18, TypeScript, Vite, CSS Modules / Vanilla CSS
* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL (`pg` Client Pool)
* **Security**: JWT (Access Token), bcrypt (비밀번호 및 2차 보안 PIN 해싱)
* **AI Integration**: OpenAI / Google Gemini API (NLP Summarization & Entity Extraction)

---

## 📂 프로젝트 구조

```text
diary-zip/
├── ARCHITECTURE.md           # 시스템 세부 아키텍처
├── README.md                 # 통합 가이드 문서
├── diary-client/             # React 프론트엔드
│   ├── src/
│   │   ├── assets/           # 일러스트 및 아이콘 리소스
│   │   ├── App.tsx           # 메인 레이아웃 및 라우팅
│   │   ├── App.css           # UI 스타일
│   │   └── main.tsx          # 애플리케이션 엔트리
│   ├── package.json
│   └── vite.config.ts
└── diary-server/             # Express 백엔드
    ├── config/
    │   └── db.js             # PostgreSQL Pool 설정
    ├── controllers/
    │   ├── authController.js     # 계정 및 2차 잠금 인증
    │   ├── diaryController.js    # 일기 CRUD 및 AI 파이프라인 연동
    │   └── calendarController.js # 주간/월간 회고 통계 조회
    ├── middlewares/
    │   └── authMiddleware.js     # JWT 토큰 검증 미들웨어
    ├── routes/
    │   ├── authRoutes.js
    │   ├── diaryRoutes.js
    │   └── calendarRoutes.js
    ├── server.js             # 서버 진입점
    └── package.json
```

---

## 🚀 빠른 시작 (Getting Started)

### 1. 패키지 설치
```bash
# Frontend
cd diary-client && npm install

# Backend
cd ../diary-server && npm install
```

### 2. 환경 변수 설정
`diary-server/.env` 파일을 생성하고 아래 항목을 입력합니다:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/diary_zip
JWT_SECRET=your_jwt_secret_key
AI_API_KEY=your_llm_api_key
```

### 3. 개발 서버 구동
```bash
# 백엔드 서버 구동 (Port: 5000)
cd diary-server && npm start

# 프론트엔드 구동 (Port: 5173)
cd ../diary-client && npm run dev
```

---

## 📡 API 명세 (Key Endpoints)

| Method | Endpoint | 설명 | 인증 |
| :--- | :--- | :--- | :---: |
| **POST** | `/api/auth/login` | 1차 로그인 및 JWT 발급 | ❌ |
| **POST** | `/api/auth/verify-pin` | 2차 보안 잠금(PIN) 인증 | ⭕ |
| **POST** | `/api/diaries` | 원본 일기 저장 및 AI 파이프라인(요약/회고/할일) 실행 | ⭕ |
| **GET** | `/api/diaries/:id` | 일기 상세 (원본, 1줄/3줄 요약, 감사/반성, To-Do) 조회 | ⭕ |
| **PATCH**| `/api/diaries/:id/todos/:todoId` | 추출된 To-Do 완료 여부 토글 | ⭕ |
| **GET** | `/api/calendar/weekly` | 주간 3줄 요약 및 감사/반성 모아보기 (주말 회고용) | ⭕ |
| **GET** | `/api/calendar/monthly` | 월간 감정 및 일기 압축 캘린더 조회 | ⭕ |

---

## 🔒 보안 정책

* **이중 잠금 보호**: 일기라는 민감 데이터를 보호하기 위해 일반 로그인 외에 4~6자리 2차 PIN 번호 세션을 통과해야만 다이어리 접근 권한을 부여합니다.
* **단방향 해시 암호화**: 로그인 비밀번호와 2차 PIN은 `bcrypt`를 통해 솔팅(Salting) 후 해시화되어 저장됩니다.

---

## 📄 라이선스 (License)

Copyright © 2026. All rights reserved.  
*(오픈소스 배포로 전환할 경우 [MIT License]로 변경할 수 있습니다.)*
