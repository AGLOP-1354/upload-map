---
title: 아키텍처
summary: Next.js 16 App Router 설정, 빌드·스타일 파이프라인, TypeScript/ESLint 구성
sources:
  - next.config.ts
  - tsconfig.json
  - eslint.config.mjs
  - package.json
  - .claude/launch.json
verified: 44d80fe3b045d792
---

# 아키텍처

## 스택

- Next.js `16.4.5`, React `19.3.0` (정확한 버전 고정) — [package.json:15-19](../package.json#L15-L19). 설치 버전은 [generated/package.md](generated/package.md).
- App Router 사용 (`app/` 디렉터리). Pages Router(`pages/`) 없음 — [generated/files.md](generated/files.md).
- 이 Next.js 버전은 학습 데이터와 다를 수 있으므로 API 판단은 `node_modules/next/dist/docs/` 를 근거로 한다 (AGENTS.md 의 Next.js 블록).

## next.config.ts

| 설정 | 값 | 의미 (번들 문서 기준) | 근거 |
|---|---|---|---|
| `experimental.agentFeedback` | `true` | `next dev` 가 AI 에이전트를 감지하면 AGENTS.md 에 피드백 보고 블록을 관리 | [next.config.ts:5-6](../next.config.ts#L5-L6) |
| `experimental.serverActions.bodySizeLimit` | `"3mb"` | Server Action 요청 본문 한도(기본 1MB). 채널 로고 업로드(최대 2MB)용 — [데이터](data.md) | [next.config.ts:7-8](../next.config.ts#L7-L8) |
| `cacheComponents` | `true` | Cache Components 활성화. 클라이언트 내비게이션 시 React `<Activity>` 로 상태 보존. 요청 시점 데이터는 `<Suspense>` 안에서 읽는다 | [next.config.ts:10](../next.config.ts#L10) |
| `partialPrefetching` | `true` | 링크 prefetch 가 라우트의 정적 부분(App Shell)만 가져옴. `cacheComponents` 와 함께 사용 | [next.config.ts:11](../next.config.ts#L11) |
| `turbopack.rules["*.css"]` | `@tailwindcss/turbopack` 로더 | CSS 를 Turbopack 로더로 Tailwind 처리. PostCSS 설정 파일은 없음 | [next.config.ts:12-19](../next.config.ts#L12-L19) |

## TypeScript

- `strict: true`, `noEmit: true`, `moduleResolution: "bundler"` — [tsconfig.json:7-11](../tsconfig.json#L7-L11).
- `resolveJsonModule: true` (JSON import 가능) — [tsconfig.json:12](../tsconfig.json#L12).
- 경로 별칭 `@/*` → 프로젝트 루트 `./*` — [tsconfig.json:21-23](../tsconfig.json#L21-L23).
- Next 생성 타입(`.next/types`, `.next/dev/types`) 포함 — [tsconfig.json:25-32](../tsconfig.json#L25-L32). `LayoutProps<"/">` 같은 전역 라우트 타입이 여기서 온다.

## ESLint

- flat config, `eslint-config-next` 의 `core-web-vitals` + `typescript` 프리셋 — [eslint.config.mjs:1-7](../eslint.config.mjs#L1-L7).
- 무시: `.next/**`, `out/**`, `build/**`, `next-env.d.ts` — [eslint.config.mjs:9-15](../eslint.config.mjs#L9-L15).
- 실행: `npm run lint` (`eslint`) — [generated/package.md](generated/package.md).

## 개발 서버 실행 설정 — `.claude/launch.json`

Claude 의 미리보기 도구가 쓰는 실행 설정. 이름 `upload-map`, `npm run dev -- -p 3217`, 포트 3217 — [.claude/launch.json:1-11](../.claude/launch.json#L1-L11).

## Proxy

루트의 `proxy.ts` 가 Next.js 16 Proxy(Middleware 의 새 이름)로 모든 요청의 로그인 여부를 확인한다. 동작은 [인증](auth.md).
