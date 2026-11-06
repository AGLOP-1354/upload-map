---
title: 데이터
summary: data/ 파일 배치, lib/types.ts 타입, lib/data 읽기·직렬화된 원자적 쓰기, Server Action 쓰기 경로
sources:
  - lib/types.ts
  - lib/data/index.ts
  - lib/data/store.ts
  - app/c/[channel]/actions.ts
  - app/channels/new/actions.ts
  - app/c/[channel]/logo/route.ts
  - app/c/[channel]/dashboard.tsx
  - next.config.ts
verified: b57e7742be3cd02f
---

# 데이터

DB 없이 `data/` 아래 JSON 파일에 저장한다. 앱의 파일 접근은 `lib/data` 한 곳을 거친다(두 파일 모두 `server-only`) — [lib/data/index.ts:1](../lib/data/index.ts#L1), [lib/data/store.ts:1](../lib/data/store.ts#L1). 스키마 서술의 단일 출처는 `.claude/rules/data-layer.md`, 타입 정의는 `lib/types.ts` 이고 둘을 일치시킨다 — [lib/types.ts:1](../lib/types.ts#L1).

## 파일 배치

| 경로 | 최상위 형태 | 근거 |
|---|---|---|
| `data/channels.json` | `{ version: 1, channels: Channel[] }` | [lib/data/index.ts:6](../lib/data/index.ts#L6), [lib/data/index.ts:12](../lib/data/index.ts#L12) |
| `data/<채널id>/series.json` | `{ version: 1, series: Series[] }` | [lib/data/index.ts:7](../lib/data/index.ts#L7) |
| `data/<채널id>/videos.json` | `{ version: 1, videos: Video[] }` | [lib/data/index.ts:8](../lib/data/index.ts#L8) |
| `data/<채널id>/tasks.json` | `{ version: 1, tasks: Task[] }` | [lib/data/index.ts:9](../lib/data/index.ts#L9) |
| `data/<채널id>/credits.json` | `{ version: 1, credits: Credit[] }` | [lib/data/index.ts:10](../lib/data/index.ts#L10) |
| `data/<채널id>/plans.json` | `{ version: 1, weeks: [] }` 로 생성만 한다. 앱은 읽지 않고 `yt-status` 요약 스크립트가 읽는다([Claude Code 설정](claude-setup.md)) | [lib/data/index.ts:79](../lib/data/index.ts#L79) |
| `data/<채널id>/logo.(png\|jpg\|webp)` | 채널 로고 바이너리. 파일명은 `Channel.logo` 에 기록 | [lib/data/index.ts:87](../lib/data/index.ts#L87), [lib/data/index.ts:91-102](../lib/data/index.ts#L91-L102) |

채널 id 는 경로에 들어가므로 `^[a-z0-9][a-z0-9-]{0,63}$` 만 허용하고, 모든 경로는 `data/` 밖으로 나가지 못하게 검사한다 — [lib/data/store.ts:7-17](../lib/data/store.ts#L7-L17).

## 타입 — `lib/types.ts`

- `Channel`: 이름·핸들·구분 색·로고·주소·니치, 주간 주기(`cadence.shortsPerWeek/longPerWeek`), 기본 업로드 시각, 형식별 제작 단계 템플릿 `steps: Record<Format, string[]>`, 확인 규칙 `gates`, 선택 필드(audience, stage, pillars, voice) — [lib/types.ts:7-25](../lib/types.ts#L7-L25).
- `Video`: `format`(short/long), `status`(`VideoStatus` 10단계), 시리즈·화수, 단계별 진행 `steps: Record<string, StepState>`, 체크리스트, 확정 카피(`overlay`, `coldOpen`, `recap`, `endCard`), 훅·패키징, 목표/실제 게시일, `metrics[]` — [lib/types.ts:35-80](../lib/types.ts#L35-L80).
- `StepState`: `done | part | wait | skip`. `skip` 은 그 영상에 해당 없는 단계로 진행률에서 빠진다 — [lib/types.ts:4-5](../lib/types.ts#L4-L5). 진행표 클릭 순환은 `wait → part → done` 이고 `skip` 은 데이터에서만 지정 — [lib/types.ts:100-101](../lib/types.ts#L100-L101).
- `Series`, `Task`(확인 대기 항목, 선택적 `videoId`), `Credit`(서비스별 남은 크레딧 수동 기록) — [lib/types.ts:27-33](../lib/types.ts#L27-L33), [lib/types.ts:82-98](../lib/types.ts#L82-L98).
- 기본값: 형식별 단계 템플릿 `DEFAULT_STEPS`, 확인 규칙 `DEFAULT_GATES`, 구분 색 6개 `CHANNEL_COLORS` — [lib/types.ts:103-122](../lib/types.ts#L103-L122).

## 저장소 원시 함수 — `lib/data/store.ts`

| 함수 | 동작 | 근거 |
|---|---|---|
| `readJson` | 파일이 없으면(ENOENT) fallback. 파싱 실패는 삼키지 않고 던진다 | [lib/data/store.ts:19-29](../lib/data/store.ts#L19-L29) |
| `serialize` | 모듈 전역 Promise 큐 하나로 모든 쓰기를 순서대로 실행. 앞 작업이 실패해도 큐는 계속된다 | [lib/data/store.ts:31-38](../lib/data/store.ts#L31-L38) |
| `writeNow` / `writeJsonNow` | 디렉터리 생성 → `<파일>.<pid>.tmp` 작성 → `rename` 으로 교체. JSON 은 2칸 들여쓰기 + 끝 줄바꿈 | [lib/data/store.ts:40-50](../lib/data/store.ts#L40-L50) |
| `mutateJson` | `serialize` 안에서 읽기 → `fn` 으로 수정 → 원자적 쓰기, `fn` 반환값을 돌려줌 | [lib/data/store.ts:52-60](../lib/data/store.ts#L52-L60) |

직렬화는 한 Node 프로세스 안에서만 유효하다. 1인용 로컬 앱 전제다.

## 읽기 API — `lib/data/index.ts`

- `listChannels()`: `await connection()` 뒤 `channels.json` 을 읽는다 — [lib/data/index.ts:15-19](../lib/data/index.ts#L15-L19). `connection()` 은 렌더링이 실제 요청을 기다리게 해 프리렌더 대상에서 빠지게 한다(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`). `cacheComponents: true` 환경이라 이 함수를 쓰는 컴포넌트는 `<Suspense>` 안에 있다([UI](ui.md)).
- `getChannel(id)`: id 형식이 틀리면 `undefined` — [lib/data/index.ts:21-24](../lib/data/index.ts#L21-L24).
- `getChannelData(id)`: series·videos·tasks·credits 를 병렬로 읽고, 없는 파일은 빈 배열 — [lib/data/index.ts:26-42](../lib/data/index.ts#L26-L42).
- `readChannelLogo(id)`: `Channel.logo` 가 `logo.(png|jpg|webp)` 일 때만 읽어 MIME 타입과 함께 반환 — [lib/data/index.ts:91-102](../lib/data/index.ts#L91-L102).

## 쓰기 API와 호출 경로

쓰기 함수는 Server Action 에서만 호출한다 — [lib/data/index.ts:44](../lib/data/index.ts#L44). 모든 액션은 첫 줄에서 `requireSession()` 을 부른다([인증](auth.md)).

| 데이터 함수 | 동작 | 호출하는 액션 | 근거 |
|---|---|---|---|
| `updateVideo` | 영상 하나를 찾아 수정, `updatedAt` 갱신. 없으면 `false` | `cycleStep`, `toggleChecklist` | [lib/data/index.ts:53-61](../lib/data/index.ts#L53-L61), [app/c/[channel]/actions.ts:11-35](../app/c/[channel]/actions.ts#L11-L35) |
| `updateTask` | 작업 하나 수정, `updatedAt` 갱신 | `toggleTask` | [lib/data/index.ts:63-71](../lib/data/index.ts#L63-L71), [app/c/[channel]/actions.ts:37-45](../app/c/[channel]/actions.ts#L37-L45) |
| `initChannelFiles` | 빈 데이터 파일 5개를 없을 때만 만들고 로고를 쓴다 | `createChannel` | [lib/data/index.ts:73-89](../lib/data/index.ts#L73-L89), [app/channels/new/actions.ts:83](../app/channels/new/actions.ts#L83) |
| `addChannel` | `channels.json` 에 추가. 같은 id 가 있으면 `DUPLICATE` 예외 | `createChannel` | [lib/data/index.ts:46-51](../lib/data/index.ts#L46-L51), [app/channels/new/actions.ts:84-89](../app/channels/new/actions.ts#L84-L89) |

### 대시보드 액션 — `app/c/[channel]/actions.ts`

- `cycleStep`: 채널 템플릿에 있는 단계만, `skip` 이 아닌 경우 `STEP_STATES` 다음 값으로 바꾼다 — [app/c/[channel]/actions.ts:10-23](../app/c/[channel]/actions.ts#L10-L23).
- `toggleChecklist`: `checklist[index].done` 반전 — [app/c/[channel]/actions.ts:25-35](../app/c/[channel]/actions.ts#L25-L35).
- `toggleTask`: `Task.done` 반전 — [app/c/[channel]/actions.ts:37-45](../app/c/[channel]/actions.ts#L37-L45).
- 셋 다 끝에서 `refresh()` 로 클라이언트 라우터를 새로 고친다 — [app/c/[channel]/actions.ts:22](../app/c/[channel]/actions.ts#L22). (`refresh` 는 Server Action 안에서 클라이언트 라우터를 갱신 — `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`.)

### 채널 등록 액션 — `app/channels/new/actions.ts`

- 검증: 이름 1~40자, 핸들 `[A-Za-z0-9._-]{3,30}`(앞 `@` 제거), 쇼츠·롱폼 중 하나 이상 — [app/channels/new/actions.ts:33-47](../app/channels/new/actions.ts#L33-L47). 실패 시 `{ error, field }` 를 돌려줘 폼이 해당 필드를 표시한다 — [app/channels/new/actions.ts:8](../app/channels/new/actions.ts#L8).
- 채널 id = 핸들 소문자에서 영숫자 외를 `-` 로 바꾼 값. 이미 있으면 거부 — [app/channels/new/actions.ts:39-43](../app/channels/new/actions.ts#L39-L43).
- 로고: PNG·JPEG·WEBP, 2MB 이하 — [app/channels/new/actions.ts:10-15](../app/channels/new/actions.ts#L10-L15), [app/channels/new/actions.ts:49-56](../app/channels/new/actions.ts#L49-L56). Server Action 본문 기본 한도는 1MB 라서 `next.config.ts` 에서 `experimental.serverActions.bodySizeLimit: "3mb"` 로 올렸다 — [next.config.ts:5-9](../next.config.ts#L5-L9) (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`).
- 정규화: 색은 `CHANNEL_COLORS` 중 하나(아니면 첫 색), 업로드 시각 `HH:MM`, 주소는 `http(s)://` 일 때만, 주간 편수 0~14, 단계는 중복 제거·30자 이하·최대 12개, 확인 규칙은 `DEFAULT_GATES` 안의 값만 — [app/channels/new/actions.ts:17-28](../app/channels/new/actions.ts#L17-L28), [app/channels/new/actions.ts:58-81](../app/channels/new/actions.ts#L58-L81).
- 순서: 채널 파일 생성 → `channels.json` 등록 → `/c/<id>` 로 리다이렉트 — [app/channels/new/actions.ts:83-90](../app/channels/new/actions.ts#L83-L90).

## 로고 라우트 — `app/c/[channel]/logo/route.ts`

`GET /c/<채널id>/logo`: `readChannelLogo` 결과를 `private, max-age=300` 으로 응답, 없으면 404 — [app/c/[channel]/logo/route.ts:4-11](../app/c/[channel]/logo/route.ts#L4-L11). 인증은 proxy 가 맡는다 — [app/c/[channel]/logo/route.ts:3](../app/c/[channel]/logo/route.ts#L3).

## 앱에서 아직 쓰지 않는 데이터

- 영상·시리즈·작업·크레딧을 추가하는 화면은 없다. 빈 채널 안내가 `videos.json` 을 직접 편집하라고 말한다 — [app/c/[channel]/dashboard.tsx:286-296](../app/c/[channel]/dashboard.tsx#L286-L296).
- `Channel.gates` 는 등록 시 저장되지만 대시보드의 "확인 대기" 카드는 `tasks.json` 의 미완료 항목을 보여준다 — [app/c/[channel]/dashboard.tsx:99](../app/c/[channel]/dashboard.tsx#L99).
