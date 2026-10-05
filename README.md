# 🗂 Diary.zip (Full-Stack AI Diary Service)

> **"지나친 비관과 자책으로부터 하루를 보호하고, 긍정적인 회고와 내일을 준비하는 AI 다이어리 서비스"**

사용자가 기록한 감정과 일상을 바탕으로, AI가 비관적 사고에 빠지지 않도록 객관적인 피드백을 제공하고 **감사한 일**과 **내일 할 일(Reminders)**을 도출해 주는 풀스택 웹 애플리케이션입니다.

- **🌐 Live Demo:** [https://diary-zip.onrender.com](https://diary-zip.onrender.com)

---

## 💡 Service Concept & Philosophy

현대인들은 하루를 스스로 평가할 때 냉혹하고 비관적인 기준을 들이대기 쉽습니다. **Diary.zip**은 이러한 심리적 타격을 줄이기 위해 다음과 같은 방향성으로 설계되었습니다:
- **객관적 회고 (비관적 사고 방지):** 사용자가 직접 매긴 하루 점수와 AI가 분석한 점수를 비교하여, 감정의 낙관과 비관 사이의 균형을 잡아줍니다.
- **실행 가능한 대안 도출:** 단순 감정 소모를 넘어, 하루 속에서 **감사한 일**과 **내일의 리마인더**를 자연스럽게 이끌어내어 생산적이고 긍정적인 내일을 준비할 수 있도록 돕습니다.

---

## ✨ Core Features

### 1. ✍️ 스마트 다이어리 작성 및 심리 밸런싱
- **감정 및 점수 입력:** 오늘의 기분 이모지와 함께 사용자가 직접 체감한 하루 점수(1~100점)를 입력합니다.
- **AI 다차원 분석 피드백:** 
  - 비관적인 사고를 방지하고 하루를 격려하는 **따뜻한 AI 코멘트** 및 **핵심 3줄 요약** 제공
  - 하루 속에서 찾은 **감사한 일(Gratitude)**과 가벼운 **성찰 포인트(Reflection)** 추출
  - 내일의 루틴을 위한 **실행 가능한 리마인더(Reminders)** 자동 도출

### 2. 🔐 강력한 프라이버시 보안 체계 (App Lock)
- **비밀 일기(Lock):** 공개하고 싶지 않은 일기는 '나만 보기'로 잠금 처리
- **맞춤형 2차 보안:** 설정 탭에서 2차 비밀번호를 등록하면, **앱 최초 접속 시** 또는 **개별 비밀 일기 열람 시** 선택적으로 보안 검증(App Lock) 요구

### 3. 📅 월별 감정 모아보기 및 인사이트
- 한 달간의 감정 흐름을 직관적인 그리드 캘린더로 시각화
- 이번 달 총 기록 수, 평균 AI 점수, 지배적인 감정(Top Emoji) 등 통계 제공

---

## 🛠 System Architecture & Tech Stack

### Frontend
- **Framework:** React 18, TypeScript, Vite
- **Styling:** CSS-in-JS (Toss Design System 스타일 적용), Pretendard Font
- **Deployment:** Render Static Site

### Backend
- **Core:** Node.js, Express.js
- **Database:** PostgreSQL (Render 호스팅)
- **Security:** JWT Token 기반 인증, 커스텀 2차 보안 검증 로직
- **Deployment:** Render Web Service

---

## 🗄 Database Schema (PostgreSQL)

### 1. `users` Table (계정 및 보안 설정)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | PRIMARY KEY | 유저 고유 식별자 |
| `login_id` | VARCHAR(255) | UNIQUE, NOT NULL | 로그인 아이디 |
| `password` | VARCHAR(255) | NOT NULL | 1차 로그인 비밀번호 |
| `secondary_password` | VARCHAR(255) | NULLABLE | 2차 앱 잠금 비밀번호 |
| `require_on_login` | BOOLEAN | DEFAULT false | 앱 접속 시 2차 잠금 활성화 여부 |
| `require_on_diary` | BOOLEAN | DEFAULT false | 비밀 일기 열람 시 2차 잠금 활성화 여부 |

### 2. `diaries` Table (일기 및 AI 피드백 결과)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL | PRIMARY KEY | 일기 고유 식별자 |
| `user_id` | INTEGER | FOREIGN KEY | 작성자 ID (`users.id` 참조) |
| `content` | TEXT | NOT NULL | 다이어리 본문 |
| `user_emoji` | VARCHAR(50) | - | 사용자가 선택한 기분 이모지 |
| `user_score` | INTEGER | - | 사용자가 매긴 하루 점수 (1~100) |
| `is_locked` | BOOLEAN | DEFAULT false | 비밀 일기 잠금 여부 |
| `ai_emoji` | VARCHAR(50) | - | AI 분석 감정 이모지 |
| `ai_score` | INTEGER | - | AI가 보정한 객관적 하루 점수 |
| `diary_date` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 작성 일시 |

---

## 📡 API Endpoints Specification

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | 신규 회원가입 | ❌ |
| `POST` | `/api/auth/login` | 로그인 및 사용자 설정값 반환 | ❌ |
| `POST` | `/api/settings` | 2차 보안(App Lock) 설정 변경 | ⭕️ |
| `POST` | `/api/diaries` | 일기 저장 및 AI 분석 결과(요약·감사·할일) 도출 | ⭕️ |
| `GET` | `/api/calendar/month` | 월별 달력 데이터(이모지, 점수, 잠금상태) 조회 | ⭕️ |
| `GET` | `/api/calendar/insight`| 월간 감정 통계 및 평균 점수 분석 | ⭕️ |

---

## 💻 Directory Structure

diary-zip/
├── client/                 # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx         # 전역 상태 관리, 라우팅 및 UI 렌더링
│   │   └── main.tsx        
│   └── package.json
├── server/                 # Backend (Node.js + Express)
│   ├── config/
│   │   └── db.js           # PostgreSQL 커넥션 풀 설정
│   ├── server.js           # API 라우팅, 인증 및 비즈니스 로직
│   └── package.json
└── README.md

---

## 🚀 How to Run Locally

Clone Repository
git clone https://github.com/guroking/diary-zip.git

Backend Setup
cd server
npm install
.env 파일 생성 후 PORT 및 PostgreSQL 접속 정보 설정
node server.js

Frontend Setup
cd ../client
npm install
npm run dev