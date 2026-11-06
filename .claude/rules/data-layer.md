---
paths:
  - "data/**"
  - "content/**"
  - "lib/**"
  - "app/**/actions.ts"
  - "app/**/*.actions.ts"
  - "app/api/mcp/**"
---

# 데이터 레이어 (git이 원본인 JSON)

1인용 앱. DB·ORM·외부 저장소를 도입하지 않는다. 원본은 저장소의 `data/`·`content/` 파일이고,
로컬에서는 파일시스템, 배포(Vercel)에서는 GitHub 브랜치(`GITHUB_BRANCH`)를 통해 같은 파일을 읽고 쓴다.

## 파일 배치 (채널 단위)

```
data/
  channels.json                 { "version": 1, "channels": Channel[] }
  <channelId>/
    series.json                 { "version": 1, "series": Series[] }
    videos.json                 { "version": 1, "videos": Video[] }
    plans.json                  { "version": 1, "weeks": WeekPlan[] }
    tasks.json                  { "version": 1, "tasks": Task[] }      확인 대기
    credits.json                { "version": 1, "credits": Credit[] }  유료 도구 잔량(수동 기록)
    logo.(png|jpg|webp)         채널 로고(선택)
content/<channelId>/<videoId>/
  brief.md · script.md · package.md · review.md
lib/data/             JSON 읽기/쓰기 유일한 진입점 (server-only)
  index.ts            UI(페이지·Server Action)용 함수
  videos.ts           MCP 도구용 도메인 함수(영상·주간 계획·긴 글)
  files.ts            경로·파싱·직렬화, "읽기 → 변경 → 커밋" 공통 흐름(mutate)
  store*.ts           저장 백엔드 (fs | github). 위 함수들은 Store 인터페이스만 의존
  schema.ts           zod 런타임 검증. lib/types.ts 와 타입 일치를 컴파일 타임에 검사
lib/types.ts          아래 타입의 단일 정의
```

`<channelId>` 는 채널 핸들에서 만든 kebab-case slug(`lockedlibrary`). 불변.
긴 글은 JSON에 넣지 말고 `content/` 마크다운에 둔다. JSON은 구조화된 상태와 짧은 확정 카피만.

## 스키마 (이 문서가 단일 출처 — 바꾸면 여기부터 고친다)

```ts
type Format = "short" | "long";
type StepState = "done" | "part" | "wait" | "skip";  // skip = 이 영상엔 해당 없음(진행률 제외)

interface Channel {
  id: string;                 // slug, 불변. data/<id>/ 와 일치
  name: string;
  handle: string;             // @ 없이
  color: string;              // 구분 색 #RRGGBB
  logo?: string;              // data/<id>/ 안의 파일명 (logo.jpg 등)
  url?: string;
  niche?: string;
  cadence: { shortsPerWeek: number; longPerWeek: number };  // 0이면 그 형식 안 함
  uploadTime?: string;        // "HH:MM" KST
  steps: Record<Format, string[]>;   // 형식별 제작 단계 이름(진행표 열)
  gates: string[];            // 확인 규칙 문구
  createdAt: string; updatedAt: string;
  // 아래는 선택. 콘텐츠 스킬이 쓴다.
  audience?: string; stage?: "<1k" | "1k-50k" | "50k+";
  pillars?: { id: string; name: string; description: string }[];
  voice?: { tone: string; do: string[]; dont: string[] };
}

interface Series { id: string; title: string; description?: string; createdAt: string; updatedAt: string }

type VideoStatus = "idea" | "research" | "scripting" | "packaging" | "filming"
  | "editing" | "scheduled" | "published" | "reviewed" | "dropped";

interface Video {
  id: string;                 // kebab-case slug, 채널 안에서 유일, 불변
  workingTitle: string;
  format: Format;
  status: VideoStatus;
  seriesId?: string;          // series.json 의 id
  episode?: number;           // 시리즈 안 순번(롱폼 합본은 생략)
  steps: Record<string, StepState>;  // 키 = channel.steps[format] 의 이름. 없으면 "wait"
  checklist?: { text: string; path?: string; done: boolean }[];
  copy?: { overlay?: string; coldOpen?: string; recap?: string; endCard?: string }; // overlay 줄바꿈은 \n
  pillarId?: string;
  promise?: string;
  parentId?: string;
  hook?: { formula: string; text: string; score?: number };
  package?: { titles: string[]; selectedTitle?: string; thumbnailText?: string; thumbnailConcept?: string };
  targetPublishDate?: string; // YYYY-MM-DD (KST)
  publishedAt?: string;       // ISO 8601
  youtubeId?: string;
  metrics: VideoMetrics[];    // 스냅샷 누적, 덮어쓰지 않음
  notes?: string;
  createdAt: string; updatedAt: string;
}

interface VideoMetrics {
  capturedAt: string; daysSincePublish: number;
  views?: number; impressions?: number; ctr?: number;
  avdSeconds?: number; avgPercentViewed?: number; retention30s?: number;
  subsGained?: number; returningViewersPct?: number;
}

interface WeekPlan {
  weekOf: string; hoursAvailable?: number;
  slots: { videoId: string; role: "anchor" | "cheap" | "short"; due?: string; done: boolean }[];
  retro?: string;
}

interface Task { id: string; text: string; detail?: string; videoId?: string; done: boolean; createdAt: string; updatedAt: string }
interface Credit { service: string; amount?: number; unit?: string; note?: string; recordedAt: string }
```

## 읽기/쓰기 규칙

- `lib/data/*` 파일 맨 위에 `import "server-only"`. 클라이언트 컴포넌트에서 직접 import 금지.
- **백엔드 선택**: env `DATA_STORE=github` 이면 GitHub(`GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`), 아니면 fs. 앱·MCP 코드는 백엔드를 직접 부르지 않고 `lib/data` 함수만 쓴다.
- **읽기**: fs는 `node:fs/promises`의 `readFile`만 쓴다. `readFileSync` 금지 — `cacheComponents`에서는 동기 읽기가 프리렌더 때 정적 셸에 구워져 데이터가 갱신되지 않는다. 페이지용 읽기 함수 첫 줄에 `await connection()` (`next/server`), 호출하는 컴포넌트는 `<Suspense>` 안에 둔다. github는 요청 시점에 대상 브랜치를 읽는다(캐시 없음) — 데이터 커밋은 재배포 없이 반영된다.
- **쓰기 경로**: Server Action(`"use server"`) 또는 MCP 도구(`app/api/mcp/route.ts`)에서만, 둘 다 `lib/data` 함수를 거친다. 쓰기 전 zod 스키마로 형태 확인. Server Action은 쓴 뒤 `refresh()` (`next/cache`).
- **fs 쓰기**: 원자적으로 같은 디렉터리에 `*.tmp` 작성 → `rename`. 모듈 단위 Promise 체인으로 직렬화. 파일 락 라이브러리는 쓰지 않는다.
- **github 쓰기**: 변경 1회 = 커밋 1개(Git Data API: blob → tree → commit → ref 갱신 `force: false`). ref 갱신이 fast-forward 실패하면 최신 커밋 기준으로 처음부터 한 번만 재시도, 또 실패하면 에러. 커밋 메시지는 한국어로 무엇을 바꿨는지 쓴다.
- 데이터(`data/`, `content/`)만 바뀐 커밋은 Vercel Ignored Build Step(`vercel.json`)으로 빌드를 건너뛴다.
- 파일이 없으면 빈 기본값으로 시작(`{ version: 1, videos: [] }` 등). 파싱 실패는 삼키지 말고 에러로 올린다 — 데이터 유실 방지.
- `version` 을 올리는 스키마 변경 시 마이그레이션 함수를 `lib/data/migrate.ts`에 추가하고, 기존 파일은 `data/backup/<timestamp>/`에 복사한 뒤 변환.
- 날짜: 저장은 ISO 문자열, 표시는 `Asia/Seoul`.
- `id`는 바꾸지 않는다. 삭제 대신 `status: "dropped"` 우선.
