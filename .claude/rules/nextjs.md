---
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
  - "next.config.ts"
---

# Next.js 16 규칙 (이 프로젝트 설정 기준)

학습 데이터의 Next.js는 이 버전과 다르다. 확신 없는 API는 `node_modules/next/dist/docs/`에서 먼저 확인한다 (`grep -rl "<api이름>" node_modules/next/dist/docs/01-app`).

## 켜져 있는 설정 (`next.config.ts`)
- `cacheComponents: true` — 컴포넌트는 기본적으로 프리렌더 대상. 요청마다 달라야 하는 데이터(로컬 JSON 포함)는 `<Suspense>` 안에서 읽는다. 참고: `docs/01-app/01-getting-started/08-caching.md`.
- `partialPrefetching: true`, Turbopack + `@tailwindcss/turbopack`.
- 블로킹 라우트 에러가 나면 메시지의 `[stream] / [cache] / [block]` 선택지와 `Learn more` 링크를 읽고 고른다. 임의로 `export const dynamic` 같은 옛 API를 붙이지 않는다.

## 컴포넌트
- 기본은 Server Component. 상태·이벤트 핸들러가 필요한 가장 작은 잎 컴포넌트에만 `"use client"`.
- 데이터 변경은 Server Action + `<form action={...}>`. 진행 상태는 `useActionState` / `useFormStatus`. 클라이언트에서 `fetch('/api/...')`로 우회하지 않는다 — Route Handler는 외부 연동이 필요할 때만.
- 변경 후 화면 갱신은 `refresh()`. `"use cache"` 데이터를 쓸 때만 `updateTag`/`revalidateTag`.
- `export const runtime = 'edge'` 금지 (Edge 런타임 deprecated, 그리고 `fs`가 필요함).
- 레이아웃 props 타입은 전역 헬퍼 `LayoutProps<"/route">`, `PageProps<"/route">` 사용 (`app/layout.tsx` 참고).

## 스타일
- Tailwind v4 유틸리티. 별도 CSS 파일·CSS-in-JS 추가하지 않는다. 다크모드는 기존 `dark:` 패턴 유지.
- 1인용 대시보드: 정보 밀도 > 장식. 단계별 칸반·체크리스트·주간 뷰가 핵심 화면.

## 검증
- 코드 변경 후 최소 `npm run lint` + `npx tsc --noEmit`.
- dev 서버가 떠 있으면 `next-devtools` MCP의 `nextjs_index` → `nextjs_call`(get_compilation_issues 등)로 컴파일·런타임 에러 확인. 화면 변경은 `/verify`.
