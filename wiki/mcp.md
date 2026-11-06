---
title: 원격 MCP
summary: claude.ai 커스텀 커넥터용 /api/mcp — 도구 11개, 채널 단위 도메인 함수, Bearer 토큰 인증, 배포 환경 변수
sources:
  - app/api/mcp/route.ts
  - lib/data/videos.ts
  - lib/data/schema.ts
  - proxy.ts
  - .env.example
verified: ec986b412e2d1a2e
---

# 원격 MCP

claude.ai 채팅에서 영상을 기획·제작하면서 Claude 가 진행 상황을 기록하도록 `/api/mcp` 에 원격 MCP 서버를 둔다. 도구는 `lib/data/videos.ts` 의 도메인 함수만 부르고, 그 함수들은 UI 와 같은 저장 계층([데이터](data.md))을 쓴다. 그래서 배포 환경(`DATA_STORE=github`)에서는 도구 호출 1번이 GitHub 커밋 1개가 되고, 웹 대시보드는 다음 요청에 그 커밋을 읽는다.

## 서버

- `mcp-handler` 의 `createMcpHandler` 로 Streamable HTTP MCP 서버를 Route Handler 에 붙이고 `GET`·`POST`·`DELETE` 로 내보낸다 — [app/api/mcp/route.ts:60-61](../app/api/mcp/route.ts#L60-L61), [app/api/mcp/route.ts:276](../app/api/mcp/route.ts#L276).
- `instructions` 에 제작 단계·다음 단계 조건, 약속 일치 원칙, "수치를 지어내지 않는다", "게시했다고 말하지 않는다", 채널 id 부터 확인하라는 규칙을 담는다. claude.ai 에는 이 저장소의 `.claude/skills` 가 없으므로 도메인 규칙은 이 경로로만 전달된다 — [app/api/mcp/route.ts:30-43](../app/api/mcp/route.ts#L30-L43).
- 도메인 함수가 던진 오류는 `isError: true` 와 메시지로 돌려준다 — [app/api/mcp/route.ts:47-53](../app/api/mcp/route.ts#L47-L53).
- 모든 도구는 `channel` 인자(채널 id 형식 검사)를 받는다 — [app/api/mcp/route.ts:58](../app/api/mcp/route.ts#L58), [lib/data/schema.ts:27-30](../lib/data/schema.ts#L27-L30). 없는 채널이면 `list_channels` 로 확인하라는 오류 — [lib/data/videos.ts:24-28](../lib/data/videos.ts#L24-L28).

## 도구

| 도구 | 종류 | 도메인 함수 | 동작 | 근거 |
|---|---|---|---|---|
| `list_channels` | 읽기 | `listChannelSummaries` | 채널 id·이름·핸들·니치 | [lib/data/videos.ts:32-40](../lib/data/videos.ts#L32-L40) |
| `get_overview` | 읽기 | `getOverview` | 채널 요약(필러·주기·진행표 단계 이름), 시리즈, 단계별 영상 id, 마감 지난 영상(진행 중 + 목표일 경과), 48h·7d 지표 기록 필요 영상, 이번 주 계획 | [lib/data/videos.ts:68-103](../lib/data/videos.ts#L68-L103) |
| `list_videos` | 읽기 | `getState` | 요약 필드 목록. status·pillarId·seriesId 필터 | [app/api/mcp/route.ts:86-121](../app/api/mcp/route.ts#L86-L121) |
| `get_video` | 읽기 | `getVideo` | 영상 레코드 + 요청한 마크다운(없으면 `null`) | [lib/data/videos.ts:54-61](../lib/data/videos.ts#L54-L61) |
| `get_week` | 읽기 | `getState` | 주간 계획. `weekOf` 생략 시 이번 주(Asia/Seoul 월요일) | [app/api/mcp/route.ts:134-148](../app/api/mcp/route.ts#L134-L148) |
| `create_video` | 쓰기 | `createVideo` | `idea` 단계로 추가. id 중복 금지, `pillarId` 는 채널에 필러가 있을 때 그중 하나(필러가 없는 채널에 넣으면 오류, 필러가 있는데 빼면 경고), `seriesId` 는 `series.json` 에 있어야 함, `steps` 는 빈 객체(= 모두 대기) | [lib/data/videos.ts:118-147](../lib/data/videos.ts#L118-L147) |
| `update_video` | 쓰기 | `patchVideo` | workingTitle·promise·hook·package·targetPublishDate·youtubeId·notes 만. `patch` 가 `.strict()` 라 `status`·`metrics` 같은 키는 거부 | [app/api/mcp/route.ts:173-197](../app/api/mcp/route.ts#L173-L197), [lib/data/videos.ts:153-165](../lib/data/videos.ts#L153-L165) |
| `set_status` | 쓰기 | `setStatus` | 앞으로 가는 전이에서 거쳐 가는 단계의 조건을 검사해 `warnings` 로 돌려준다(막지 않음). 쇼츠는 research·packaging 조건 생략, 훅 점수 55 미만 경고. `dropped` 는 사유 필수(날짜와 함께 `notes` 에 추가). `published` 로 갈 때 `publishedAt` 기록 | [lib/data/videos.ts:170-229](../lib/data/videos.ts#L170-L229) |
| `add_metrics` | 쓰기 | `addMetrics` | 스냅샷 누적. `daysSincePublish` 생략 시 `publishedAt` 으로 계산, 둘 다 없으면 오류. 비율은 0~100 | [lib/data/videos.ts:234-254](../lib/data/videos.ts#L234-L254) |
| `save_content` | 쓰기 | `saveContent` | `content/<채널>/<영상>/<kind>.md` 통째로 교체 + 영상 `updatedAt` 갱신(한 커밋) | [lib/data/videos.ts:256-271](../lib/data/videos.ts#L256-L271) |
| `set_week_slot` | 쓰기 | `setWeekSlot` | `weekOf` 가 월요일이 아니면 오류. 주가 없으면 만들고 같은 `videoId` 슬롯은 갱신 | [lib/data/videos.ts:281-310](../lib/data/videos.ts#L281-L310) |

쓰기 함수는 커밋 메시지를 한국어로 만든다(예: `진행: <채널>/<영상> 상태 <from> → <to>`) — [lib/data/videos.ts:223-227](../lib/data/videos.ts#L223-L227). 진행표 칸(`steps`)·체크리스트·확인 대기 작업을 바꾸는 도구는 없다. 그것은 웹 대시보드에서 한다([데이터](data.md)).

## 인증

- `withMcpAuth(..., { required: true })` 로 Bearer 토큰을 env `MCP_TOKEN` 과 timing-safe 비교한다. `MCP_TOKEN` 이 없으면 모든 요청을 거부한다 — [app/api/mcp/route.ts:264-274](../app/api/mcp/route.ts#L264-L274).
- 웹 로그인 proxy 는 `/api/mcp` 와 `/.well-known` 을 matcher 에서 제외한다. 그래서 MCP 요청은 `/login` 리다이렉트 대신 MCP 자체 401 을, OAuth 탐색 요청은 404 를 받는다 — [proxy.ts:20-24](../proxy.ts#L20-L24).

## 배포에 필요한 환경 변수

`.env.example` 에 정리되어 있다: `MCP_TOKEN`, `DATA_STORE`(배포는 `github`), `GITHUB_TOKEN`(이 저장소 Contents 읽기/쓰기 fine-grained PAT), `GITHUB_REPO`, `GITHUB_BRANCH`(Vercel Production 브랜치와 같아야 하며 기본값 없음) — [.env.example:7-16](../.env.example#L7-L16). 웹 로그인용 `ADMIN_ID`·`ADMIN_PASSWORD`·`SESSION_SECRET` 은 [인증](auth.md).

claude.ai 커스텀 커넥터에는 URL `https://<도메인>/api/mcp` 와 Request header `Authorization: Bearer <MCP_TOKEN>` 을 넣는다(근거: 소유자 진술 — 설계 문서 `docs/plans/2026-11-06-remote-mcp.md`, 미검증).
