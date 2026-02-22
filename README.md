# Stamp Tourer MVP Service

기획 문서를 바탕으로 MVP 핵심 기능(투어 조회/등록/찜/스탬프 기록/내 컬렉션)을 검증하는 프론트엔드 샘플을 포함합니다.

## 구성

- `frontend/`: React 기반 MVP 화면

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

## 현재 MVP 반영 사항

- 투어 탐색/상세/참여/위시리스트/기록 흐름
- **투어 등록 플로우**: 투어명·설명 입력 → 온라인 조회 시뮬레이션 → 상세 수정 후 등록
- **복합 투어(subTours) 지원**: 온라인 조회 결과가 `subTours` 구조일 때 단일 스팟 목록으로 펼쳐 편집/등록
