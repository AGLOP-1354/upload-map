---
title: 데이터·MCP
summary: 데이터 타입·검증, 저장 백엔드(fs/GitHub 커밋), 도메인 함수, 원격 MCP 도구와 인증, 배포 설정
sources:
  - lib/types.ts
  - lib/data/schema.ts
  - lib/data/store.ts
  - lib/data/store-fs.ts
  - lib/data/store-github.ts
  - lib/data/files.ts
  - lib/data/videos.ts
  - app/api/mcp/route.ts
  - proxy.ts
  - vercel.json
verified: ff86adfb35ebe9bb
---

# 데이터·MCP

데이터 원본은 저장소의 `data/*.json` 과 `content/videos/<id>/<kind>.md` 이다. 화면과 MCP 도구는 모두 `lib/data` 의 도메인 함수를 거쳐 읽고 쓴다. 스키마 규칙의 단일 출처는 `.claude/rules/data-layer.md` 이다.

## 타입과 검증

- 타입: `Video`, `VideoMetrics`, `WeekPlan`, `Channel`, 파일 래퍼 `VideosFile`·`PlansFile`, 단계 목록 `VIDEO_STATUSES`, 문서 종류 `CONTENT_KINDS`(brief·script·package·review) — [lib/types.ts:3-84](../lib/types.ts#L3-L84).
- 런타임 검증은 zod 스키마로 한다. 각 스키마의 `z.infer` 가 `lib/types.ts` 타입과 같은지 `Equal` 타입 검사로 묶어 두어, 어긋나면 `tsc` 가 실패한다 — [lib/data/schema.ts:100-108](../lib/data/schema.ts#L100-L108).
- 영상 id 는 kebab-case 정규식으로 검사한다 — [lib/data/schema.ts:18-20](../lib/data/schema.ts#L18-L20).

## 저장 백엔드

공통 인터페이스 `Store` 는 `read(paths)` → `{ rev, files }`, `commit(baseRev, changes, message)` 두 메서드를 가진다 — [lib/data/store.ts:16-21](../lib/data/store.ts#L16-L21). env `DATA_STORE=github` 이면 GitHub 백엔드, 아니면 fs 백엔드를 쓴다 — [lib/data/store.ts:23-25](../lib/data/store.ts#L23-L25).

| 백엔드 | 읽기 | 쓰기 | 근거 |
|---|---|---|---|
| fs (로컬 개발) | 프로젝트 루트 기준 `readFile`, 파일이 없으면 `null` | 바뀐 파일마다 `*.tmp` 작성 후 `rename`. 경로에 `turbopackIgnore` 를 붙여 배포 파일 추적에서 제외 | [lib/data/store-fs.ts:9-35](../lib/data/store-fs.ts#L9-L35) |
| github (배포) | 브랜치 ref 의 커밋 sha 를 `rev` 로 잡고, 그 커밋 기준으로 Contents API raw 응답을 읽는다. 404 는 `null`. 모든 요청은 `cache: "no-store"` | `base_tree` 위에 tree 생성 → 부모가 `baseRev` 인 커밋 생성 → ref 를 `force: false` 로 갱신. 422(fast-forward 아님)는 `conflict` | [lib/data/store-github.ts:15-98](../lib/data/store-github.ts#L15-L98) |

GitHub 백엔드는 `GITHUB_TOKEN`, `GITHUB_REPO` 가 필수이고 `GITHUB_BRANCH` 기본값은 `main` 이다 — [lib/data/store-github.ts:8-14](../lib/data/store-github.ts#L8-L14).

## 읽기 → 변경 → 커밋 (`mutate`)

- 파일 경로는 `PATHS` 에 모여 있다 — [lib/data/files.ts:9-14](../lib/data/files.ts#L9-L14).
- 파일이 없으면 빈 기본값(`{ version: 1, videos: [] }` 등)으로 시작하고, JSON 파싱·형식 오류는 에러로 올린다 — [lib/data/files.ts:19-37](../lib/data/files.ts#L19-L37). 저장 직전에도 스키마로 다시 검증한다 — [lib/data/files.ts:40-44](../lib/data/files.ts#L40-L44).
- `mutate(paths, fn)` 는 읽기 → `fn` 으로 변경 계산 → `commit` 을 수행하고, `conflict` 면 최신 상태로 한 번만 다시 계산한다. 두 번째도 실패하면 `DataError` 를 던진다. 같은 인스턴스 안의 호출은 모듈 단위 Promise 체인으로 직렬화한다 — [lib/data/files.ts:58-81](../lib/data/files.ts#L58-L81).
- 날짜는 `Asia/Seoul` 기준 `todaySeoul()`, 주 시작은 `mondayOf()` 로 계산한다 — [lib/data/files.ts:84-96](../lib/data/files.ts#L84-L96).

## 도메인 함수 (`lib/data/videos.ts`)

| 함수 | 동작 | 근거 |
|---|---|---|
| `getState` / `getVideo` | 채널·영상·주간 계획 전체 / 영상 1개와 요청한 마크다운 | [lib/data/videos.ts:37-53](../lib/data/videos.ts#L37-L53) |
| `getOverview` | 단계별 id, 마감 지난 영상(진행 중 + 목표일 경과), 48h·7d 지표 기록 필요 영상, 이번 주 계획 | [lib/data/videos.ts:60-89](../lib/data/videos.ts#L60-L89) |
| `createVideo` | `channel.json` 이 있어야 하고 `pillarId` 는 채널 필러 중 하나, id 중복 금지. `status: "idea"` 로 생성 | [lib/data/videos.ts:101-122](../lib/data/videos.ts#L101-L122) |
| `updateVideo` | 허용 필드만 부분 수정(`VideoPatch`) | [lib/data/videos.ts:124-139](../lib/data/videos.ts#L124-L139) |
| `setStatus` | 앞으로 가는 전이에서 거쳐 가는 단계의 조건을 검사해 `warnings` 로 돌려준다(막지 않음). 쇼츠는 research·packaging 조건을 건너뛴다. 훅 점수 55 미만은 경고. `dropped` 는 사유 필수, 사유는 날짜와 함께 `notes` 에 추가. `published` 로 갈 때 `publishedAt` 이 없으면 기록 | [lib/data/videos.ts:141-202](../lib/data/videos.ts#L141-L202) |
| `addMetrics` | 스냅샷을 누적. `daysSincePublish` 를 생략하면 `publishedAt` 으로 계산하고, 둘 다 없으면 에러 | [lib/data/videos.ts:204-226](../lib/data/videos.ts#L204-L226) |
| `saveContent` | `content/videos/<id>/<kind>.md` 를 통째로 교체하고 영상 `updatedAt` 갱신(한 커밋) | [lib/data/videos.ts:228-242](../lib/data/videos.ts#L228-L242) |
| `setWeekSlot` | `weekOf` 가 월요일이 아니면 에러. 주가 없으면 만들고, 같은 `videoId` 슬롯은 갱신 | [lib/data/videos.ts:244-279](../lib/data/videos.ts#L244-L279) |

각 쓰기 함수는 한국어 커밋 메시지를 만든다(예: `진행: <id> 상태 <from> → <to>`).

## 원격 MCP 서버 (`/api/mcp`)

- `mcp-handler` 의 `createMcpHandler` 로 Streamable HTTP MCP 서버를 Route Handler 에 붙인다. `instructions` 에 제작 단계·약속 일치 원칙·지표를 지어내지 않는다는 규칙을 담는다 — [app/api/mcp/route.ts:28-46](../app/api/mcp/route.ts#L28-L46).
- 도구 10개: 읽기 `get_overview`, `list_videos`, `get_video`, `get_week` / 쓰기 `create_video`, `update_video`, `set_status`, `add_metrics`, `save_content`, `set_week_slot` — [app/api/mcp/route.ts:57-224](../app/api/mcp/route.ts#L57-L224). 도구는 위 도메인 함수만 부른다.
- `update_video` 의 `patch` 는 `.strict()` 라 `status`·`metrics` 같은 키를 거부한다 — [app/api/mcp/route.ts:146-159](../app/api/mcp/route.ts#L146-L159).
- 도구 오류는 `isError: true` 와 메시지로 돌려준다 — [app/api/mcp/route.ts:45-52](../app/api/mcp/route.ts#L45-L52).
- 인증: `withMcpAuth(..., { required: true })` 로 Bearer 토큰을 env `MCP_TOKEN` 과 timing-safe 비교한다. `MCP_TOKEN` 이 없으면 모든 요청을 거부한다 — [app/api/mcp/route.ts:228-241](../app/api/mcp/route.ts#L228-L241).

## 웹 UI 접근 제한

`proxy.ts` 가 env `APP_PASSWORD` 가 있을 때 Basic Auth 를 요구한다. 없으면 통과시킨다. matcher 에서 `/api/mcp`, `/.well-known`, 정적 자산은 제외한다 — [proxy.ts:6-24](../proxy.ts#L6-L24).

## 배포 설정

`vercel.json` 의 `ignoreCommand` 는 직전 커밋 대비 `data/`·`content/` 밖의 변경이 없으면 빌드를 건너뛴다 — [vercel.json:3](../vercel.json#L3). GitHub 백엔드는 요청 시점에 브랜치를 읽으므로 데이터 커밋은 재배포 없이 반영된다.

환경 변수: `DATA_STORE`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`, `MCP_TOKEN`, `APP_PASSWORD` (위 근거 링크의 각 `process.env` 참조).
