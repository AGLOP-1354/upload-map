<!-- 자동 생성 파일: `node scripts/wiki.mjs gen`. 직접 수정 금지. 근거: git 추적 파일 + 미추적(비-ignore) 파일 -->

# 파일 맵

위키 근거 대상 파일 전체 목록. 코드 파일은 export 심볼과 라인을 함께 표시한다.

| 파일 | 라인 | 지시어 | export |
|---|---:|---|---|
| [.claude/hooks/post-edit-check.mjs](../../.claude/hooks/post-edit-check.mjs) | 52 | - | - |
| [.claude/settings.json](../../.claude/settings.json) | 81 | - | - |
| [.claude/skills/yt-hook/scripts/score-hook.mjs](../../.claude/skills/yt-hook/scripts/score-hook.mjs) | 67 | - | - |
| [.claude/skills/yt-package/scripts/lint-package.mjs](../../.claude/skills/yt-package/scripts/lint-package.mjs) | 66 | - | - |
| [.claude/skills/yt-status/scripts/summary.mjs](../../.claude/skills/yt-status/scripts/summary.mjs) | 60 | - | - |
| [.githooks/pre-commit](../../.githooks/pre-commit) | 10 | - | - |
| [.mcp.json](../../.mcp.json) | 9 | - | - |
| [app/api/mcp/route.ts](../../app/api/mcp/route.ts) | 241 | - | [`{authed as GET, authed as POST, authed as DELETE}`](../../app/api/mcp/route.ts#L241) (re-export) |
| [app/globals.css](../../app/globals.css) | 27 | - | - |
| [app/layout.tsx](../../app/layout.tsx) | 29 | - | [`metadata`](../../app/layout.tsx#L15) (const)<br>[`default RootLayout`](../../app/layout.tsx#L20) (function) |
| [app/page.tsx](../../app/page.tsx) | 69 | - | [`default Home`](../../app/page.tsx#L3) (function) |
| [eslint.config.mjs](../../eslint.config.mjs) | 18 | - | [`default eslintConfig`](../../eslint.config.mjs#L18) (value) |
| [lib/data/files.ts](../../lib/data/files.ts) | 96 | - | [`PATHS`](../../lib/data/files.ts#L9) (const)<br>[`DataError`](../../lib/data/files.ts#L17) (class)<br>[`parseVideos`](../../lib/data/files.ts#L32) (const)<br>[`parsePlans`](../../lib/data/files.ts#L34) (const)<br>[`parseChannel`](../../lib/data/files.ts#L36) (const)<br>[`serialize`](../../lib/data/files.ts#L40) (function)<br>[`serializeVideos`](../../lib/data/files.ts#L46) (const)<br>[`serializePlans`](../../lib/data/files.ts#L47) (const)<br>[`readFiles`](../../lib/data/files.ts#L49) (function)<br>[`Mutation`](../../lib/data/files.ts#L53) (interface)<br>[`mutate`](../../lib/data/files.ts#L66) (function)<br>[`todaySeoul`](../../lib/data/files.ts#L88) (const)<br>[`mondayOf`](../../lib/data/files.ts#L91) (function) |
| [lib/data/schema.ts](../../lib/data/schema.ts) | 109 | - | [`videoIdSchema`](../../lib/data/schema.ts#L20) (const)<br>[`videoStatusSchema`](../../lib/data/schema.ts#L23) (const)<br>[`contentKindSchema`](../../lib/data/schema.ts#L24) (const)<br>[`metricsSchema`](../../lib/data/schema.ts#L26) (const)<br>[`hookSchema`](../../lib/data/schema.ts#L39) (const)<br>[`packageSchema`](../../lib/data/schema.ts#L45) (const)<br>[`videoSchema`](../../lib/data/schema.ts#L52) (const)<br>[`slotRoleSchema`](../../lib/data/schema.ts#L71) (const)<br>[`weekPlanSchema`](../../lib/data/schema.ts#L73) (const)<br>[`channelSchema`](../../lib/data/schema.ts#L87) (const)<br>[`videosFileSchema`](../../lib/data/schema.ts#L97) (const)<br>[`plansFileSchema`](../../lib/data/schema.ts#L98) (const) |
| [lib/data/store-fs.ts](../../lib/data/store-fs.ts) | 36 | - | [`fsStore`](../../lib/data/store-fs.ts#L9) (function) |
| [lib/data/store-github.ts](../../lib/data/store-github.ts) | 98 | - | [`githubStore`](../../lib/data/store-github.ts#L38) (function) |
| [lib/data/store.ts](../../lib/data/store.ts) | 25 | - | [`Snapshot`](../../lib/data/store.ts#L7) (interface)<br>[`CommitResult`](../../lib/data/store.ts#L14) (type)<br>[`Store`](../../lib/data/store.ts#L16) (interface)<br>[`getStore`](../../lib/data/store.ts#L23) (function) |
| [lib/data/videos.ts](../../lib/data/videos.ts) | 279 | - | [`getState`](../../lib/data/videos.ts#L37) (function)<br>[`getVideo`](../../lib/data/videos.ts#L47) (function)<br>[`weekOfToday`](../../lib/data/videos.ts#L55) (function)<br>[`getOverview`](../../lib/data/videos.ts#L60) (function)<br>[`CreateVideoInput`](../../lib/data/videos.ts#L92) (interface)<br>[`createVideo`](../../lib/data/videos.ts#L101) (function)<br>[`VideoPatch`](../../lib/data/videos.ts#L124) (type)<br>[`updateVideo`](../../lib/data/videos.ts#L128) (function)<br>[`setStatus`](../../lib/data/videos.ts#L170) (function)<br>[`MetricsInput`](../../lib/data/videos.ts#L204) (type)<br>[`addMetrics`](../../lib/data/videos.ts#L207) (function)<br>[`saveContent`](../../lib/data/videos.ts#L228) (function)<br>[`WeekSlotInput`](../../lib/data/videos.ts#L244) (interface)<br>[`setWeekSlot`](../../lib/data/videos.ts#L252) (function) |
| [lib/types.ts](../../lib/types.ts) | 84 | - | [`VIDEO_STATUSES`](../../lib/types.ts#L3) (const)<br>[`VideoStatus`](../../lib/types.ts#L15) (type)<br>[`VideoMetrics`](../../lib/types.ts#L17) (interface)<br>[`Video`](../../lib/types.ts#L30) (interface)<br>[`SlotRole`](../../lib/types.ts#L54) (type)<br>[`WeekPlan`](../../lib/types.ts#L56) (interface)<br>[`Channel`](../../lib/types.ts#L63) (interface)<br>[`VideosFile`](../../lib/types.ts#L73) (interface)<br>[`PlansFile`](../../lib/types.ts#L78) (interface)<br>[`CONTENT_KINDS`](../../lib/types.ts#L83) (const)<br>[`ContentKind`](../../lib/types.ts#L84) (type) |
| [next.config.ts](../../next.config.ts) | 20 | - | [`default nextConfig`](../../next.config.ts#L20) (value) |
| [package.json](../../package.json) | 34 | - | - |
| [proxy.ts](../../proxy.ts) | 24 | - | [`proxy`](../../proxy.ts#L6) (function)<br>[`config`](../../proxy.ts#L22) (const) |
| [scripts/wiki.mjs](../../scripts/wiki.mjs) | 379 | - | - |
| [tsconfig.json](../../tsconfig.json) | 35 | - | - |
| [vercel.json](../../vercel.json) | 5 | - | - |

## 근거 대상 제외 파일

규칙(`NON_SOURCE` in [scripts/wiki.mjs](../../scripts/wiki.mjs))에 의해 제외: `.claude/agents/code-reviewer.md`, `.claude/agents/content-reviewer.md`, `.claude/agents/yt-researcher.md`, `.claude/rules/data-layer.md`, `.claude/rules/nextjs.md`, `.claude/rules/working-principles.md`, `.claude/rules/youtube-domain.md`, `.claude/skills/debug/SKILL.md`, `.claude/skills/plan-feature/SKILL.md`, `.claude/skills/verify/SKILL.md`, `.claude/skills/yt-hook/SKILL.md`, `.claude/skills/yt-hook/references/hook-formulas.md`, `.claude/skills/yt-idea/SKILL.md`, `.claude/skills/yt-package/SKILL.md`, `.claude/skills/yt-plan-week/SKILL.md`, `.claude/skills/yt-review/SKILL.md`, `.claude/skills/yt-script/SKILL.md`, `.claude/skills/yt-status/SKILL.md`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `app/favicon.ico`, `docs/plans/2026-11-06-remote-mcp.md`, `package-lock.json`, `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
