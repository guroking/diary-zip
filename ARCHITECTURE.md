# 🏛️ Diary.zip Microservices Architecture (MSA) Extension

본 문서는 `Diary.zip` 서비스가 트래픽 증가 및 기능 확장(Enterprise Scale)에 대응하기 위해 모놀리식 구조에서 **MSA(Microservices Architecture)**로 전환하는 확장 설계 청사진을 정의합니다.

---

## 🌐 1. MSA 전체 구조도

```text
       [ Client (React PWA) ]
                 │
                 ▼
     [ API Gateway (Spring Cloud / Nginx) ]
       │         │                │
       │ (JWT 검증)│ (요청 라우팅)    │ (AI 연동)
       ▼         ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Auth Service │ │ Diary Service│ │ AI Analysis  │
│ (Kotlin/     │ │ (Node.js/    │ │ Service      │
│  Spring Boot)│ │  Express)    │ │ (Python/     │
└──────────────┘ └──────────────> │  FastAPI)    │
       │                │         └──────────────┘
       ▼                ▼                 │
 ┌───────────┐    ┌───────────┐           │
 │   MySQL   │    │PostgreSQL │◄──────────┘
 └───────────┘    └───────────┘ (결과 저장)