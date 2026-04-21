# NOSYU

충남 하이퍼로컬 관광 MVP. 공공데이터 + Gemini + Neon(Postgres) + Auth.js.
제14회 충남 공공데이터·AI 활용 창업 경진대회(2026-05-26 마감) 출품작.

## Stack

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- **DB**: Neon (Postgres + pgvector), Drizzle ORM
- **Auth**: Auth.js v5 (Google + Kakao providers)
- **Storage**: Vercel Blob
- **AI**: Gemini 1.5 Flash (structured JSON output + natural-language summary)
- **Map**: Kakao Map
- **Hosting**: Vercel

## Quick start

```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run db:push              # Drizzle schema -> Neon (개발 단계 편의)
npm run dev
```

프로덕션 마이그레이션:
```bash
npm run db:generate          # 스키마 변경 시 마이그레이션 파일 생성
npm run db:migrate           # 적용
```

Neon 콘솔에서 수동 실행하려면 `drizzle/0000_init.sql`을 SQL Editor에 붙여넣기.

## 레이아웃

- `app/(visitor)` — 방문자 앱 (온보딩, 홈, 상세, 예약)
- `app/(partner)` — 소상공인 대시보드
- `app/api/{weather,recommend,demo,auth}` — 공공 API · Gemini · 시연 토글 · 로그인
- `lib/db` — Drizzle schema + client
- `lib/auth.ts` — Auth.js 설정
- `lib/gemini` — 프롬프트 + 스키마 + client
- `lib/public-api` — 기상청/관광공사/교통 래퍼
- `drizzle/` — 마이그레이션 SQL
- `scripts/seed-tour.ts` — 관광공사 API → `experiences` 일괄 적재

## 시연 토글 (장면 2)

`NEXT_PUBLIC_DEMO_MODE=true` 환경에서만 `/api/demo` 활성. `DEMO_ADMIN_TOKEN`으로 보호,
프로덕션(`false`)에서는 403. override는 `weather_cache` 테이블에 저장되어 모든 서버
컴포넌트·API가 `readDemoOverride()`로 일관되게 읽음.

## 현재 상태

Phase 1 scaffold + 백엔드 Neon 전환 완료. Week 2부터 실연동·시드·UI.
