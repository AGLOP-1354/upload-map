---
title: 인증
summary: 환경변수 단일 계정 로그인, HMAC 서명 세션 쿠키, proxy 리다이렉트, Server Action 재확인
sources:
  - .env.example
  - lib/session.ts
  - lib/auth.ts
  - proxy.ts
  - app/login/page.tsx
  - app/login/login-form.tsx
  - app/login/actions.ts
verified: aa92f23423907917
---

# 인증

1인용 앱이라 계정은 하나이고 서버 환경변수로만 정한다. 가입·비밀번호 찾기 화면은 없다 — [app/login/page.tsx:23-25](../app/login/page.tsx#L23-L25).

## 환경변수 — `.env.example`

`.env.local` 로 복사해 채우는 템플릿 — [.env.example:1-5](../.env.example#L1-L5).

| 변수 | 쓰임 | 근거 |
|---|---|---|
| `ADMIN_ID` | 로그인 아이디. 서명 대상 문자열에도 들어가 아이디가 바뀌면 기존 토큰이 무효가 된다 | [lib/session.ts:33-37](../lib/session.ts#L33-L37), [lib/session.ts:39-45](../lib/session.ts#L39-L45) |
| `ADMIN_PASSWORD` | 로그인 비밀번호 | [app/login/actions.ts:32-41](../app/login/actions.ts#L32-L41) |
| `SESSION_SECRET` | HMAC 키. 없거나 32자 미만이면 서명 시 예외 | [lib/session.ts:8-12](../lib/session.ts#L8-L12) |

셋 중 하나라도 없으면 로그인 액션이 설정 누락 오류를 돌려준다 — [app/login/actions.ts:34-36](../app/login/actions.ts#L34-L36).

## 세션 토큰 — `lib/session.ts`

- 쿠키 이름 `um_session`. 유지 기간 30일(`LONG_SESSION_MS`), 기본 12시간(`SHORT_SESSION_MS`) — [lib/session.ts:4-6](../lib/session.ts#L4-L6).
- 토큰 형식 `"<만료ms>.<HMAC-SHA256 hex>"`, 서명 대상은 `ADMIN_ID + "." + 만료ms` — [lib/session.ts:1-2](../lib/session.ts#L1-L2), [lib/session.ts:33-37](../lib/session.ts#L33-L37).
- Web Crypto(`crypto.subtle`)만 사용 — [lib/session.ts:18-22](../lib/session.ts#L18-L22).
- 검증: 만료 시각이 지났거나 서명이 없으면 거부, 서명은 `safeEqual` 로 비교 — [lib/session.ts:39-45](../lib/session.ts#L39-L45). `safeEqual` 은 조기 종료 없이 모든 바이트를 비교한다 — [lib/session.ts:24-31](../lib/session.ts#L24-L31).
- 서버 쪽 세션 저장소는 없다. 토큰 자체가 만료 시각을 담는다.

## 요청 가드 — `proxy.ts`

Next.js 16 의 Proxy 파일 컨벤션(Middleware 의 새 이름, 기본 Node.js 런타임 — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).

- 쿠키를 `verifySessionToken` 으로 검증 — [proxy.ts:5-7](../proxy.ts#L5-L7).
- `/login`: 로그인 상태면 `/` 로, 아니면 통과 — [proxy.ts:9-11](../proxy.ts#L9-L11).
- 그 외 경로에서 미로그인: `/login` 으로 리다이렉트. `/` 가 아니면 원래 경로+쿼리를 `next` 파라미터로 붙인다 — [proxy.ts:12-16](../proxy.ts#L12-L16).
- matcher 는 `api/mcp`, `.well-known`, `_next/static`, `_next/image`, `favicon.ico` 를 제외 — [proxy.ts:20-24](../proxy.ts#L20-L24). `/api/mcp` 는 자체 Bearer 토큰으로 인증한다([원격 MCP](mcp.md)). 그 밖의 `/c/[channel]/logo` 같은 Route Handler 는 로그인 뒤에 있다.

## 로그인 화면 — `/login`

- `app/login/page.tsx`: 제목·안내 문구와 `<Suspense>` 로 감싼 `LoginForm` — [app/login/page.tsx:8-28](../app/login/page.tsx#L8-L28). `LoginForm` 이 `useSearchParams` 를 써서 Suspense 경계가 필요하다 — [app/login/login-form.tsx:12](../app/login/login-form.tsx#L12).
- `app/login/login-form.tsx` (Client Component): `useActionState(login)` 로 오류·시도 횟수를 받는다 — [app/login/login-form.tsx:11-15](../app/login/login-form.tsx#L11-L15).
  - `next` 쿼리를 hidden 필드로 전달 — [app/login/login-form.tsx:22](../app/login/login-form.tsx#L22).
  - 비밀번호 보기 토글 버튼 — [app/login/login-form.tsx:42-50](../app/login/login-form.tsx#L42-L50).
  - 오류 시 `role="alert"` 박스와 `n/5` 시도 표시 — [app/login/login-form.tsx:54-62](../app/login/login-form.tsx#L54-L62).
  - "30일 동안 로그인 유지" 체크박스(기본 체크) — [app/login/login-form.tsx:64-67](../app/login/login-form.tsx#L64-L67).

## 로그인·로그아웃 Server Action — `app/login/actions.ts`

- 시도 제한: 프로세스 메모리의 카운터 하나. 5회 실패하면 1분 잠금, 서버 재시작 시 초기화 — [app/login/actions.ts:15-18](../app/login/actions.ts#L15-L18), [app/login/actions.ts:27-30](../app/login/actions.ts#L27-L30), [app/login/actions.ts:42-50](../app/login/actions.ts#L42-L50).
- 아이디·비밀번호를 둘 다 `safeEqual` 로 비교 — [app/login/actions.ts:38-41](../app/login/actions.ts#L38-L41).
- 성공 시 쿠키 설정: `httpOnly`, `sameSite: "lax"`, 프로덕션에서만 `secure`. 유지 체크 시 30일 토큰 + `expires`, 아니면 12시간 토큰의 브라우저 세션 쿠키 — [app/login/actions.ts:52-62](../app/login/actions.ts#L52-L62).
- 리다이렉트 대상 `next` 는 `/` 로 시작하고 `//` 로 시작하지 않을 때만 허용(외부 리다이렉트 방지) — [app/login/actions.ts:20-23](../app/login/actions.ts#L20-L23), [app/login/actions.ts:63](../app/login/actions.ts#L63).
- `logout`: 쿠키 삭제 후 `/login` — [app/login/actions.ts:66-69](../app/login/actions.ts#L66-L69). 헤더의 로그아웃 버튼이 호출한다([UI](ui.md)).

## Server Action 재확인 — `lib/auth.ts`

`requireSession()` 은 쿠키를 다시 검증하고 실패하면 `/login` 으로 `redirect` 한다. proxy 와 별개로 데이터를 바꾸는 액션이 첫 줄에서 호출한다 — [lib/auth.ts:6-10](../lib/auth.ts#L6-L10). 호출하는 곳은 [데이터](data.md)의 쓰기 경로 표 참고.
