---
title: UI
summary: 라우트별 화면(리다이렉트·로그인·채널 대시보드·채널 등록), 공용 컴포넌트, 다크 테마 토큰과 폰트
sources:
  - app/layout.tsx
  - app/page.tsx
  - app/login/page.tsx
  - app/globals.css
  - app/c/[channel]/page.tsx
  - app/c/[channel]/dashboard.tsx
  - app/channels/new/page.tsx
  - app/channels/new/channel-form.tsx
  - components/app-header.tsx
  - components/channel-avatar.tsx
  - components/icons.tsx
  - lib/dashboard.ts
  - app/c/[channel]/video-editor.tsx
  - app/c/[channel]/settings/page.tsx
verified: 5a54b158430e20d8
---

# UI

전체 라우트 목록은 [generated/routes.md](generated/routes.md). 로그인 화면은 [인증](auth.md), 화면이 부르는 Server Action 과 파일 쓰기는 [데이터](data.md)에서 다룬다.

## 루트 레이아웃 — `app/layout.tsx`

- 폰트: `next/font/google` 의 Noto Sans KR(본문), Nanum Myeongjo(제목용 명조), JetBrains Mono(숫자·날짜)를 CSS 변수로 주입. 앞의 둘은 `preload: false` — [app/layout.tsx:2](../app/layout.tsx#L2), [app/layout.tsx:5-23](../app/layout.tsx#L5-L23).
- `metadata`: 제목 "업로드맵", 설명 "유튜브 채널 계획·제작 진행·업로드 일정 관리" — [app/layout.tsx:25-28](../app/layout.tsx#L25-L28). 로그인·채널 등록 페이지는 자체 `metadata.title` 을 둔다 — [app/login/page.tsx:6](../app/login/page.tsx#L6), [app/channels/new/page.tsx:11](../app/channels/new/page.tsx#L11).
- `<html lang="ko">`, `<body>` 는 `min-h-full flex flex-col text-sm leading-normal` — [app/layout.tsx:30-38](../app/layout.tsx#L30-L38).

## 스타일 — `app/globals.css`

- Tailwind v4 를 `@import "tailwindcss"` 로 로드 — [app/globals.css:1](../app/globals.css#L1).
- 다크 화면 하나만 쓴다. 라이트/다크 전환이나 `prefers-color-scheme` 분기는 없다 — [app/globals.css:3-7](../app/globals.css#L3-L7), [app/globals.css:34-39](../app/globals.css#L34-L39) (`color-scheme: dark`).
- `@theme inline` 색 토큰(→ `bg-*`, `text-*`, `border-*` 유틸리티): 면 `ink`·`bar`·`panel`·`raised`, 선 `line`·`line-strong`, 글자 `fg`·`fg-2`·`muted`·`faint`, 강조 `accent`·`accent-2`·`accent-ink`·`accent-wash`, 경고 `danger`·`danger-2`·`danger-wash` — [app/globals.css:9-28](../app/globals.css#L9-L28).
- 폰트 토큰 `font-sans`/`font-serif`/`font-mono` 를 레이아웃의 폰트 변수에 연결, `body` 기본 글꼴은 `font-sans` — [app/globals.css:29-31](../app/globals.css#L29-L31), [app/globals.css:37](../app/globals.css#L37).

## 데이터를 읽는 페이지와 Suspense

`cacheComponents: true` 에서 요청마다 달라지는 데이터는 `<Suspense>` 안에서 읽어야 한다(`node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`). 그래서 데이터를 읽는 페이지는 모두 바깥 페이지 컴포넌트가 Suspense 경계만 두고 안쪽 async 컴포넌트가 읽는다.

| 라우트 | 동작 | 근거 |
|---|---|---|
| `/` | 첫 채널의 `/c/<id>` 로, 채널이 없으면 `/channels/new` 로 `redirect` | [app/page.tsx:5-17](../app/page.tsx#L5-L17) |
| `/c/[channel]` | `Dashboard` 를 Suspense 로 감싸고 헤더·카드 자리 스켈레톤을 fallback 으로 | [app/c/[channel]/page.tsx:4-27](../app/c/[channel]/page.tsx#L4-L27) |
| `/channels/new` | `NewChannel` 이 채널 목록을 읽어 폼에 넘김 | [app/channels/new/page.tsx:13-55](../app/channels/new/page.tsx#L13-L55) |

## 공용 컴포넌트 — `components/`

- `AppHeader`: 로고 링크, 채널 전환 메뉴, 현재 시각(KST), 로그아웃 폼 — [components/app-header.tsx:8-70](../components/app-header.tsx#L8-L70).
  - 채널 전환은 JS 없이 `<details>`/`<summary>` 로 연다. 항목마다 아바타·이름·`weekText`(니치 + 이번 주 쇼츠·롱폼 수), 맨 아래 "+ 새 채널 등록" — [components/app-header.tsx:27-56](../components/app-header.tsx#L27-L56).
  - `current` 가 없으면 메뉴 대신 `children` 을 제목으로 표시(채널 등록 화면) — [components/app-header.tsx:57-59](../components/app-header.tsx#L57-L59).
  - 로그아웃 버튼은 `logout` Server Action 폼 — [components/app-header.tsx:63-67](../components/app-header.tsx#L63-L67).
- `ChannelAvatar`: 원형 로고. 테두리는 채널 구분 색. 로고가 있으면 `/c/<id>/logo?v=<updatedAt>` 를 `<img>` 로, 없으면 이름 첫 글자를 구분 색 명조체로 — [components/channel-avatar.tsx:3-38](../components/channel-avatar.tsx#L3-L38). `label` 이 거짓이면 장식(빈 alt / `aria-hidden`).
- `icons.tsx`: 선 아이콘 모음, 모두 `aria-hidden` — [components/icons.tsx:1-9](../components/icons.tsx#L1-L9). 목록은 [generated/files.md](generated/files.md).

## 채널 대시보드 — `/c/[channel]` (`app/c/[channel]/dashboard.tsx`)

Server Component. 모든 채널과 각 채널 데이터를 읽고 없는 채널이면 `notFound()` — [app/c/[channel]/dashboard.tsx:48-59](../app/c/[channel]/dashboard.tsx#L48-L59). 날짜 계산은 `lib/dashboard.ts` 의 순수 함수로 하며 모두 Asia/Seoul 기준 `YYYY-MM-DD` 문자열이다 — [lib/dashboard.ts:1-9](../lib/dashboard.ts#L1-L9).

### 화면 상태는 URL 쿼리

`s`(시리즈), `v`(선택 영상), `fmt`(형식 필터), `edit`(편집 패널에 열 영상 id, 새 영상은 `new`)를 쿼리로 들고 링크로만 바꾼다 — [app/c/[channel]/dashboard.tsx:36](../app/c/[channel]/dashboard.tsx#L36), [app/c/[channel]/dashboard.tsx:95-101](../app/c/[channel]/dashboard.tsx#L95-L101). `edit` 은 링크가 직접 넘길 때만 붙고 다른 링크로 옮겨 가면 빠진다.

- 시리즈 묶음: `series.json` 순서, 시리즈 없는 영상은 "단독 영상"(`_solo`). `dropped` 영상은 제외 — [app/c/[channel]/dashboard.tsx:69-80](../app/c/[channel]/dashboard.tsx#L69-L80).
- 기본 시리즈는 다음 업로드 영상이 속한 묶음, 기본 선택 영상은 그 영상(같은 묶음일 때) 또는 첫 행 — [app/c/[channel]/dashboard.tsx:82-90](../app/c/[channel]/dashboard.tsx#L82-L90).

### 구역 (위에서 아래로)

| 구역 | 내용 | 근거 |
|---|---|---|
| 헤더 | `AppHeader` + 각 채널의 이번 주 쇼츠/롱폼 수 | [app/c/[channel]/dashboard.tsx:65-68](../app/c/[channel]/dashboard.tsx#L65-L68), [app/c/[channel]/dashboard.tsx:128](../app/c/[channel]/dashboard.tsx#L128) |
| 모든 채널 · 이번 주 업로드 | 채널마다 로고·다음 업로드·쇼츠/롱폼 수 카드(현재 채널은 구분 색 테두리 + "보는 중"), 끝에 새 채널 등록 링크 | [app/c/[channel]/dashboard.tsx:132-170](../app/c/[channel]/dashboard.tsx#L132-L170) |
| 도구 줄 | 묶음이 둘 이상이면 시리즈 탭, 「+ 시리즈」 펼침 폼, 「채널 설정」 링크, 「영상 추가」(`edit=new`) | [app/c/[channel]/dashboard.tsx:174-198](../app/c/[channel]/dashboard.tsx#L174-L198) |
| 시리즈 제목 + 진행률 | 형식별 편수, `완료 단계 / 전체 단계` 막대 | [app/c/[channel]/dashboard.tsx:204-224](../app/c/[channel]/dashboard.tsx#L204-L224) |
| 요약 카드 3개 | 다음 업로드(D-day, 남은 단계, 단계 막대) · 확인 대기(`tasks.json` 미완료, 항목별 완료 버튼, 「확인할 일 추가」 펼침 폼) · 남은 크레딧(수동 기록, 최근 기록일, 「크레딧 기록」 펼침 폼) | [app/c/[channel]/dashboard.tsx:226-231](../app/c/[channel]/dashboard.tsx#L226-L231), [app/c/[channel]/dashboard.tsx:410-550](../app/c/[channel]/dashboard.tsx#L410-L550) |
| 화별 진행 | 형식 필터(전체/쇼츠/롱폼, 두 형식이 섞일 때만), 영상 × 단계 표. 영상 제목 옆 연필 링크가 `edit=<id>` 로 편집 패널을 연다. 칸은 `cycleStep` 폼 버튼으로 대기→일부→완료 순환, 해당 없는 단계는 "해당 없음", "업로드" 칸이 대기면 "예정" | [app/c/[channel]/dashboard.tsx:233-322](../app/c/[channel]/dashboard.tsx#L233-L322), [app/c/[channel]/dashboard.tsx:287](../app/c/[channel]/dashboard.tsx#L287), [app/c/[channel]/dashboard.tsx:390-408](../app/c/[channel]/dashboard.tsx#L390-L408) |
| 선택 영상 상세 | 확정 카피(제목 오버레이·콜드오픈·지난 이야기·엔드카드, 유튜브 링크)와 남은 작업 체크리스트(`toggleChecklist`). 조립 단계가 남았으면 "캡컷이 있는 Mac에서만" 안내 | [app/c/[channel]/dashboard.tsx:552-645](../app/c/[channel]/dashboard.tsx#L552-L645) |
| 업로드 일정 | 오늘부터 8일 칸, 날짜별 영상과 게시 여부 | [app/c/[channel]/dashboard.tsx:647-686](../app/c/[channel]/dashboard.tsx#L647-L686) |

시리즈도 단독 영상도 없으면 시리즈 제목 이하 구역 대신 빈 채널 안내(도구 줄로 시리즈·영상을 만들라는 문구)를 보인다 — [app/c/[channel]/dashboard.tsx:200-201](../app/c/[channel]/dashboard.tsx#L200-L201), [app/c/[channel]/dashboard.tsx:336-344](../app/c/[channel]/dashboard.tsx#L336-L344).

펼침 폼(시리즈·확인할 일·크레딧)은 헤더 채널 메뉴처럼 JS 없이 `<details>` 로 연다 — [app/c/[channel]/dashboard.tsx:350-367](../app/c/[channel]/dashboard.tsx#L350-L367), [app/c/[channel]/dashboard.tsx:485-504](../app/c/[channel]/dashboard.tsx#L485-L504), [app/c/[channel]/dashboard.tsx:529-546](../app/c/[channel]/dashboard.tsx#L529-L546). 크레딧 폼은 기존 서비스마다 한 줄 + 빈 줄 하나를 보이고, 서비스 이름을 지우면 그 줄이 빠진다.

### 영상 편집 패널 — `app/c/[channel]/video-editor.tsx`

`edit` 이 `new` 이거나 보류되지 않은 영상 id 면 대시보드 오른쪽에 `<aside>` 로 연다. 넓은 화면에서는 본문 옆에 붙어(`lg:sticky`) 따로 스크롤되고, 좁은 화면에서는 본문 위로 올라간다 — [app/c/[channel]/dashboard.tsx:105-124](../app/c/[channel]/dashboard.tsx#L105-L124), [app/c/[channel]/dashboard.tsx:130-131](../app/c/[channel]/dashboard.tsx#L130-L131), [app/c/[channel]/dashboard.tsx:330](../app/c/[channel]/dashboard.tsx#L330). 새 영상의 기본 시리즈는 보고 있던 묶음, 기본 형식은 채널이 쇼츠를 하면 쇼츠다.

- Client Component. 탭 4개(기본·카피·체크리스트·게시·메모)는 클라이언트 상태이고, 숨긴 탭은 `hidden` 속성이라 입력이 폼에 남아 함께 저장된다 — [app/c/[channel]/video-editor.tsx:27-35](../app/c/[channel]/video-editor.tsx#L27-L35), [app/c/[channel]/video-editor.tsx:102-120](../app/c/[channel]/video-editor.tsx#L102-L120).
- 기본 탭: 작업 제목, (새 영상만) id, 형식, 시리즈·화수, 게시 예정일, 제작 단계(`dropped` 제외), 채널 템플릿 중 해당 없는 단계(`skip`) — [app/c/[channel]/video-editor.tsx:120-180](../app/c/[channel]/video-editor.tsx#L120-L180). 카피 탭: 오버레이·콜드오픈·지난 이야기·엔드카드 — [app/c/[channel]/video-editor.tsx:182-199](../app/c/[channel]/video-editor.tsx#L182-L199). 체크리스트 탭: 항목·파일 경로·완료 추가/삭제, JSON 으로 hidden 필드 전송 — [app/c/[channel]/video-editor.tsx:93](../app/c/[channel]/video-editor.tsx#L93), [app/c/[channel]/video-editor.tsx:201-220](../app/c/[channel]/video-editor.tsx#L201-L220). 게시·메모 탭: 유튜브 영상 ID, 메모 — [app/c/[channel]/video-editor.tsx:222-232](../app/c/[channel]/video-editor.tsx#L222-L232).
- 제출: 하이드레이션 뒤에는 `onSubmit` 에서 `startTransition(() => action(fd))` 로 보낸다. 폼 `action` 으로 보내면 끝난 뒤 입력이 초기화돼 오류 때 고친 값이 사라지기 때문이다. `action` 속성은 JS 가 붙기 전 제출용으로 함께 둔다 — [app/c/[channel]/video-editor.tsx:79-90](../app/c/[channel]/video-editor.tsx#L79-L90).
- 오류가 오면 그 칸이 있는 탭으로 넘긴다(렌더 중 상태 갱신) — [app/c/[channel]/video-editor.tsx:56-61](../app/c/[channel]/video-editor.tsx#L56-L61).
- 기존 영상에는 「보류로 내리기」 펼침 폼(사유 필수, `dropVideo`)이 있다 — [app/c/[channel]/video-editor.tsx:242-255](../app/c/[channel]/video-editor.tsx#L242-L255).

### 계산 규칙 — `lib/dashboard.ts`

- 영상의 날짜: 게시됐으면 `publishedAt`(KST 변환), 아니면 `targetPublishDate` — [lib/dashboard.ts:35-38](../lib/dashboard.ts#L35-L38). 게시 여부는 `publishedAt` 또는 상태 `published`/`reviewed` — [lib/dashboard.ts:40-42](../lib/dashboard.ts#L40-L42).
- 적용 단계: 채널 템플릿에서 영상이 `skip` 으로 표시한 단계를 뺀 것. 진행률은 `dropped` 를 빼고 적용 단계 중 `done` 수를 센다 — [lib/dashboard.ts:44-64](../lib/dashboard.ts#L44-L64).
- 진행표 열: 묶음에 있는 형식의 단계를 쇼츠→롱폼 순으로 합침 — [lib/dashboard.ts:66-75](../lib/dashboard.ts#L66-L75).
- 다음 업로드: 미게시·미폐기이고 목표일이 오늘 이후인 영상 중 가장 이른 것 — [lib/dashboard.ts:77-81](../lib/dashboard.ts#L77-L81).
- "이번 주"는 달력 주가 아니라 오늘부터 7일(오늘 + 6일) — [lib/dashboard.ts:83-91](../lib/dashboard.ts#L83-L91).

## 채널 등록·설정 — `/channels/new`, `/c/[channel]/settings` (`app/channels/new/channel-form.tsx`)

같은 Client Component 를 쓴다. `initial`(기존 채널)이 있으면 설정 화면으로 `updateChannelSettings`, 없으면 등록 화면으로 `createChannel` 을 `useActionState` 로 부르고 오류와 오류 필드를 받는다 — [app/channels/new/channel-form.tsx:16-17](../app/channels/new/channel-form.tsx#L16-L17), [app/channels/new/channel-form.tsx:71-76](../app/channels/new/channel-form.tsx#L71-L76).

| 구역 | 내용 | 근거 |
|---|---|---|
| 기본 정보 | 로고 파일(PNG·JPG·WEBP, `createObjectURL` 미리보기·지우기. 설정 화면은 저장된 로고를 먼저 보임), 채널 이름, 핸들(폴더 이름 미리보기 `data/<slug>/`, 설정 화면은 읽기 전용), 주소, 니치, 구분 색 6개(이미 쓰는 색은 뒤로, "사용 중" 표시) | [app/channels/new/channel-form.tsx:21-25](../app/channels/new/channel-form.tsx#L21-L25), [app/channels/new/channel-form.tsx:78-190](../app/channels/new/channel-form.tsx#L78-L190) |
| 형식 · 업로드 주기 | 쇼츠/롱폼 켜기, 주간 편수 −/+ (0~14), 기본 업로드 시각(등록 기본 00:45) | [app/channels/new/channel-form.tsx:192-227](../app/channels/new/channel-form.tsx#L192-L227) |
| 제작 단계 템플릿 | 켠 형식마다 단계 칩 추가·삭제, JSON 으로 hidden 필드 전송. 등록 기본값 `DEFAULT_STEPS`. 설정 화면은 이름을 바꾸거나 빼면 그 단계의 기존 진행 상태가 표에 안 보인다고 안내 | [app/channels/new/channel-form.tsx:229-267](../app/channels/new/channel-form.tsx#L229-L267) |
| 확인 규칙 | `DEFAULT_GATES` 체크박스(등록은 앞 3개, 설정은 저장된 값) | [app/channels/new/channel-form.tsx:269-278](../app/channels/new/channel-form.tsx#L269-L278) |
| 미리보기 | 채널 전환 메뉴 모양(다른 채널 + 이 채널), 등록 화면만 만들어질 파일 목록 | [app/channels/new/channel-form.tsx:288-313](../app/channels/new/channel-form.tsx#L288-L313) |

기존 채널 목록은 서버 페이지가 `ChannelAvatar` 로 렌더해 `existing` prop 으로 넘긴다 — [app/channels/new/page.tsx:36-51](../app/channels/new/page.tsx#L36-L51). 등록 화면은 채널이 하나 이상이면 "대시보드로" 링크를 보인다 — [app/channels/new/page.tsx:30-35](../app/channels/new/page.tsx#L30-L35). 설정 화면은 없는 채널이면 `notFound()`, 자기 채널을 뺀 목록과 색을 넘긴다 — [app/c/[channel]/settings/page.tsx:22-57](../app/c/[channel]/settings/page.tsx#L22-L57).
