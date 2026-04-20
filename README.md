# NOSYU

충남 하이퍼로컬 관광 MVP. 공공데이터 + Gemini + Supabase 기반.
제14회 충남 공공데이터·AI 활용 창업 경진대회(2026-05-26 마감) 출품작.

## Quick start

```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev
```

Supabase 스키마:

```bash
supabase db push   # 또는 SQL 에디터에 supabase/migrations/0001_init.sql 붙여넣기
```

## 레이아웃

- `app/(visitor)` — 방문자 앱 (온보딩, 홈, 상세, 예약)
- `app/(partner)` — 소상공인 대시보드
- `app/api/{weather,recommend,demo}` — 공공 API · Gemini · 시연 토글
- `lib/{supabase,public-api,gemini,demo}` — 서버 전용 유틸
- `supabase/migrations` — DDL + RLS
- `scripts/seed-tour.ts` — 관광공사 API → `experiences` 일괄 적재

## 시연 토글 (Stage 2 · 장면 2)

`NEXT_PUBLIC_DEMO_MODE=true` 환경에서만 `/api/demo` 활성화.
`DEMO_ADMIN_TOKEN`으로 보호. 프로덕션(`false`)에서는 403.

## 현재 상태

Phase 1 스캐폴드만 있음. 실제 API 호출·UI·시드 데이터는 Week 2~4에 채움.
