---
title: UI
summary: 루트 레이아웃, 페이지, 전역 스타일·테마 토큰의 현재 구조
sources:
  - app/layout.tsx
  - app/page.tsx
  - app/globals.css
verified: 6c7ec9dc59ae914c
---

# UI

## 루트 레이아웃 — `app/layout.tsx`

- Server Component (`"use client"` 없음) — [generated/files.md](generated/files.md).
- 폰트: `next/font/google` 의 Geist / Geist_Mono 를 CSS 변수 `--font-geist-sans`, `--font-geist-mono` 로 주입 — [app/layout.tsx:2](../app/layout.tsx#L2), [app/layout.tsx:5-13](../app/layout.tsx#L5-L13), [app/layout.tsx:24](../app/layout.tsx#L24).
- `<html lang="en">` — [app/layout.tsx:23](../app/layout.tsx#L23). `<body>` 는 `min-h-full flex flex-col` — [app/layout.tsx:26](../app/layout.tsx#L26).
- `metadata` 는 템플릿 기본값 — [app/layout.tsx:15-18](../app/layout.tsx#L15-L18).
- 전역 CSS 는 레이아웃에서 import — [app/layout.tsx:3](../app/layout.tsx#L3).

## 페이지 `/` — `app/page.tsx`

- `create-next-app` 템플릿 그대로: Next 로고, "To get started" 안내 문구, Templates/Learning 링크, "Deploy Now"/"Documentation" 버튼 — [app/page.tsx:7-14](../app/page.tsx#L7-L14), [app/page.tsx:15-40](../app/page.tsx#L15-L40), [app/page.tsx:41-65](../app/page.tsx#L41-L65).
- `next/image` 로 `public/` 의 SVG 사용 — [app/page.tsx:1](../app/page.tsx#L1).
- 상태, 데이터 조회, 이벤트 핸들러 없음 (정적 마크업).

## 스타일 — `app/globals.css`

- Tailwind v4 를 `@import "tailwindcss"` 로 로드 — [app/globals.css:1](../app/globals.css#L1).
- 색 토큰 `--background`/`--foreground` 를 `:root` 에 정의하고 `prefers-color-scheme: dark` 에서 재정의 — [app/globals.css:3-6](../app/globals.css#L3-L6), [app/globals.css:15-20](../app/globals.css#L15-L20).
- `@theme inline` 으로 Tailwind 유틸리티(`bg-background`, `text-foreground`, `font-sans`, `font-mono`)에 연결 — [app/globals.css:8-13](../app/globals.css#L8-L13).
- `body` 의 `font-family` 는 Arial 계열로 지정되어 있어, Geist 는 `font-sans` 클래스를 붙인 요소에만 적용된다 (페이지 래퍼가 `font-sans` 사용) — [app/globals.css:22-26](../app/globals.css#L22-L26), [app/page.tsx:5](../app/page.tsx#L5).
