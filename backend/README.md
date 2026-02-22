# Backend (Cloudflare Workers + D1)

Stamp Tourer MVP의 백엔드 API 초기 스캐폴드입니다.

## 포함 내용

- Hono 기반 Workers API 엔트리포인트 (`src/index.ts`)
- D1 초기 마이그레이션 (`migrations/0001_init.sql`)
- Wrangler 설정 (`wrangler.toml`)

## 실행 방법

```bash
cd backend
npm install
npm run db:migrate:local
npm run dev
```

## 환경 설정

1. `wrangler.toml`의 `database_id`를 실제 D1 DB ID로 교체합니다.
2. JWT 비밀키는 평문 파일이 아니라 Cloudflare Secret으로 등록합니다.

```bash
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

## 현재 API

- `GET /api/v1/health`
- `GET /api/v1/tours`
- `GET /api/v1/tours/:tourId`

응답 포맷은 설계 문서의 envelope 정책을 따릅니다.

- 성공: `{ "success": true, "data": ... }`
- 실패: `{ "success": false, "error": { "code": "...", "message": "..." } }`
