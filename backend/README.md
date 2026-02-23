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

로컬 D1에 테이블이 생성됐는지 확인:

```bash
wrangler d1 execute stamp-tourer-db --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## 환경 설정

1. `wrangler.toml`의 `database_id`를 실제 D1 DB ID로 교체합니다.
2. JWT 비밀키는 평문 파일이 아니라 Cloudflare Secret으로 등록합니다.

```bash
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

## 배포 절차

### 1) Cloudflare UI에서 Worker 생성 + GitHub 연동 (권장)

Cloudflare 대시보드에서 코드 저장소를 연결하면, 브랜치 푸시만으로 자동 배포할 수 있습니다.

1. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Workers** → **Import a repository**를 선택합니다.
2. GitHub 계정을 연결하고, 이 저장소(`stamp_tourer`)를 선택합니다.
3. Worker 이름을 `wrangler.toml`의 `name`과 동일한 `stamp-tourer-api`로 지정합니다.
4. Build/Deploy 설정에서:
   - **Root directory**: `backend`
   - **Build command**: (비워도 됨)
   - **Deploy command**: `npm run deploy`
5. Worker 설정에서 D1 바인딩을 추가합니다.
   - **Binding name**: `DB`
   - **Database**: `stamp-tourer-db`
6. Worker 설정에서 환경 변수/시크릿을 추가합니다.
   - Variable: `JWT_ISSUER=stamp-tourer`
   - Variable: `ACCESS_TOKEN_TTL_SECONDS=900`
   - Secret: `JWT_ACCESS_SECRET`
   - Secret: `JWT_REFRESH_SECRET`
7. Production 브랜치(예: `main`)를 지정하고 최초 배포를 실행합니다.

> 참고: `npm run deploy`는 원격 D1 마이그레이션을 먼저 적용한 뒤 Worker를 배포합니다.

### 2) 로컬/CLI 직접 배포 (선택)

UI 연동 대신 수동 배포가 필요하면 아래를 사용합니다.

```bash
cd backend
npm install
npm run deploy
```

원격 D1에 테이블이 생성됐는지 확인:

```bash
wrangler d1 execute stamp-tourer-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

- `wrangler deploy`를 처음 실행할 때 Cloudflare 로그인/권한 확인이 필요할 수 있습니다.
- 원격 마이그레이션 대상은 `wrangler.toml`의 `database_name`(`stamp-tourer-db`) 기준입니다.

## 현재 API

- `GET /api/v1/health`
- `GET /api/v1/tours`
- `GET /api/v1/tours/:tourId`
- `POST /api/v1/tours`
- `POST /api/v1/tours/:tourId/participation`
- `POST /api/v1/tours/:tourId/wishlist`
- `POST /api/v1/stamps/records`
- `GET /api/v1/collections/me`

### 헬스체크 동작

`GET /api/v1/health`는 필수 테이블(`users`, `tours`, `stamp_spots`) 존재 여부를 함께 확인합니다.

- 스키마 정상: `200` + `{ success: true, data: { status: "ok", tables: [...] } }`
- 스키마 누락: `500` + `DB_SCHEMA_MISSING` 에러 (누락 테이블 목록 포함)

응답 포맷은 설계 문서의 envelope 정책을 따릅니다.

- 성공: `{ "success": true, "data": ... }`
- 실패: `{ "success": false, "error": { "code": "...", "message": "..." } }`


## 상태 코드 정책 (MVP)

- `400 Bad Request`: `zValidator` 기반 path/query/body 검증 실패.
- `404 Not Found`: 참조한 투어/스팟이 존재하지 않을 때.
- `409 Conflict`: 중복 참여/중복 찜/중복 스탬프 기록일 때.
- `201 Created`: 생성형 요청(투어 등록, 참여 시작, 스탬프 기록) 성공 시.
- `200 OK`: 조회 및 찜 상태 반영 성공 시.

실패 응답은 항상 동일한 envelope를 사용합니다.

```json
{
  "success": false,
  "error": {
    "code": "...",
    "message": "...",
    "details": {}
  }
}
```
