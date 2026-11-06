---
title: 개요
summary: 제품 목적·운영 제약(소유자 진술)과 코드 기준 현재 구현 상태
sources:
  - app/page.tsx
  - app/layout.tsx
  - package.json
  - proxy.ts
  - lib/data/index.ts
  - lib/data/files.ts
  - lib/data/store.ts
  - app/api/mcp/route.ts
  - app/_board/board.tsx
  - app/_board/drawer.tsx
  - app/_board/actions.ts
  - app/c/[channel]/page.tsx
  - lib/board.ts
  - app/c/[channel]/settings/actions.ts
  - app/channels/new/actions.ts
verified: 0d03fd84c6fe5ab1
---

# 개요

## 제품 목적 (근거: 소유자 진술, 코드 아님)

- 유튜브 채널 운영 계획을 세우고 진행도를 체크하는 서비스.
- 단일 사용자(소유자 본인) 전용.
- DB 없이 로컬 파일(JSON 등)로 데이터를 관리해도 된다.

이 절은 요구사항이다. 구현 여부는 아래 "현재 구현 상태"만 근거로 판단한다.

## 현재 구현 상태 (근거: 코드)

| 영역 | 상태 | 근거 |
|---|---|---|
| 앱 이름 | "업로드맵", 한국어(`lang="ko"`) | [app/layout.tsx:25-28](../app/layout.tsx#L25-L28), [app/layout.tsx:33](../app/layout.tsx#L33) |
| 인증 | 환경변수 단일 계정 로그인, 서명 쿠키 세션, `proxy.ts` 가 미로그인 요청을 `/login` 으로. 자세히는 [인증](auth.md) | [proxy.ts:5-18](../proxy.ts#L5-L18) |
| 라우트 | `/`(모든 채널 통합 단계 보드, 채널이 없으면 `/channels/new`), `/login`, `/c/[channel]`(그 채널만 거른 보드로 리다이렉트), `/c/[channel]/settings`(채널 설정), `/c/[channel]/logo`(로고 이미지), `/channels/new`(채널 등록), `/api/mcp`(원격 MCP). 목록은 [generated/routes.md](generated/routes.md) | [app/page.tsx:7-20](../app/page.tsx#L7-L20), [app/c/[channel]/page.tsx:4-16](../app/c/[channel]/page.tsx#L4-L16) |
| 여러 채널 | 채널마다 `data/<채널id>/` 폴더. 화면은 채널을 나누지 않고 한 보드에 모두 보여 주며, 왼쪽 사이드바의 채널 목록이 필터다 | [lib/data/files.ts:28-39](../lib/data/files.ts#L28-L39), [app/_board/board.tsx:99-115](../app/_board/board.tsx#L99-L115) |
| 원격 MCP | claude.ai 커스텀 커넥터용. 채널별 영상 추가·단계 변경·지표·긴 글·주간 슬롯 기록 도구 11개, Bearer 토큰 인증. 자세히는 [원격 MCP](mcp.md) | [app/api/mcp/route.ts:60-262](../app/api/mcp/route.ts#L60-L262) |
| 진행도 체크 | 6열 단계 보드(아이디어·준비 중·편집·작업 완료·예약됨·게시됨)에서 카드를 끌어 상태 변경, drawer 에서 세부 단계 대기→일부→완료·체크리스트·확인 대기 처리. 마지막 세부 단계만 남으면 작업 완료로 자동 이동 | [app/_board/actions.ts:42-89](../app/_board/actions.ts#L42-L89) |
| 영상·시리즈 편집 | 오른쪽 drawer 에서 영상 추가·편집(기본 정보·해당 없는 단계·확정 카피·체크리스트·게시·메모)·보류. 확인할 일 추가는 "확인 대기" 보기, 시리즈 추가·크레딧 기록은 "채널 설정 · 시리즈 · 크레딧" 보기. 자세히는 [UI](ui.md) | [app/_board/actions.ts:93-252](../app/_board/actions.ts#L93-L252) |
| 일정 | 카드·drawer 의 업로드일과 D-day, "이번 주 업로드"(월~일)·"일정 위험" 보기. 달력 형태의 일정표는 없다 | [lib/board.ts:74-109](../lib/board.ts#L74-L109) |
| 채널 등록·설정 | 로고·색·형식·주기·단계 템플릿·확인 규칙을 받아 채널 폴더와 빈 데이터 파일 생성. 같은 폼으로 설정 수정(id·핸들 제외) | [app/channels/new/actions.ts:11-53](../app/channels/new/actions.ts#L11-L53), [app/c/[channel]/settings/actions.ts:9-34](../app/c/[channel]/settings/actions.ts#L9-L34) |
| 데이터 저장 | `data/`·`content/` 파일. 로컬은 파일시스템, `DATA_STORE=github` 이면 GitHub 브랜치에 변경 1회 = 커밋 1개. UI 와 MCP 가 같은 저장 계층을 쓴다. 자세히는 [데이터](data.md) | [lib/data/store.ts:28-30](../lib/data/store.ts#L28-L30) |
| 웹 화면에서 못 하는 것 | 채널 삭제, 영상 영구 삭제(보류만)·보류 해제, 시리즈·작업 수정·삭제, 주간 계획(`plans.json`)·긴 글 보기·편집, 지표·훅·패키징 편집(drawer 는 읽기만. MCP 도구로 가능) | [app/_board/actions.ts:42-252](../app/_board/actions.ts#L42-L252) |
| 런타임 의존성 | `next`, `react`, `react-dom` + MCP 서버용 `mcp-handler`, `@modelcontextprotocol/server`, 검증용 `zod` | [package.json:15-22](../package.json#L15-L22) |

화면 구성은 [UI](ui.md), 빌드 설정은 [아키텍처](architecture.md).
