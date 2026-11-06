---
title: 개요
summary: 제품 목적·운영 제약(소유자 진술)과 코드 기준 현재 구현 상태
sources:
  - app/page.tsx
  - app/layout.tsx
  - package.json
  - proxy.ts
  - lib/data/index.ts
  - app/c/[channel]/dashboard.tsx
  - app/c/[channel]/actions.ts
  - app/channels/new/actions.ts
verified: 0ed90581bfa6d853
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
| 라우트 | `/`(첫 채널로 리다이렉트), `/login`, `/c/[channel]`(대시보드), `/c/[channel]/logo`(로고 이미지), `/channels/new`(채널 등록). 목록은 [generated/routes.md](generated/routes.md) | [app/page.tsx:5-17](../app/page.tsx#L5-L17) |
| 여러 채널 | 채널마다 `data/<채널id>/` 폴더. 대시보드 상단에 모든 채널의 이번 주 업로드 수, 헤더에서 채널 전환 | [lib/data/index.ts:12-13](../lib/data/index.ts#L12-L13), [app/c/[channel]/dashboard.tsx:106-144](../app/c/[channel]/dashboard.tsx#L106-L144) |
| 진행도 체크 | 영상 × 제작 단계 표에서 칸 클릭으로 대기→일부→완료, 영상별 체크리스트, 확인 대기 작업 완료 처리 | [app/c/[channel]/actions.ts:10-45](../app/c/[channel]/actions.ts#L10-L45) |
| 일정 | 다음 업로드 D-day, 오늘부터 8일 업로드 일정 | [app/c/[channel]/dashboard.tsx:532-571](../app/c/[channel]/dashboard.tsx#L532-L571) |
| 채널 등록 | 로고·색·형식·주기·단계 템플릿·확인 규칙을 받아 채널 폴더와 빈 데이터 파일 생성 | [app/channels/new/actions.ts:30-91](../app/channels/new/actions.ts#L30-L91) |
| 데이터 저장 | `data/*.json` 파일. 직렬화된 원자적 쓰기. 자세히는 [데이터](data.md) | [lib/data/index.ts:44-89](../lib/data/index.ts#L44-L89) |
| 앱 안에서 못 하는 것 | 영상·시리즈·작업·크레딧 추가/편집, 채널 수정·삭제, 주간 계획(`plans.json`) 보기. 영상은 JSON 을 직접 편집하라는 안내만 있다 | [app/c/[channel]/dashboard.tsx:286-296](../app/c/[channel]/dashboard.tsx#L286-L296) |
| 런타임 의존성 | `next`, `react`, `react-dom` 만 존재 | [package.json:15-19](../package.json#L15-L19) |

화면 구성은 [UI](ui.md), 빌드 설정은 [아키텍처](architecture.md).
