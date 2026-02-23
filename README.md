# Stamp Tourer MVP Service

기획 문서를 바탕으로 MVP 핵심 기능(투어 조회/등록/찜/스탬프 기록/내 컬렉션)을 검증하는 프론트엔드 샘플을 포함합니다.

## 구성

- `frontend/`: React 기반 MVP 화면
- `backend/`: Cloudflare Workers + D1 기반 API 스캐폴드

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

## 로컬 동시 실행 및 연결

프론트엔드(`5173`)와 백엔드(`8787`)를 동시에 실행해 개발합니다.

1. 백엔드 실행
   ```bash
   cd backend
   npm install
   npm run db:migrate:local
   npm run dev
   ```
2. 프론트엔드 실행(다른 터미널)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

프론트는 `VITE_API_BASE_URL`로 API 베이스 URL을 제어합니다.

- 기본값(권장 개발값): `/api/v1` → Vite 프록시가 `http://localhost:8787`로 전달
- 직접 연결 예시: `VITE_API_BASE_URL=http://localhost:8787/api/v1`
- 운영 예시: `VITE_API_BASE_URL=https://<your-worker-domain>/api/v1`

## 현재 MVP 반영 사항

- 투어 탐색/상세/참여/위시리스트/기록 흐름
- **투어 등록 플로우**: 투어명·설명 입력 → 온라인 조회 시뮬레이션 → 상세 수정 후 등록
- **복합 투어(subTours) 지원**: 온라인 조회 결과가 `subTours` 구조일 때 단일 스팟 목록으로 펼쳐 편집/등록


## 백엔드 실행

```bash
cd backend
npm install
npm run db:migrate:local
npm run dev
```
