# 원격 MCP로 진행 상황 갱신

목표: claude.ai 채팅(웹·모바일)에서 영상을 기획·제작하면서 Claude가 MCP 도구로 `data/*.json`·`content/` 를 갱신하고, 그 변경이 GitHub 커밋으로 남아 배포된 앱에 바로 보이게 한다.

안 할 것:
- DB·KV·Blob 같은 런타임 저장소 (git이 원본이라는 원칙 유지)
- OAuth 인가 서버 (1인용이므로 정적 Bearer 토큰으로 시작)
- 범용 파일 쓰기 도구 (`write_file` 등) — 도메인 단위 도구만
- 유튜브 API 연동, 지표 자동 수집
- 여러 변경을 한 커밋으로 묶는 배치 도구 (필요해지면 추가)

참고 문서:
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (Cache Components에서 Route Handler 동작)
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` (UI 접근 제한)
- `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`
- `mcp-handler` 2.x README (`createMcpHandler`, `withMcpAuth`)
- claude.ai 커스텀 커넥터 인증: https://claude.com/docs/connectors/building/authentication.md

---

## 1. 구조

```
claude.ai 채팅 ──Streamable HTTP + Bearer──▶ Vercel  app/api/mcp/route.ts
                                                │  zod 검증 → 도메인 규칙 적용
                                                ▼
                                        lib/data (저장 어댑터: github)
                                                │  Git Data API로 커밋 1개
                                                ▼
                                          GitHub main 브랜치
                                                ▲
브라우저 ──Basic Auth──▶ Vercel 페이지 ──────────┘  요청마다 main에서 읽음
```

핵심 결정: **배포된 앱은 데이터를 번들 파일이 아니라 GitHub `main`에서 요청 시점에 읽는다.**
- 그래서 MCP가 커밋하면 재배포를 기다리지 않고 다음 새로고침에 바로 보인다.
- 데이터만 바뀐 커밋은 Vercel 빌드를 건너뛴다(§6). 커밋마다 빌드가 도는 문제도 없어진다.
- 대가: 페이지 요청마다 GitHub API 호출이 몇 번 생긴다(100~300ms). 1인 사용량이면 rate limit(토큰 기준 시간당 5,000회)과는 거리가 멀다.

## 2. 저장 어댑터 (`lib/data/`)

UI의 Server Action과 MCP 도구가 **같은 함수**를 쓴다. 바뀌는 건 저장소 백엔드뿐이다.

```
lib/data/
  store.ts        interface Store { read(paths): Snapshot; commit(changes, message): void }
  store-fs.ts     로컬 개발용. readFile + tmp→rename (현재 data-layer 규칙 그대로)
  store-github.ts 배포용. GitHub REST API
  schema.ts       zod 스키마 (lib/types.ts 와 타입이 일치하는지 컴파일 타임에 검사)
  videos.ts ...   도메인 함수: getVideos, setStatus, addMetrics ... (Store만 의존)
```

- 백엔드 선택: `DATA_STORE=github` 이면 GitHub, 아니면 fs. 로컬 `npm run dev` 는 기본 fs.
- 로컬 fs 데이터는 MCP가 만든 커밋보다 뒤처질 수 있다 → 로컬 작업 전 `git pull`.

### GitHub 쓰기 = 원자적 커밋 1개
영상 상태 변경과 대본 저장처럼 여러 파일을 한 번에 바꿀 수 있어야 하므로 Contents API(파일 1개 단위)가 아니라 Git Data API를 쓴다.

1. `GET refs/heads/main` → 현재 커밋 sha `S`
2. `S` 시점의 파일 읽기 → 도메인 함수로 변경 계산 → zod 검증
3. 바뀐 파일마다 blob 생성 → `base_tree = S` 로 tree 생성 → 부모 `S` 로 commit 생성
4. `PATCH refs/heads/main` (`force: false`)
5. 4에서 fast-forward가 아니라고 실패하면(그 사이 다른 커밋이 생김) 1부터 **한 번만** 다시 하고, 또 실패하면 에러를 돌려준다.

이 방식이면 "읽은 시점 이후에 바뀐 걸 덮어쓰는" 문제를 git이 막아 준다. 모듈 단위 Promise 체인은 fs 백엔드에만 남긴다.

커밋 메시지(한국어): `진행: <videoId> 상태 scripting → packaging`, `대본: <videoId> script.md 저장` 처럼 도구가 자동으로 만든다. 작성자는 봇 이름으로 구분한다.

## 3. MCP 도구

`createMcpHandler` 의 `instructions` 에 `.claude/rules/youtube-domain.md` 의 요지(단계 표, 약속 일치 원칙, KPI 해석 규칙, "수치를 지어내지 말 것")를 넣는다. claude.ai에는 이 저장소의 `.claude/skills` 가 없기 때문에 도메인 규칙은 이 경로로만 전달된다.

읽기:
| 도구 | 입력 | 하는 일 |
|---|---|---|
| `get_overview` | — | 채널 요약, 단계별 영상 수, 이번 주 슬롯, 마감 지남·지표 기록 필요 목록 (`yt-status` 와 같은 기준) |
| `list_videos` | `status?`, `pillarId?` | 영상 목록(요약 필드만) |
| `get_video` | `id`, `include?: ("brief"\|"script"\|"package"\|"review")[]` | 영상 레코드 + 요청한 마크다운 |
| `get_week` | `weekOf?` (기본: 이번 주 월요일, Asia/Seoul) | 주간 계획 |

쓰기 (도구 1번 호출 = 커밋 1개):
| 도구 | 입력 | 규칙 |
|---|---|---|
| `create_video` | `id`, `workingTitle`, `format`, `pillarId`, `promise?` | id는 kebab-case·중복 금지, pillarId는 channel에 있어야 함, status는 `idea` |
| `update_video` | `id`, `patch` (`workingTitle`, `promise`, `hook`, `package`, `targetPublishDate`, `youtubeId`, `notes`) | `id`·`status`·`metrics`·`createdAt` 은 patch로 못 바꿈 |
| `set_status` | `id`, `status`, `reason?` | 다음 단계 조건(도메인 표)을 검사해 **경고를 돌려주되 막지는 않음**. `dropped` 는 `reason` 필수 → notes에 추가. `published` 면 `publishedAt` 기록 |
| `add_metrics` | `id`, `snapshot` | 누적만, 덮어쓰기 없음. 도구 설명에 "사용자가 준 수치만" 명시 |
| `save_content` | `id`, `kind`, `markdown` | `content/videos/<id>/<kind>.md` 전체 교체 |
| `set_week_slot` | `weekOf`, `videoId`, `role`, `due?`, `done?` | 슬롯 추가·수정 |

공통: 모든 쓰기는 `updatedAt` 을 갱신하고, 결과로 커밋 sha와 바뀐 필드를 돌려준다. 삭제 도구는 만들지 않는다(`dropped` 로 대신).

## 4. 인증

- **MCP**: 정적 Bearer 토큰. claude.ai 커스텀 커넥터의 Request headers(베타)에 `Authorization: Bearer <MCP_TOKEN>` 을 넣는다. 서버는 `withMcpAuth` 의 verify에서 env `MCP_TOKEN` 과 timing-safe 비교로 확인한다.
  - 헤더 방식이 막히면 대안은 두 가지다. ① 추측 불가능한 경로(`/api/mcp/<랜덤>`)로 authless — 약함. ② 외부 인가 서버로 OAuth. 이번 범위는 아니다.
- **웹 UI**: 프로덕션 도메인은 Vercel 기본 보호 대상이 아니므로 `proxy.ts` 로 Basic Auth(`APP_PASSWORD`)를 건다. matcher에서 `/api/mcp` 는 제외한다(자체 토큰 사용).
- **GitHub**: fine-grained PAT, 이 저장소 하나에 `Contents: Read and write` 만. env `GITHUB_TOKEN`.

환경 변수 (Vercel Production에만):
`DATA_STORE=github`, `GITHUB_TOKEN`, `GITHUB_REPO=AGLOP-1354/upload-map`, `GITHUB_BRANCH=main`, `MCP_TOKEN`, `APP_PASSWORD`

## 5. 의존성 (추가 전 확인 필요)

| 패키지 | 이유 |
|---|---|
| `mcp-handler` (2.x) | Next.js Route Handler에 Streamable HTTP MCP 서버를 붙임, `withMcpAuth` 제공 |
| `@modelcontextprotocol/server` (2.x) | `mcp-handler` 2.x 의 peer 의존성 |
| `zod` (4.x) | MCP 도구 입력 스키마(필수) + 저장 전 런타임 검증에도 재사용 |

GitHub 클라이언트는 추가하지 않는다. 호출이 5종류뿐이라 `fetch` 로 직접 쓴다.

## 6. 배포

- Vercel 프로젝트를 GitHub 저장소와 연결, Production 브랜치 `main`.
- 데이터만 바뀐 커밋은 빌드를 건너뛴다. `vercel.json` 의 `ignoreCommand`:
  `git diff --quiet HEAD^ HEAD -- . ':(exclude)data' ':(exclude)content'`
  (종료 코드 0 = 코드 변경 없음 = 빌드 생략)
- 함수 런타임은 기본 Node.js. `runtime = 'edge'` 를 쓰지 않는다.

## 7. 정해야 할 것

- [x] §5 의존성 3개 추가 승인
- [x] `.claude/rules/data-layer.md` 의 "읽기는 readFile만, 쓰기는 Server Action에서만" 규칙을 저장 어댑터 기준으로 바꾸는 것 승인

---

## 단계

1. [x] `.claude/rules/data-layer.md` 를 저장 어댑터·GitHub 커밋·MCP 쓰기 경로 기준으로 수정 — 확인: 문서 검토
2. [x] `lib/types.ts`, `lib/data/schema.ts` (zod) 작성 — 확인: `npx tsc --noEmit` 에서 타입 일치 검사 통과
3. [x] `lib/data/store.ts`, `store-fs.ts` + 도메인 함수(`videos.ts`, `plans.ts`, `channel.ts`) — 확인: 임시 스크립트로 `data/` 읽기·쓰기, `git diff` 로 해당 레코드만 바뀐 것 확인
4. [ ] `store-github.ts` (Git Data API 커밋, non-force ref 갱신, 1회 재시도) — 코드 작성 완료, 실제 GitHub 대상 검증 전 — 확인: 테스트 브랜치(`GITHUB_BRANCH=mcp-sandbox`)에 커밋 생성, 동시 커밋 상황에서 재시도 동작
5. [x] `app/api/mcp/route.ts` — 읽기 도구 4개 + `instructions` — 확인: `npx @modelcontextprotocol/inspector` 로 로컬 dev 서버에 연결해 호출
6. [x] 쓰기 도구 6개 + 단계 전이 경고 — 확인: inspector로 호출, fs 백엔드에서 JSON diff 확인
7. [x] `withMcpAuth` 정적 토큰 — 확인: 토큰 없이 401, 틀린 토큰 401, 맞는 토큰 200
8. [x] `proxy.ts` Basic Auth (`/api/mcp` 제외) — 확인: 브라우저 접근 시 인증 요구, MCP 경로는 영향 없음
9. [ ] Vercel 연결·환경 변수·Ignored Build Step 설정 (사용자 작업) — 확인: 데이터만 바꾼 커밋에서 빌드 생략 표시
10. [ ] claude.ai에 커스텀 커넥터 추가 (사용자 작업) — 확인: 채팅에서 `get_overview` → `set_status` 호출, GitHub에 커밋 생성, 앱 새로고침에 반영
11. [x] `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run wiki:check` 후 해당 위키 페이지 갱신
