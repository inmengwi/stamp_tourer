# Stamp Tourer MVP Service

기획 문서를 바탕으로 MVP 핵심 기능(투어 조회/찜/스탬프 기록/내 컬렉션)을 검증하는 백엔드 서비스와 프론트엔드 샘플을 포함합니다.

## 구성

- `app/main.py`: 인메모리 Python 서비스
- `tests/test_mvp_service.py`: 서비스 단위 테스트
- `frontend/`: React 기반 MVP 화면

## 백엔드 검증

```bash
python -m pytest -q
```

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```
