# Stamp Tourer 설계 문서 (Web First MVP)

## 1. 문서 목적

`docs/requires`의 기획/요구사항을 바탕으로 **웹 우선(PWA) MVP**를 설계한다.
이 문서는 구현 착수 전 공통 기준(범위, 아키텍처, 데이터 모델, API, 운영)을 제공한다.

---

## 2. 설계 원칙

1. **MVP 우선**: Must Have 기능(투어 목록/상세, 로그인, 수동 스탬프 기록, 내 컬렉션)을 먼저 안정화
2. **확장 가능성**: 추후 GPS/QR 인증, 소셜, 그룹 투어, 경로 최적화로 확장 가능한 구조
3. **데이터 신뢰성**: 초기에는 운영자 큐레이션 + 사용자 제보 검수 기반 하이브리드
4. **사용성**: 투어 탐색 → 참여 → 기록 → 회고 흐름을 최소 클릭으로 제공
5. **정책 내재화**: 위치/UGC/신고 처리 등 운영 정책을 초기 스키마와 API에 반영

---

## 3. MVP 범위 정의

### 3.1 포함 (Must Have)
- 회원가입/로그인
- 스탬프 투어 목록 조회
- 스탬프 투어 상세 조회
- 스탬프 획득 기록(수동)
- 내 컬렉션(진행률, 획득 내역)
- 사용자 투어 등록(온라인 조회 기반 초안 + 수동 보정)

### 3.2 제한적 포함 (Should Have 중 선별)
- 검색/필터(키워드, 지역, 테마, 진행 상태)
- 투어 찜하기(위시리스트)

### 3.3 제외 (v2+)
- 소셜 피드/팔로우
- 그룹 투어
- 랭킹/챌린지
- 자동 경로 최적화
- 고도화 인증(사진 AI, QR, GPS 위변조 방지)

---

## 4. 사용자 플로우

### 4.1 핵심 여정
1. 사용자가 회원가입/로그인
2. 투어 목록에서 검색/필터로 탐색
3. 투어 상세에서 스탬프 포인트/운영정보 확인
4. 투어 찜 또는 참여 시작
5. 방문 후 스탬프를 수동으로 기록
6. 내 컬렉션에서 진행률/획득 내역 확인

### 4.2 화면 구조 (정보 구조)
- `/` : 홈(추천/인기/마감임박)
- `/tours` : 투어 목록 + 필터
- `/tours/{tourId}` : 투어 상세
- `/my/tours` : 내 참여 투어
- `/my/collection` : 내 스탬프 컬렉션
- `/auth/login`, `/auth/signup`
- `/settings` : 계정/알림 설정

---

## 5. 시스템 아키텍처

## 5.1 상위 구성
- **Frontend (PWA)**: Next.js 기반 웹 앱
- **Backend API**: Cloudflare Workers 기반 REST API (Hono 또는 itty-router)
- **DB**: Cloudflare D1 (SQLite 기반)
- **File Storage**: Cloudflare R2(스탬프 인증 이미지(향후), 프로필 이미지)
- **Cache**: Cloudflare KV + Cache API (목록/상세 조회 응답 캐시)
- **Background Worker**: Cron Triggers + Queue/Workflow(필요 시)

## 5.2 권장 기술 스택 (MVP)
- Frontend: Next.js + TypeScript + TanStack Query + TailwindCSS
- Backend: Cloudflare Workers + TypeScript + Hono(또는 itty-router) + Drizzle ORM
- DB: Cloudflare D1
- Auth: JWT(Access/Refresh) + OAuth 확장 가능 구조
- Infra: Cloudflare 우선 구성(Workers + D1 + R2 + KV + Cache API)

> MVP에서는 PostGIS 의존 고급 위치 질의(`lat/lng` 반경/최근접 고급 연산)를 제외하고, `minLat/maxLat/minLng/maxLng` 기반 bounding box 필터 + 단순 거리/이름 정렬로 대체한다.

---

## 6. 도메인 모델

## 6.1 핵심 엔터티
- **User**: 사용자 계정
- **Tour**: 스탬프 투어 메타데이터
- **SubTour**: 다중 코스형 투어의 하위 경로(선택)
- **StampSpot**: 개별 스탬프 위치/운영 정보
- **TourParticipation**: 사용자-투어 참여 상태
- **StampRecord**: 사용자 스탬프 획득 기록
- **Wishlist**: 사용자 찜 목록
- **Review**(v2): 투어 리뷰/평점

## 6.2 관계 요약
- Tour 1:N SubTour (선택)
- SubTour 1:N StampSpot
- Tour 1:N StampSpot (단일 코스형은 sub_tour_id 없이 직접 연결)
- User N:M Tour (TourParticipation)
- User 1:N StampRecord, StampRecord N:1 StampSpot
- User N:M Tour (Wishlist)

## 6.3 최소 스키마(개념)

### users
- id (uuid, pk)
- email (unique)
- password_hash
- nickname
- role (user/admin)
- created_at, updated_at

### tours
- id (uuid, pk)
- title
- description
- category (railway/sightseeing/festival/local/theme)
- region_code
- difficulty_level
- start_date, end_date (null 허용: 상시)
- reward_description
- status (planned/active/ended)
- source_type (official/user/report/hybrid)
- created_at, updated_at

### sub_tours (선택)
- id (uuid, pk)
- tour_id (fk)
- title
- sort_order
- created_at, updated_at

### stamp_spots
- id (uuid, pk)
- tour_id (fk)
- sub_tour_id (fk, nullable)
- name
- address
- lat, lng (MVP: 실수 컬럼 + bounding box 조회)
- operation_hours
- verification_type (manual/gps/qr/photo)
- created_at, updated_at

### tour_participations
- id (uuid, pk)
- user_id (fk)
- tour_id (fk)
- status (planned/in_progress/completed)
- started_at, completed_at
- unique(user_id, tour_id)

### stamp_records
- id (uuid, pk)
- user_id (fk)
- stamp_spot_id (fk)
- acquired_at
- memo (nullable)
- proof_image_url (nullable)
- verification_method (manual)
- unique(user_id, stamp_spot_id)

### wishlists
- id (uuid, pk)
- user_id (fk)
- tour_id (fk)
- created_at
- unique(user_id, tour_id)

## 6.4 D1 전용 데이터 규칙

### 6.4.1 PK/타임스탬프 표준
- **PK 전략 통일**: 전 테이블 PK는 `TEXT` 타입 ULID(`ulid()`)를 사용한다. UUID v4도 가능하나, D1의 B-Tree 인덱스 지역성과 정렬 친화성을 고려해 ULID를 기본값으로 채택한다.
- **타임스탬프 저장 형식 통일**: `created_at`, `updated_at`, `acquired_at`, `started_at` 등 시간 컬럼은 모두 **UTC 기준 Unix epoch milliseconds(`INTEGER`)**로 저장한다.
- **표기 규칙**: API 응답 직전 계층에서만 ISO-8601 문자열로 변환하고, DB 레이어는 epoch milliseconds를 유지한다.

### 6.4.2 enum 필드 표준
- D1(SQLite)에서는 enum 타입이 없으므로, MVP에서는 **`CHECK` 제약 방식으로 통일**한다.
- 운영자가 값 집합을 동적으로 확장해야 하는 필드(v2+)만 참조 테이블(`*_codes`)로 분리한다.

예시:

```sql
role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed')),
verification_type TEXT NOT NULL CHECK (verification_type IN ('manual', 'gps', 'qr', 'photo'))
```

### 6.4.3 참여/찜/스탬프 기록 제약 및 인덱스(D1 SQL)

```sql
-- tour_participations
CREATE TABLE IF NOT EXISTS tour_participations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tour_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed')),
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  CONSTRAINT uq_tour_participations_user_tour UNIQUE (user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_participations_user_status
  ON tour_participations (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_participations_tour_status
  ON tour_participations (tour_id, status);

-- wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tour_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  CONSTRAINT uq_wishlists_user_tour UNIQUE (user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_created_at
  ON wishlists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_tour_created_at
  ON wishlists (tour_id, created_at DESC);

-- stamp_records
CREATE TABLE IF NOT EXISTS stamp_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stamp_spot_id TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  memo TEXT,
  proof_image_url TEXT,
  verification_method TEXT NOT NULL CHECK (verification_method IN ('manual', 'gps', 'qr', 'photo')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (stamp_spot_id) REFERENCES stamp_spots(id),
  CONSTRAINT uq_stamp_records_user_spot UNIQUE (user_id, stamp_spot_id)
);

CREATE INDEX IF NOT EXISTS idx_stamp_records_user_acquired_at
  ON stamp_records (user_id, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_stamp_records_spot_acquired_at
  ON stamp_records (stamp_spot_id, acquired_at DESC);
```

### 6.4.4 마이그레이션 도구/배포 순서
- **도구 선택**: `Drizzle ORM + drizzle-kit`을 기본 마이그레이션 도구로 사용한다. (Cloudflare D1 공식 가이드/생태계 기준으로 Workers 연동이 단순하고 SQL 산출물이 명확함)
- **마이그레이션 산출물 관리**: `drizzle/<timestamp>_*.sql` 파일을 Git에 커밋하고, PR에서 SQL diff를 리뷰한다.
- **배포 파이프라인 적용 순서**:
  1. CI에서 `drizzle-kit generate`로 마이그레이션 정합성 확인
  2. 스테이징 D1에 `wrangler d1 migrations apply <DB_NAME> --env staging`
  3. 스모크 테스트(핵심 API + 읽기/쓰기 경로)
  4. 프로덕션 배포 직전 `wrangler d1 migrations apply <DB_NAME> --env production`
  5. Workers 배포(`wrangler deploy`) 및 헬스체크
- **원칙**: 애플리케이션 코드 배포보다 DB 마이그레이션을 선행하고, 파괴적 변경(`DROP`, `NOT NULL` 추가 등)은 항상 2단계(추가 → 백필 → 전환)로 릴리즈한다.

---

## 7. API 설계 (REST 초안)

> 경로 규칙은 `/api/v1/...`를 유지하며, Workers 환경 표준으로 인증/에러 응답을 JSON envelope로 통일한다.
>
> - 성공: `{ "success": true, "data": ..., "meta"?: ... }`
> - 실패: `{ "success": false, "error": { "code": "...", "message": "...", "details"?: ... } }`
> - 인증: `Authorization: Bearer <accessToken>` 사용, `401/403`는 위 실패 포맷으로 반환

## 7.1 인증
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

## 7.2 투어 탐색
- `GET /api/v1/tours?keyword=&region=&category=&status=&sort=`
- `GET /api/v1/tours/{tourId}`
- `GET /api/v1/tours/{tourId}/spots`
- `GET /api/v1/tours/{tourId}/sub-tours` (복합 코스형 투어일 때 하위 코스 + 스탬프 반환)

## 7.3 참여/찜
- `POST /api/v1/tours/{tourId}/participations`
- `PATCH /api/v1/tours/{tourId}/participations` (planned/in_progress/completed)
- `POST /api/v1/tours/{tourId}/wishlist`
- `DELETE /api/v1/tours/{tourId}/wishlist`

## 7.4 스탬프 기록/컬렉션
- `POST /api/v1/stamp-records` (stampSpotId, acquiredAt, memo)
- `DELETE /api/v1/stamp-records/{recordId}`
- `GET /api/v1/me/collection`
- `GET /api/v1/me/tours`

## 7.5 운영자(초기 내부)
- `POST /api/v1/admin/tours`
- `PATCH /api/v1/admin/tours/{tourId}`
- `POST /api/v1/admin/tours:import` (외부/온라인 조회 기반 초안 생성)
- `POST /api/v1/admin/sub-tours`
- `POST /api/v1/admin/stamp-spots`

---

## 8. 권한 및 보안

- 인증: Workers 환경에서 **짧은 TTL Access Token(예: 10~15분) + Refresh Token Rotation**을 기본 채택
- 토큰 저장 위치: Access/Refresh 모두 `HttpOnly + Secure + SameSite(기본 Lax, 필요 시 Strict)` 쿠키에 저장하고, JS 접근 가능한 저장소(localStorage/sessionStorage) 사용 금지
- 권한: `user`, `admin` RBAC
- 데이터 보호: 비밀번호 해시(Argon2/Bcrypt), 개인정보 최소 수집
- 서명 키 관리: JWT 서명 키는 Cloudflare Secrets로만 주입하며 평문 환경변수/저장소 커밋 금지
- 키 롤오버: `kid`(버전 키) 기반 다중 검증 기간을 두고, `신규 키 발급 → Secrets 반영 → 신규 토큰부터 신규 kid 서명 → 구버전 만료 후 제거` 순서로 운영
- Refresh 토큰 상태 저장소: **기본은 D1 세션 테이블**(`refresh_sessions`, `revoked_at`)을 사용해 회전/강제 로그아웃의 강한 일관성을 확보하고, 초고빈도 조회 캐시가 필요할 때만 KV를 보조 캐시로 사용
- 저장소 선택 기준: `일관성 우선(보안/감사/강제무효화 정확성)`은 D1, `읽기 지연/대량 트래픽 흡수 우선`은 KV로 분리하되, 최종 진실원본(Source of Truth)은 D1로 유지
- API 보호: Rate limiting을 Cloudflare WAF/Rules(엣지 1차 차단) + 애플리케이션 레벨 사용자/엔드포인트별 제한(2차 보완)으로 이원화, 입력 검증(Zod/class-validator) 병행
- 감사로그: admin 변경 이력 기록

---

## 9. 알림/스케줄링 설계 (MVP-lite)

초기에는 복잡한 실시간 푸시 대신 다음을 제공:
- 앱 내 알림함(in-app)
- 이메일 알림(선택)

스케줄링 방식: Cron Triggers + Queue/Workflow(필요 시)

스케줄러 작업:
1. 종료일 D-7, D-3, D-1 투어 알림 생성
2. 사용자가 참여 중인 투어 상태 변경(ended) 반영

---

## 10. 데이터 수집/검수 운영 설계

`03-discussion-points.md`의 미결정 항목을 MVP에서 다음과 같이 운영:

1. **초기 시드 데이터**: 운영자 직접 등록 + 공공 데이터 수동 취합
2. **사용자 제보**: 제보 테이블에 적재 후 admin 승인 시 공개
3. **출처 추적**: `source_type`, `source_url` 필드로 이력 관리
4. **정합성 점검**: 종료일 경과, 운영시간 오류 등 주간 배치 검증

---

## 11. 비기능 요구사항

- 성능: 목록 API p95 300ms 이하(캐시 적용 전 기준)
- 가용성: 단일 리전 기준 월 99.5% 이상
- 관측성: API 로그/에러 트래킹/핵심 지표(가입, 참여율, 완주율)
- 접근성: 모바일 뷰 우선, 기본 WCAG 대비(대체텍스트/명도)

---

## 12. 릴리즈 로드맵

### Phase 1 (MVP, 6~8주)
- 인증
- 투어 목록/상세
- 수동 스탬프 기록
- 내 컬렉션
- 투어 찜

### Phase 2 (성장, 8~12주)
- 리뷰/평점
- 위치 기반 주변 스탬프
- 신고/차단
- 운영자 검수 도구 강화

### Phase 3 (확장)
- QR/GPS 인증 고도화
- 그룹 투어
- 랭킹/챌린지
- 경로 최적화 및 AI 추천

---

## 13. 즉시 결정 필요 항목

1. 백엔드 프레임워크 최종 선택 (NestJS vs FastAPI)
2. 인증 정책 (소셜 로그인 동시 도입 여부)
3. 데이터 출처 정책 (공공 API 연계 범위)
4. MVP 내 위치 권한 사용 여부 (주변 검색 포함 시 필요)
5. 운영 주체(콘텐츠 큐레이션 담당) 확정

---

## 14. 산출물 연계

- 요구사항 원문: `docs/requires/*`
- 본 설계 문서: `docs/design/01-system-design.md`
- 다음 단계 권장:
  1) API 상세 스펙(OpenAPI)
  2) DB ERD
  3) 화면 와이어프레임
  4) MVP 작업 백로그(Jira/Issues)
