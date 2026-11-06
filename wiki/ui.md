---
title: UI
summary: 통합 단계 보드(사이드바·6열 칸반·필터·side peek drawer)와 채널 등록·설정 화면, 공용 컴포넌트, 다크 테마 토큰과 폰트
sources:
  - app/layout.tsx
  - app/page.tsx
  - app/login/page.tsx
  - app/globals.css
  - app/c/[channel]/page.tsx
  - app/_board/board.tsx
  - app/_board/card.tsx
  - app/_board/drawer.tsx
  - app/_board/views.tsx
  - app/_board/video-editor.tsx
  - lib/board.ts
  - app/channels/new/page.tsx
  - app/channels/new/channel-form.tsx
  - components/app-header.tsx
  - components/channel-avatar.tsx
  - components/icons.tsx
  - lib/dashboard.ts
  - app/c/[channel]/settings/page.tsx
verified: 8cb76a328697ae0a
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
| `/` | `BoardData` 가 `getAllChannelData()` 로 모든 채널을 읽어 `Board` 에 넘김. 채널이 없으면 `/channels/new` 로 `redirect`. fallback 은 머리·사이드바·6열 자리 스켈레톤 | [app/page.tsx:7-34](../app/page.tsx#L7-L34) |
| `/c/[channel]` | `params` 를 기다린 뒤 `/?ch=<채널id>` 로 `redirect`(그 채널만 거른 보드) | [app/c/[channel]/page.tsx:4-16](../app/c/[channel]/page.tsx#L4-L16) |
| `/channels/new` | `NewChannel` 이 채널 목록을 읽어 폼에 넘김 | [app/channels/new/page.tsx:13-55](../app/channels/new/page.tsx#L13-L55) |

## 공용 컴포넌트 — `components/`

- `AppHeader`: 보드 밖 화면(채널 등록·설정)의 머리. 로고 링크, `children` 제목, 현재 시각(KST), `logout` Server Action 로그아웃 폼 — [components/app-header.tsx:6-25](../components/app-header.tsx#L6-L25).
- `ChannelAvatar`: 원형 로고. 테두리는 채널 구분 색. 로고가 있으면 `/c/<id>/logo?v=<updatedAt>` 를 `<img>` 로, 없으면 이름 첫 글자를 구분 색 명조체로 — [components/channel-avatar.tsx:3-38](../components/channel-avatar.tsx#L3-L38). `label` 이 거짓이면 장식(빈 alt / `aria-hidden`).
- `icons.tsx`: 선 아이콘 모음, 모두 `aria-hidden` — [components/icons.tsx:1-9](../components/icons.tsx#L1-L9). 목록은 [generated/files.md](generated/files.md).

## 통합 단계 보드 — `/` (`app/_board/`)

`Board` 는 Client Component 다. 서버가 넘긴 모든 채널 데이터로 보드 항목을 만들고, 화면 상태는 주소 쿼리에 둔다 — [app/_board/board.tsx:73-115](../app/_board/board.tsx#L73-L115). 보류(`dropped`) 영상은 보드에서 뺀다 — [app/_board/board.tsx:105](../app/_board/board.tsx#L105).

### 화면 상태는 주소 쿼리

`useSearchParams` 로 읽고 `window.history.pushState`/`replaceState` 로 바꾼다(Next.js 라우터와 동기화됨 — `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` "Native History API"). 그래서 새로고침·링크 공유·뒤로가기가 그대로 동작한다 — [app/_board/board.tsx:79-97](../app/_board/board.tsx#L79-L97).

| 키 | 뜻 |
|---|---|
| `view` | 사이드바 보기: 없음(모든 작업)·`week`·`risk`·`metrics`·`gates`·`manage` |
| `ch` | 채널 id(쉼표 구분). 없으면 모든 채널 |
| `fmt` · `ser` · `q` | 형식(`short`/`long`) · 시리즈(`<채널id>/<시리즈id>`) · 검색어(작업 제목·시리즈 이름·선택된 제목) |
| `item` · `edit` · `new` | drawer 에 연 영상(`<채널id>/<영상id>` — 영상 id 는 채널 안에서만 유일), 편집 모드(`1`), 새 영상을 넣을 채널 id |

### 구역

| 구역 | 내용 | 근거 |
|---|---|---|
| 머리 | 로고, 검색(⌘K·`/` 로 포커스), 현재 시각, "+ 새 영상"(선택한 채널 또는 첫 채널로 새 영상 drawer) | [app/_board/board.tsx:216-246](../app/_board/board.tsx#L216-L246) |
| 왼쪽 사이드바 | "보기"(모든 작업·이번 주 업로드·일정 위험·지표 기록 필요·확인 대기, 각각 개수), "채널"(맨 위 "모든 채널"이 기본 선택이고 전체 영상 수, 그 아래 채널마다 로고·이름·영상 수. 채널을 누르면 그 채널만, "모든 채널"을 누르면 통합), 채널 추가, 아래에 "채널 설정 · 시리즈 · 크레딧" 보기와 로그아웃. 넓은 화면에서 232px 세로 막대, 좁은 화면에서는 위에 쌓인다 | [app/_board/board.tsx:394-480](../app/_board/board.tsx#L394-L480) |
| 제목 줄 | 보기 이름 옆에 채널 필터가 없으면 "모든 채널 통합", 있으면 채널마다 로고·이름 칩(✕ 를 누르면 그 채널 필터 해제) | [app/_board/board.tsx:259-281](../app/_board/board.tsx#L259-L281) |
| 필터 줄 | 형식(전체/쇼츠/롱폼), 시리즈 선택(채널별 묶음), 결과 수(`aria-live`), 필터가 있으면 "필터 초기화" | [app/_board/board.tsx:288-327](../app/_board/board.tsx#L288-L327) |
| 6열 보드 | 열마다 단계 배지(기호 + 이름)와 개수. 카드를 다른 열에 끌어 놓으면 그 열의 첫 상태로 바뀐다. 빈 열은 그 열에 무엇이 오는지 안내(필터 중이면 "조건에 맞는 영상이 없습니다") | [app/_board/board.tsx:329-365](../app/_board/board.tsx#L329-L365), [app/_board/board.tsx:205-210](../app/_board/board.tsx#L205-L210) |
| drawer | 카드를 누르면 오른쪽에 열린다(아래 절) | [app/_board/board.tsx:370-387](../app/_board/board.tsx#L370-L387) |

보기 판정: 이번 주는 월~일(KST), 일정 위험·지표 기록 필요는 보드 항목의 플래그 — [app/_board/board.tsx:118-124](../app/_board/board.tsx#L118-L124). 사이드바 개수는 채널 필터만 적용한 값 — [app/_board/board.tsx:139-146](../app/_board/board.tsx#L139-L146). 카드 순서는 날짜(없으면 맨 뒤) → 화수 → 제목 — [app/_board/board.tsx:109-114](../app/_board/board.tsx#L109-L114).

### 변경은 낙관적으로

카드 이동·세부 단계·체크리스트·확인 대기는 `useOptimistic` 으로 화면에 먼저 반영하고 transition 안에서 Server Action 을 부른다. 세부 단계의 낙관적 반영도 서버와 같은 `syncReady` 를 써서 작업 완료 열로 바로 옮긴다 — [app/_board/board.tsx:36-65](../app/_board/board.tsx#L36-L65), [app/_board/board.tsx:189-210](../app/_board/board.tsx#L189-L210). 액션 목록은 [데이터](data.md).

### 키보드

`useEffectEvent` 핸들러 하나: ⌘K/Ctrl+K·`/` 검색, Esc drawer 닫기(편집 중이 아닐 때), j/k 거른 목록 안에서 다음·이전 영상. 입력칸에서는 ⌘K 만 받는다 — [app/_board/board.tsx:167-187](../app/_board/board.tsx#L167-L187). drawer 를 닫으면 연 카드로 포커스를 돌려준다 — [app/_board/board.tsx:155-160](../app/_board/board.tsx#L155-L160).

### 보드 계산 — `lib/board.ts`

- 열 6개와 상태 대응: 아이디어(`idea`) · 준비 중(`research`·`scripting`·`packaging`·`filming`) · 편집(`editing`) · 작업 완료(`ready`) · 예약됨(`scheduled`) · 게시됨(`published`·`reviewed`). 각 열의 첫 상태가 끌어 놓을 때 쓰는 값 — [lib/board.ts:19-29](../lib/board.ts#L19-L29). 상태 한국어 이름 — [lib/board.ts:5-17](../lib/board.ts#L5-L17).
- 열 색은 기호·이름과 함께 쓴다 — [lib/board.ts:31-39](../lib/board.ts#L31-L39).
- 보드 항목: 해당 세부 단계와 완료 수, 다음 단계(첫 미완료), 날짜·D-day, 연결된 미완료 확인 대기. **일정 위험** = 작업 완료 전 단계인데 예정일이 지났거나, 5일 안인데 세부 단계를 하나도 못 끝낸 영상. **지표 기록 필요** = 게시됐는데 `metrics` 가 비어 있음 — [lib/board.ts:45-97](../lib/board.ts#L45-L97).
- 이번 주(월~일) 범위와 D-day 표기 — [lib/board.ts:99-109](../lib/board.ts#L99-L109).
- 날짜 기초: 게시됐으면 `publishedAt`(KST 변환), 아니면 `targetPublishDate`. 게시 여부는 `publishedAt` 또는 상태 `published`/`reviewed`. 적용 단계는 템플릿에서 `skip` 을 뺀 것 — [lib/dashboard.ts:35-51](../lib/dashboard.ts#L35-L51).

### 카드 — `app/_board/card.tsx`

채널 로고(`ChannelAvatar` 18px, 대체 텍스트 = 채널 이름)와 시리즈·화(없으면 채널 이름), 형식(롱폼은 굵게), 제목 2줄, 세부 단계마다 한 칸인 막대(완료·일부·대기 색 + 칸마다 `title`), 다음 할 일, 확인 대기 수, 날짜와 D-day. 일정 위험이면 빨간 테두리와 ⚠ + 화면 낭독용 "일정 위험". `draggable` 이고 `data-card` 로 포커스 복귀 대상이 된다. drawer 가 열리면 간단히(로고 + 제목, "2화" 같은 짧은 제목엔 시리즈 이름을 붙임) — [app/_board/card.tsx:43-102](../app/_board/card.tsx#L43-L102).

### drawer — `app/_board/drawer.tsx`

목록을 가리지 않는 오른쪽 패널(넓은 화면 480px). 1024px 미만에서는 화면 전체를 덮는다. 열리면 제목으로 포커스를 옮긴다 — [app/_board/drawer.tsx:59](../app/_board/drawer.tsx#L59), [app/_board/drawer.tsx:73-125](../app/_board/drawer.tsx#L73-L125). 위쪽 막대에 ↑/↓(이전·다음)와 위치, 편집, 닫기.

| 모드 | 내용 | 근거 |
|---|---|---|
| 보기 | 채널 로고·이름 › 시리즈 › 화 · 형식, 제목 → 6단계 진행선(누르면 그 열로 이동) → 일정 위험 안내 → 다음 행동 상자(다음 세부 단계 "완료로 표시" / 작업 완료면 "예약됨으로" / 예약됨이면 "게시됨으로" / 지표 기록 필요 안내) → 업로드일·D-day, 정확한 상태 선택, 유튜브 링크 → 세부 단계 버튼(대기→일부→완료, 캡컷 단계가 남았으면 "Mac에서만" 안내) → 확인 대기("확인함") → 체크리스트 → 확정 카피 → 약속 일치(시청자 약속·훅·제목·썸네일 문구, 읽기 전용) → 지표(게시됨일 때 최신 스냅샷) → 메모 | [app/_board/drawer.tsx:129-376](../app/_board/drawer.tsx#L129-L376) |
| 편집 | `VideoEditor` 를 drawer 안에서 연다 | [app/_board/drawer.tsx:116-120](../app/_board/drawer.tsx#L116-L120) |
| 새 영상 | 채널 선택(여러 채널일 때) + `VideoEditor`. 기본 형식은 채널 주기에서 쇼츠 우선 | [app/_board/drawer.tsx:97-115](../app/_board/drawer.tsx#L97-L115), [app/_board/drawer.tsx:61-70](../app/_board/drawer.tsx#L61-L70) |

### 영상 편집기 — `app/_board/video-editor.tsx`

탭 4개(기본 · 카피 · 체크리스트 · 게시·메모). 숨긴 탭의 입력도 `hidden` 속성으로 폼에 남아 함께 저장된다 — [app/_board/video-editor.tsx:13-21](../app/_board/video-editor.tsx#L13-L21), [app/_board/video-editor.tsx:94-112](../app/_board/video-editor.tsx#L94-L112).

- 기본: 제목, 새 영상만 id(나중에 못 바꿈), 형식, 시리즈·화수, 게시 예정일, 제작 단계(`dropped` 제외), 이 영상에 해당 없는 단계 — [app/_board/video-editor.tsx:112-172](../app/_board/video-editor.tsx#L112-L172).
- 카피·체크리스트·게시·메모 — [app/_board/video-editor.tsx:174-224](../app/_board/video-editor.tsx#L174-L224).
- 하이드레이션 뒤에는 `onSubmit` 에서 `startTransition` 으로 보내 오류 때 입력이 지워지지 않는다. 오류 칸이 있는 탭으로 넘어가고, 저장되면(`saved`) 부모에 알려 보기 모드로 돌아간다 — [app/_board/video-editor.tsx:43-55](../app/_board/video-editor.tsx#L43-L55), [app/_board/video-editor.tsx:71-82](../app/_board/video-editor.tsx#L71-L82).
- 보류로 내리기(사유 필수)는 `<details>` 안 폼, 끝나면 drawer 를 닫는다 — [app/_board/video-editor.tsx:235-262](../app/_board/video-editor.tsx#L235-L262).

### 다른 보기 — `app/_board/views.tsx`

- 확인 대기: 모든 채널(채널 필터 적용)의 미완료 할 일. 영상에 연결된 것은 "열기"로 drawer, "확인함"으로 완료. 아래에 할 일 추가 폼(채널 → 그 채널 영상만 연결 선택) — [app/_board/views.tsx:17-91](../app/_board/views.tsx#L17-L91).
- 채널 설정 · 시리즈 · 크레딧: 채널마다 설정 링크, 시리즈 목록(편수)과 추가, 크레딧 기록(이름을 지우면 그 줄 삭제), 끝에 새 채널 등록 — [app/_board/views.tsx:93-158](../app/_board/views.tsx#L93-L158).

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
