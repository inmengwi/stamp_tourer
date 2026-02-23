# Frontend MVP (React + Vite)

`frontend` 폴더는 기획 문서의 MVP 핵심 흐름을 React 화면으로 검증하기 위한 예시 앱입니다.

## 포함 기능

- 투어 목록 탐색 (키워드/카테고리 필터)
- 투어 상세 + 스탬프 스팟 확인
- 찜 추가/해제 및 내 찜 목록
- 스탬프 수동 기록(중복 방지) 및 내 컬렉션 집계
- 투어 등록: 온라인 조회 시뮬레이션 결과를 불러와 수정 후 신규 투어 생성
- `subTours` 구조(예: 다중 코스/길 기반 투어) 조회 시 스탬프 목록 자동 펼침 및 편집

## 투어 등록 플로우 요약

1. `등록` 탭에서 투어 이름/설명을 입력
2. `ONLINE_TOUR_DB` 키워드 매칭으로 온라인 조회 결과 시뮬레이션
3. 조회된 기본 정보/스팟/마일스톤/주의사항을 수정
4. 등록 시 사용자 투어 목록(`userTours`)에 추가되고 상세 화면으로 이동

> 온라인 조회 데이터가 `spots` 대신 `subTours[].stamps` 형태인 경우, 앱에서 자동으로 평탄화해 편집 가능한 스팟 리스트로 전환합니다.

## 실행

```bash
cd frontend
npm install
npm run dev
```

## 백엔드 연결 설정

프론트는 `VITE_API_BASE_URL` 환경변수로 API 서버를 선택합니다.

- 기본값: `/api/v1`
- 개발 권장: 기본값 유지 + `vite.config.js`의 `/api` 프록시 사용 (`http://localhost:8787` 전달)
- 직접 연결 예시: `VITE_API_BASE_URL=http://localhost:8787/api/v1`
- 운영 예시: `VITE_API_BASE_URL=https://<your-worker-domain>/api/v1`

`.env.development` 예시:

```bash
VITE_API_BASE_URL=/api/v1
```

백엔드는 별도 터미널에서 `backend` 폴더 기준 `npm run dev`로 실행합니다.
