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

## 배포 절차

### 1) Cloudflare UI에서 Worker 생성 + GitHub 연동 (권장)

Cloudflare 대시보드에서 코드 저장소를 연결하면, 브랜치 푸시만으로 자동 배포할 수 있습니다.

1. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Workers** → **Import a repository**를 선택합니다.
2. GitHub 계정을 연결하고, 이 저장소(`stamp_tourer`)를 선택합니다.
3. Worker 이름을 `wrangler.toml`의 `name`과 동일한 `stamp-tourer-api`로 지정합니다.
4. Build/Deploy 설정에서:
   - **Root directory**: `backend`
   - **Build command**: (비워도 됨)
   - **Deploy command**: `npx wrangler deploy`
5. Worker 설정에서 D1 바인딩을 추가합니다.
   - **Binding name**: `DB`
   - **Database**: `stamp-tourer-db`
6. Worker 설정에서 환경 변수/시크릿을 추가합니다.
   - Variable: `JWT_ISSUER=stamp-tourer`
   - Variable: `ACCESS_TOKEN_TTL_SECONDS=900`
   - Secret: `JWT_ACCESS_SECRET`
   - Secret: `JWT_REFRESH_SECRET`
7. Production 브랜치(예: `main`)를 지정하고 최초 배포를 실행합니다.

> 참고: D1 마이그레이션은 배포 전/후로 별도 실행이 필요합니다(아래 2번).

### 2) D1 마이그레이션 실행

원격 D1 스키마 반영은 아래 명령으로 수행합니다.

```bash
cd backend
npm install
npm run db:migrate:remote
```

원격 마이그레이션 대상은 `wrangler.toml`의 `database_name`(`stamp-tourer-db`) 기준입니다.

### 3) 로컬/CLI 직접 배포 (선택)

UI 연동 대신 수동 배포가 필요하면 아래를 사용합니다.

```bash
cd backend
npm install
npm run deploy
```

- `wrangler deploy`를 처음 실행할 때 Cloudflare 로그인/권한 확인이 필요할 수 있습니다.

## 현재 API

- `GET /api/v1/health`
- `GET /api/v1/tours`
- `GET /api/v1/tours/:tourId`

응답 포맷은 설계 문서의 envelope 정책을 따릅니다.

- 성공: `{ "success": true, "data": ... }`
- 실패: `{ "success": false, "error": { "code": "...", "message": "..." } }`
