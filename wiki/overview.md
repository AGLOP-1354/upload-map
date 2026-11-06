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
  - app/c/[channel]/dashboard.tsx
  - app/c/[channel]/actions.ts
  - app/channels/new/actions.ts
verified: 66e1d795b8767d95
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
| 라우트 | `/`(첫 채널로 리다이렉트), `/login`, `/c/[channel]`(대시보드), `/c/[channel]/logo`(로고 이미지), `/channels/new`(채널 등록), `/api/mcp`(원격 MCP). 목록은 [generated/routes.md](generated/routes.md) | [app/page.tsx:5-17](../app/page.tsx#L5-L17) |
| 여러 채널 | 채널마다 `data/<채널id>/` 폴더. 대시보드 상단에 모든 채널의 이번 주 업로드 수, 헤더에서 채널 전환 | [lib/data/files.ts:28-39](../lib/data/files.ts#L28-L39), [app/c/[channel]/dashboard.tsx:106-144](../app/c/[channel]/dashboard.tsx#L106-L144) |
| 원격 MCP | claude.ai 커스텀 커넥터용. 채널별 영상 추가·단계 변경·지표·긴 글·주간 슬롯 기록 도구 11개, Bearer 토큰 인증. 자세히는 [원격 MCP](mcp.md) | [app/api/mcp/route.ts:60-262](../app/api/mcp/route.ts#L60-L262) |
| 진행도 체크 | 영상 × 제작 단계 표에서 칸 클릭으로 대기→일부→완료, 영상별 체크리스트, 확인 대기 작업 완료 처리 | [app/c/[channel]/actions.ts:10-45](../app/c/[channel]/actions.ts#L10-L45) |
| 일정 | 다음 업로드 D-day, 오늘부터 8일 업로드 일정 | [app/c/[channel]/dashboard.tsx:532-571](../app/c/[channel]/dashboard.tsx#L532-L571) |
| 채널 등록 | 로고·색·형식·주기·단계 템플릿·확인 규칙을 받아 채널 폴더와 빈 데이터 파일 생성 | [app/channels/new/actions.ts:30-91](../app/channels/new/actions.ts#L30-L91) |
| 데이터 저장 | `data/`·`content/` 파일. 로컬은 파일시스템, `DATA_STORE=github` 이면 GitHub 브랜치에 변경 1회 = 커밋 1개. UI 와 MCP 가 같은 저장 계층을 쓴다. 자세히는 [데이터](data.md) | [lib/data/store.ts:28-30](../lib/data/store.ts#L28-L30) |
| 웹 화면에서 못 하는 것 | 영상·시리즈·작업·크레딧 추가/편집, 채널 수정·삭제, 주간 계획(`plans.json`) 보기. 영상은 JSON 을 직접 편집하라는 안내만 있다(영상 추가·단계 변경은 MCP 도구로 가능) | [app/c/[channel]/dashboard.tsx:286-296](../app/c/[channel]/dashboard.tsx#L286-L296) |
| 런타임 의존성 | `next`, `react`, `react-dom` + MCP 서버용 `mcp-handler`, `@modelcontextprotocol/server`, 검증용 `zod` | [package.json:15-22](../package.json#L15-L22) |

화면 구성은 [UI](ui.md), 빌드 설정은 [아키텍처](architecture.md).
