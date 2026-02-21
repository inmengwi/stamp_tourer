# Frontend MVP (React + Vite)

`frontend` 폴더는 기획 문서의 MVP 핵심 흐름을 React 화면으로 검증하기 위한 예시 앱입니다.

## 포함 기능

- 투어 목록 탐색 (키워드/카테고리 필터)
- 투어 상세 + 스탬프 스팟 확인
- 찜 추가/해제 및 내 찜 목록
- 스탬프 수동 기록(중복 방지) 및 내 컬렉션 집계

## 실행

```bash
cd frontend
npm install
npm run dev
```

## Cloudflare 배포 설정 팁

Cloudflare 설정 화면에서 **Build command가 optional이고 Deploy command가 필수**인 경우,
`deploy command`에 빌드 + 업로드를 함께 넣으면 됩니다.

```bash
npm run build && npx wrangler pages deploy dist --project-name <YOUR_PROJECT_NAME>
```

- Root directory: `frontend`
- Build output directory: `dist`
- `--project-name`에는 Cloudflare Pages 프로젝트명을 입력합니다.
