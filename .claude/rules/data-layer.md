---
paths:
  - "data/**"
  - "content/**"
  - "lib/**"
  - "app/**/actions.ts"
  - "app/**/*.actions.ts"
---

# 데이터 레이어 (로컬 JSON)

1인용 로컬 앱. DB·ORM·외부 저장소를 도입하지 않는다.

## 파일 배치

```
data/
  channel.json        채널 프로필 (필러, 보이스, 주기) — 단일 객체
  videos.json         { "version": 1, "videos": Video[] }
  plans.json          { "version": 1, "weeks": WeekPlan[] }
content/videos/<id>/
  brief.md            리서치 브리프
  script.md           대본 (훅 포함)
  package.md          제목 후보·썸네일 브리프
  review.md           성과 회고
lib/data/             JSON 읽기/쓰기 유일한 진입점 (server-only)
lib/types.ts          아래 타입의 단일 정의
```

긴 글은 JSON에 넣지 말고 `content/` 마크다운에 둔다. JSON은 구조화된 상태만.

## 스키마 (이 문서가 단일 출처 — 바꾸면 여기부터 고친다)

```ts
type VideoStatus = "idea" | "research" | "scripting" | "packaging" | "filming"
  | "editing" | "scheduled" | "published" | "reviewed" | "dropped";

interface Video {
  id: string;                 // kebab-case slug, 불변. content/videos/<id>/ 와 일치
  workingTitle: string;
  format: "long" | "short";
  pillarId: string;           // channel.pillars[].id
  status: VideoStatus;
  promise?: string;           // 시청자에게 하는 약속 한 문장
  parentId?: string;          // 쇼츠가 잘려 나온 롱폼 id
  hook?: { formula: string; text: string; score?: number };
  package?: { titles: string[]; selectedTitle?: string; thumbnailText?: string; thumbnailConcept?: string };
  targetPublishDate?: string; // YYYY-MM-DD
  publishedAt?: string;       // ISO 8601
  youtubeId?: string;
  metrics: VideoMetrics[];    // 스냅샷 누적, 덮어쓰지 않음
  notes?: string;
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}

interface VideoMetrics {
  capturedAt: string;         // ISO 8601
  daysSincePublish: number;   // 보통 2(48h), 7, 28
  views?: number; impressions?: number; ctr?: number;
  avdSeconds?: number; avgPercentViewed?: number; retention30s?: number;
  subsGained?: number; returningViewersPct?: number;
}

interface WeekPlan {
  weekOf: string;             // 그 주 월요일 YYYY-MM-DD
  hoursAvailable?: number;
  slots: { videoId: string; role: "anchor" | "cheap" | "short"; due?: string; done: boolean }[];
  retro?: string;
}

interface Channel {
  name: string; niche: string; audience: string;
  stage: "<1k" | "1k-50k" | "50k+";
  pillars: { id: string; name: string; description: string }[];
  voice: { tone: string; do: string[]; dont: string[] };
  cadence: { longPerWeek: number; shortsPerWeek: number };
}
```

## 읽기/쓰기 규칙

- `lib/data/*` 파일 맨 위에 `import "server-only"`. 클라이언트 컴포넌트에서 직접 import 금지.
- **읽기**: `node:fs/promises`의 `readFile`만 쓴다. `readFileSync` 금지 — `cacheComponents`에서는 동기 읽기가 프리렌더 때 정적 셸에 구워져 데이터가 갱신되지 않는다. 읽기 함수 첫 줄에 `await connection()` (`next/server`), 호출하는 컴포넌트는 `<Suspense>` 안에 둔다.
- **쓰기**: Server Action(`"use server"`)에서만. 원자적으로: 같은 디렉터리에 `*.tmp` 작성 → `rename`. 쓰기 전 런타임 검증 함수로 형태 확인. 쓴 뒤 `refresh()` (`next/cache`).
- 쓰기는 모듈 단위 Promise 체인으로 직렬화(같은 파일 동시 쓰기 방지). 파일 락 라이브러리는 쓰지 않는다.
- 파일이 없으면 빈 기본값으로 시작(`{ version: 1, videos: [] }`). 파싱 실패는 삼키지 말고 에러로 올린다 — 데이터 유실 방지.
- `version` 을 올리는 스키마 변경 시 마이그레이션 함수를 `lib/data/migrate.ts`에 추가하고, 기존 파일은 `data/backup/<timestamp>/`에 복사한 뒤 변환.
- 날짜: 저장은 ISO 문자열, 표시는 `Asia/Seoul`.
- `id`는 바꾸지 않는다. 삭제 대신 `status: "dropped"` 우선.
