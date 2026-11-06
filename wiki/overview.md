---
title: 개요
summary: 제품 목적·운영 제약(소유자 진술)과 코드 기준 현재 구현 상태
sources:
  - app/page.tsx
  - app/layout.tsx
  - package.json
verified: 3c3c3ebef3408c8c
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
| 화면 | `create-next-app` 기본 템플릿 페이지 하나뿐. 채널/계획/진행도 관련 UI 없음 | [app/page.tsx:3-68](../app/page.tsx#L3-L68) |
| 메타데이터 | 템플릿 기본값 `"Create Next App"` 그대로 | [app/layout.tsx:15-18](../app/layout.tsx#L15-L18) |
| 라우트 | 페이지 `/` 와 원격 MCP Route Handler `/api/mcp` | [generated/routes.md](generated/routes.md) |
| 데이터 저장 | `lib/data` 저장 계층(fs·GitHub 커밋)과 MCP 도구 10개. 화면에서 데이터를 읽거나 쓰는 코드(Server Action 포함)는 아직 없음 | [data.md](data.md) |
| 런타임 의존성 | `next`, `react`, `react-dom` + MCP 서버용 `mcp-handler`, `@modelcontextprotocol/server`, 검증용 `zod` | [package.json:15-22](../package.json#L15-L22) |
