---
title: 데이터
summary: data/·content/ 파일 배치, lib/types.ts 타입과 zod 검증, Store(fs|github) 저장 계층, UI 쓰기 경로
sources:
  - lib/types.ts
  - lib/data/index.ts
  - lib/data/files.ts
  - lib/data/schema.ts
  - lib/data/store.ts
  - lib/data/store-fs.ts
  - lib/data/store-github.ts
  - app/c/[channel]/actions.ts
  - app/channels/new/actions.ts
  - app/c/[channel]/logo/route.ts
  - app/c/[channel]/dashboard.tsx
  - next.config.ts
  - vercel.json
verified: d8116739473d4036
---

# 데이터

DB 없이 저장소의 `data/`(JSON)·`content/`(마크다운) 파일이 원본이다. 앱과 MCP 의 파일 접근은 모두 `lib/data` 를 거치고(파일마다 `server-only`), 실제 읽기/쓰기는 저장 백엔드(`Store`)가 한다 — [lib/data/store.ts:19-30](../lib/data/store.ts#L19-L30). 스키마 서술의 단일 출처는 `.claude/rules/data-layer.md`, 타입 정의는 `lib/types.ts` — [lib/types.ts:1](../lib/types.ts#L1).

## 파일 배치

경로는 `PATHS` 한 곳에서 만든다 — [lib/data/files.ts:28-39](../lib/data/files.ts#L28-L39).

| 경로 | 최상위 형태 | 읽는 곳 |
|---|---|---|
| `data/channels.json` | `{ version: 1, channels: Channel[] }` | UI, MCP |
| `data/<채널id>/series.json` | `{ version: 1, series: Series[] }` | UI, MCP |
| `data/<채널id>/videos.json` | `{ version: 1, videos: Video[] }` | UI, MCP |
| `data/<채널id>/plans.json` | `{ version: 1, weeks: WeekPlan[] }` | MCP([MCP](mcp.md)), `yt-status` 스크립트 |
| `data/<채널id>/tasks.json` | `{ version: 1, tasks: Task[] }` | UI |
| `data/<채널id>/credits.json` | `{ version: 1, credits: Credit[] }` | UI |
| `data/<채널id>/logo.(png\|jpg\|webp)` | 채널 로고 바이너리. 파일명은 `Channel.logo` | UI |
| `content/<채널id>/<영상id>/<kind>.md` | `kind` = brief·script·package·review | MCP |

파일 종류별 스키마와 빈 기본값은 `FILES` 에 있다 — [lib/data/files.ts:42-49](../lib/data/files.ts#L42-L49). 경로에 들어가는 채널 id(`^[a-z0-9][a-z0-9-]{0,63}$`)와 영상 id(kebab-case)는 경로를 만들 때 검사해 `DataError` 를 던진다 — [lib/data/files.ts:21-26](../lib/data/files.ts#L21-L26), [lib/data/schema.ts:27-34](../lib/data/schema.ts#L27-L34). fs 백엔드는 한 번 더 `data/`·`content/` 밖 경로를 막는다 — [lib/data/store-fs.ts:9-16](../lib/data/store-fs.ts#L9-L16).

## 타입 — `lib/types.ts`

- `Channel`: 이름·핸들·구분 색·로고·주소·니치, 주간 주기, 기본 업로드 시각, 형식별 제작 단계 템플릿 `steps`, 확인 규칙 `gates`, 선택 필드(audience, stage, pillars, voice) — [lib/types.ts:7-25](../lib/types.ts#L7-L25).
- `VideoStatus`: `VIDEO_STATUSES` 10단계 상수에서 만든 타입 — [lib/types.ts:35-39](../lib/types.ts#L35-L39).
- `Video`: `format`, `status`, 시리즈·화수, 단계별 진행 `steps: Record<string, StepState>`, 체크리스트, 확정 카피, 필러·약속·훅·패키징(모두 선택), 목표/실제 게시일, `metrics[]` — [lib/types.ts:60-82](../lib/types.ts#L60-L82).
- `StepState`: `done | part | wait | skip`. `skip` 은 진행률에서 빠진다 — [lib/types.ts:4-5](../lib/types.ts#L4-L5). 진행표 클릭 순환은 `wait → part → done` — [lib/types.ts:122-123](../lib/types.ts#L122-L123).
- `WeekPlan`(주간 슬롯: anchor·cheap·short), `ContentKind` — [lib/types.ts:84-95](../lib/types.ts#L84-L95).
- `Series`, `Task`, `Credit` — [lib/types.ts:27-33](../lib/types.ts#L27-L33), [lib/types.ts:97-113](../lib/types.ts#L97-L113). 파일 래퍼 타입 `ChannelsFile` 등 — [lib/types.ts:115-120](../lib/types.ts#L115-L120).
- 기본값 `DEFAULT_STEPS`, `DEFAULT_GATES`, `CHANNEL_COLORS` — [lib/types.ts:125-144](../lib/types.ts#L125-L144).

## 런타임 검증 — `lib/data/schema.ts`

모든 타입에 대응하는 zod 스키마가 있고, `Equal` 타입 검사로 `lib/types.ts` 와 어긋나면 `tsc` 가 실패한다 — [lib/data/schema.ts:164-180](../lib/data/schema.ts#L164-L180).

- 읽기 `parse`: 파일이 없으면 빈 기본값. JSON 파싱·형식 오류는 삼키지 않고 던진다. 검증만 하고 **원본 객체**를 돌려준다(zod 결과는 키 순서를 바꾸고 모르는 키를 지워, 다시 저장하면 건드리지 않은 레코드까지 diff 가 생기기 때문) — [lib/data/files.ts:54-69](../lib/data/files.ts#L54-L69).
- 쓰기 `serialize`: 저장 전 검증, 실패하면 `DataError`. 원본 키 순서로 2칸 들여쓰기 + 끝 줄바꿈 — [lib/data/files.ts:71-76](../lib/data/files.ts#L71-L76).

## 저장 계층

### 공통 흐름 — `mutate`

경로 목록을 읽어 함수로 변경(`changes`)·커밋 메시지·결과를 계산하고 `Store.commit` 으로 한 번에 반영한다. `changes` 가 비면 커밋하지 않는다. 커밋이 충돌하면 최신 상태를 다시 읽어 **한 번만** 재계산하고, 또 실패하면 `DataError` — [lib/data/files.ts:96-118](../lib/data/files.ts#L96-L118). 한 프로세스 안의 쓰기는 모듈 Promise 체인으로 직렬화한다 — [lib/data/files.ts:92-93](../lib/data/files.ts#L92-L93).

### 백엔드 선택 — `lib/data/store.ts`

env `DATA_STORE=github` 이면 GitHub, 아니면 fs — [lib/data/store.ts:28-30](../lib/data/store.ts#L28-L30). 인터페이스: `read(paths)` → `{ rev, files }`(텍스트), `readBytes(path)`(바이너리), `commit(baseRev, changes, message)` — [lib/data/store.ts:7-26](../lib/data/store.ts#L7-L26). 변경 내용은 텍스트(`string`) 또는 바이너리(`Uint8Array`) — [lib/data/store.ts:16-17](../lib/data/store.ts#L16-L17).

### fs — `lib/data/store-fs.ts`

프로젝트 루트의 파일을 `readFile` 로 읽고(없으면 `null`), 쓸 때는 디렉터리 생성 → `<파일>.<pid>.tmp` → `rename` — [lib/data/store-fs.ts:27-50](../lib/data/store-fs.ts#L27-L50). 리비전은 항상 `"local"` 이라 충돌 검사는 없다.

### github — `lib/data/store-github.ts`

- 설정: `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` 셋 다 필요. 브랜치 기본값은 없다 — [lib/data/store-github.ts:8-15](../lib/data/store-github.ts#L8-L15). 모든 요청은 `cache: "no-store"` — [lib/data/store-github.ts:17-30](../lib/data/store-github.ts#L17-L30).
- 읽기: 브랜치 head sha 를 얻고 그 커밋 기준으로 Contents API(raw)로 파일을 읽는다. 404 는 `null` — [lib/data/store-github.ts:39-71](../lib/data/store-github.ts#L39-L71). 요청 시점에 브랜치를 읽으므로 데이터 커밋은 재배포 없이 반영된다.
- 쓰기: Git Data API 로 커밋 1개. 텍스트는 tree 항목에 직접, 바이너리는 base64 blob 을 먼저 만든 뒤 tree → commit(부모 = 읽은 sha) → ref 갱신(`force: false`). ref 갱신이 422(fast-forward 아님)면 충돌로 돌려준다 — [lib/data/store-github.ts:76-119](../lib/data/store-github.ts#L76-L119).

### 빌드 생략 — `vercel.json`

`data/`·`content/` 만 바뀐 커밋이면 `ignoreCommand` 가 종료 코드 0 을 내 Vercel 빌드를 건너뛴다 — [vercel.json:3](../vercel.json#L3).

## UI 읽기·쓰기 — `lib/data/index.ts`

- `listChannels()`, `getChannelData(id)`: 첫 줄에서 `await connection()` 으로 요청 시점까지 기다린 뒤 읽는다 — [lib/data/index.ts:10-14](../lib/data/index.ts#L10-L14), [lib/data/index.ts:28-38](../lib/data/index.ts#L28-L38). (`connection()` — `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`.) 이 함수를 쓰는 컴포넌트는 `<Suspense>` 안에 있다([UI](ui.md)).
- `getChannel(id)`: id 형식이 틀리면 `undefined` — [lib/data/index.ts:16-19](../lib/data/index.ts#L16-L19).
- `readChannelLogo(id)`: `Channel.logo` 가 `logo.(png|jpg|webp)` 일 때만 `readBytes` 로 읽어 MIME 타입과 함께 반환 — [lib/data/index.ts:103-110](../lib/data/index.ts#L103-L110).

쓰기 함수는 Server Action 에서만 호출하고, 모든 액션은 첫 줄에서 `requireSession()` 을 부른다([인증](auth.md)). 각 함수는 `mutate` 한 번 = 커밋 한 번이다.

| 데이터 함수 | 동작 | 호출하는 액션 | 근거 |
|---|---|---|---|
| `updateVideo` | 영상 하나를 찾아 수정, `updatedAt` 갱신. 없으면 `false`(커밋 없음) | `cycleStep`, `toggleChecklist` | [lib/data/index.ts:55-70](../lib/data/index.ts#L55-L70), [app/c/[channel]/actions.ts:10-35](../app/c/[channel]/actions.ts#L10-L35) |
| `updateTask` | 작업 하나 수정, `updatedAt` 갱신 | `toggleTask` | [lib/data/index.ts:72-87](../lib/data/index.ts#L72-L87), [app/c/[channel]/actions.ts:37-45](../app/c/[channel]/actions.ts#L37-L45) |
| `initChannelFiles` | 빈 데이터 파일 5개(없을 때만)와 로고 바이너리를 한 커밋으로 | `createChannel` | [lib/data/index.ts:89-101](../lib/data/index.ts#L89-L101), [app/channels/new/actions.ts:83](../app/channels/new/actions.ts#L83) |
| `addChannel` | `channels.json` 에 추가. 같은 id 가 있으면 `DUPLICATE` 예외 | `createChannel` | [lib/data/index.ts:42-53](../lib/data/index.ts#L42-L53), [app/channels/new/actions.ts:84-89](../app/channels/new/actions.ts#L84-L89) |

### 대시보드 액션 — `app/c/[channel]/actions.ts`

- `cycleStep`: 채널 템플릿에 있는 단계만, `skip` 이 아닌 경우 `STEP_STATES` 다음 값으로 바꾼다 — [app/c/[channel]/actions.ts:10-23](../app/c/[channel]/actions.ts#L10-L23).
- `toggleChecklist`: `checklist[index].done` 반전 — [app/c/[channel]/actions.ts:25-35](../app/c/[channel]/actions.ts#L25-L35).
- `toggleTask`: `Task.done` 반전 — [app/c/[channel]/actions.ts:37-45](../app/c/[channel]/actions.ts#L37-L45).
- 셋 다 끝에서 `refresh()` 로 클라이언트 라우터를 새로 고친다 — [app/c/[channel]/actions.ts:22](../app/c/[channel]/actions.ts#L22) (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`).

### 채널 등록 액션 — `app/channels/new/actions.ts`

- 검증: 이름 1~40자, 핸들 `[A-Za-z0-9._-]{3,30}`(앞 `@` 제거), 쇼츠·롱폼 중 하나 이상 — [app/channels/new/actions.ts:33-47](../app/channels/new/actions.ts#L33-L47). 실패 시 `{ error, field }` — [app/channels/new/actions.ts:8](../app/channels/new/actions.ts#L8).
- 채널 id = 핸들 소문자에서 영숫자 외를 `-` 로 바꾼 값. 이미 있으면 거부 — [app/channels/new/actions.ts:39-43](../app/channels/new/actions.ts#L39-L43).
- 로고: PNG·JPEG·WEBP, 2MB 이하 — [app/channels/new/actions.ts:10-15](../app/channels/new/actions.ts#L10-L15), [app/channels/new/actions.ts:49-56](../app/channels/new/actions.ts#L49-L56). Server Action 본문 한도를 `experimental.serverActions.bodySizeLimit: "3mb"` 로 올렸다 — [next.config.ts:5-9](../next.config.ts#L5-L9).
- 정규화: 색·업로드 시각·주소·주간 편수·단계·확인 규칙 — [app/channels/new/actions.ts:17-28](../app/channels/new/actions.ts#L17-L28), [app/channels/new/actions.ts:58-81](../app/channels/new/actions.ts#L58-L81).
- 순서: 채널 파일 생성 → `channels.json` 등록 → `/c/<id>` 로 리다이렉트 — [app/channels/new/actions.ts:83-90](../app/channels/new/actions.ts#L83-L90). github 백엔드에서는 커밋 2개가 생긴다.

## 로고 라우트 — `app/c/[channel]/logo/route.ts`

`GET /c/<채널id>/logo`: `readChannelLogo` 결과를 `private, max-age=300` 으로 응답, 없으면 404 — [app/c/[channel]/logo/route.ts:4-11](../app/c/[channel]/logo/route.ts#L4-L11). 인증은 proxy 가 맡는다 — [app/c/[channel]/logo/route.ts:3](../app/c/[channel]/logo/route.ts#L3).

## 앱 화면에서 아직 쓰지 않는 데이터

- 영상·시리즈·작업·크레딧을 추가하는 화면은 없다. 빈 채널 안내가 `videos.json` 을 직접 편집하라고 말한다 — [app/c/[channel]/dashboard.tsx:286-296](../app/c/[channel]/dashboard.tsx#L286-L296). 영상 추가·단계 변경·긴 글 저장은 [MCP](mcp.md) 도구로 할 수 있다.
- `Channel.gates` 는 등록 시 저장되지만 "확인 대기" 카드는 `tasks.json` 의 미완료 항목을 보여준다 — [app/c/[channel]/dashboard.tsx:99](../app/c/[channel]/dashboard.tsx#L99).
