<!-- 자동 생성 파일: `node scripts/wiki.mjs gen`. 직접 수정 금지. 근거: git 추적 파일 + 미추적(비-ignore) 파일 -->

# 파일 맵

위키 근거 대상 파일 전체 목록. 코드 파일은 export 심볼과 라인을 함께 표시한다.

| 파일 | 라인 | 지시어 | export |
|---|---:|---|---|
| [.claude/hooks/post-edit-check.mjs](../../.claude/hooks/post-edit-check.mjs) | 54 | - | - |
| [.claude/launch.json](../../.claude/launch.json) | 12 | - | - |
| [.claude/settings.json](../../.claude/settings.json) | 81 | - | - |
| [.claude/skills/yt-hook/scripts/score-hook.mjs](../../.claude/skills/yt-hook/scripts/score-hook.mjs) | 67 | - | - |
| [.claude/skills/yt-package/scripts/lint-package.mjs](../../.claude/skills/yt-package/scripts/lint-package.mjs) | 66 | - | - |
| [.claude/skills/yt-status/scripts/summary.mjs](../../.claude/skills/yt-status/scripts/summary.mjs) | 71 | - | - |
| [.env.example](../../.env.example) | 6 | - | - |
| [.githooks/pre-commit](../../.githooks/pre-commit) | 10 | - | - |
| [.mcp.json](../../.mcp.json) | 9 | - | - |
| [app/c/[channel]/actions.ts](../../app/c/[channel]/actions.ts) | 45 | use server | [`cycleStep`](../../app/c/[channel]/actions.ts#L11) (function)<br>[`toggleChecklist`](../../app/c/[channel]/actions.ts#L25) (function)<br>[`toggleTask`](../../app/c/[channel]/actions.ts#L37) (function) |
| [app/c/[channel]/dashboard.tsx](../../app/c/[channel]/dashboard.tsx) | 571 | - | [`Dashboard`](../../app/c/[channel]/dashboard.tsx#L38) (function) |
| [app/c/[channel]/logo/route.ts](../../app/c/[channel]/logo/route.ts) | 11 | - | [`GET`](../../app/c/[channel]/logo/route.ts#L4) (function) |
| [app/c/[channel]/page.tsx](../../app/c/[channel]/page.tsx) | 27 | - | [`default ChannelPage`](../../app/c/[channel]/page.tsx#L4) (function) |
| [app/channels/new/actions.ts](../../app/channels/new/actions.ts) | 91 | use server | [`CreateChannelState`](../../app/channels/new/actions.ts#L8) (type)<br>[`createChannel`](../../app/channels/new/actions.ts#L30) (function) |
| [app/channels/new/channel-form.tsx](../../app/channels/new/channel-form.tsx) | 291 | use client | [`ChannelForm`](../../app/channels/new/channel-form.tsx#L14) (function) |
| [app/channels/new/page.tsx](../../app/channels/new/page.tsx) | 55 | - | [`metadata`](../../app/channels/new/page.tsx#L11) (const)<br>[`default NewChannelPage`](../../app/channels/new/page.tsx#L13) (function) |
| [app/globals.css](../../app/globals.css) | 40 | - | - |
| [app/layout.tsx](../../app/layout.tsx) | 39 | - | [`metadata`](../../app/layout.tsx#L25) (const)<br>[`default RootLayout`](../../app/layout.tsx#L30) (function) |
| [app/login/actions.ts](../../app/login/actions.ts) | 69 | use server | [`LoginState`](../../app/login/actions.ts#L13) (type)<br>[`login`](../../app/login/actions.ts#L25) (function)<br>[`logout`](../../app/login/actions.ts#L66) (function) |
| [app/login/login-form.tsx](../../app/login/login-form.tsx) | 78 | use client | [`LoginForm`](../../app/login/login-form.tsx#L11) (function) |
| [app/login/page.tsx](../../app/login/page.tsx) | 28 | - | [`metadata`](../../app/login/page.tsx#L6) (const)<br>[`default LoginPage`](../../app/login/page.tsx#L8) (function) |
| [app/page.tsx](../../app/page.tsx) | 17 | - | [`default Home`](../../app/page.tsx#L6) (function) |
| [components/app-header.tsx](../../components/app-header.tsx) | 70 | - | [`AppHeader`](../../components/app-header.tsx#L8) (function) |
| [components/channel-avatar.tsx](../../components/channel-avatar.tsx) | 38 | - | [`ChannelAvatar`](../../components/channel-avatar.tsx#L4) (function) |
| [components/icons.tsx](../../components/icons.tsx) | 85 | - | [`LockIcon`](../../components/icons.tsx#L11) (const)<br>[`EyeIcon`](../../components/icons.tsx#L18) (const)<br>[`AlertIcon`](../../components/icons.tsx#L25) (const)<br>[`CheckIcon`](../../components/icons.tsx#L32) (const)<br>[`ChevronDownIcon`](../../components/icons.tsx#L38) (const)<br>[`ChevronLeftIcon`](../../components/icons.tsx#L44) (const)<br>[`PlusIcon`](../../components/icons.tsx#L50) (const)<br>[`XIcon`](../../components/icons.tsx#L56) (const)<br>[`UploadIcon`](../../components/icons.tsx#L62) (const)<br>[`MonitorIcon`](../../components/icons.tsx#L68) (const)<br>[`PortraitIcon`](../../components/icons.tsx#L75) (const)<br>[`LandscapeIcon`](../../components/icons.tsx#L81) (const) |
| [eslint.config.mjs](../../eslint.config.mjs) | 18 | - | [`default eslintConfig`](../../eslint.config.mjs#L18) (value) |
| [lib/auth.ts](../../lib/auth.ts) | 10 | - | [`requireSession`](../../lib/auth.ts#L7) (function) |
| [lib/dashboard.ts](../../lib/dashboard.ts) | 93 | - | [`kstDate`](../../lib/dashboard.ts#L7) (function)<br>[`kstNowLabel`](../../lib/dashboard.ts#L11) (function)<br>[`dayLabel`](../../lib/dashboard.ts#L18) (function)<br>[`addDays`](../../lib/dashboard.ts#L24) (function)<br>[`daysBetween`](../../lib/dashboard.ts#L29) (function)<br>[`videoDay`](../../lib/dashboard.ts#L36) (function)<br>[`isPublished`](../../lib/dashboard.ts#L40) (function)<br>[`stepsFor`](../../lib/dashboard.ts#L45) (function)<br>[`stepState`](../../lib/dashboard.ts#L49) (function)<br>[`progress`](../../lib/dashboard.ts#L53) (function)<br>[`columnsFor`](../../lib/dashboard.ts#L67) (function)<br>[`nextUpload`](../../lib/dashboard.ts#L77) (function)<br>[`thisWeekCounts`](../../lib/dashboard.ts#L83) (function)<br>[`FORMAT_LABEL`](../../lib/dashboard.ts#L93) (const) |
| [lib/data/index.ts](../../lib/data/index.ts) | 102 | - | [`listChannels`](../../lib/data/index.ts#L15) (function)<br>[`getChannel`](../../lib/data/index.ts#L21) (function)<br>[`ChannelData`](../../lib/data/index.ts#L26) (interface)<br>[`getChannelData`](../../lib/data/index.ts#L33) (function)<br>[`addChannel`](../../lib/data/index.ts#L46) (function)<br>[`updateVideo`](../../lib/data/index.ts#L53) (function)<br>[`updateTask`](../../lib/data/index.ts#L63) (function)<br>[`initChannelFiles`](../../lib/data/index.ts#L74) (function)<br>[`readChannelLogo`](../../lib/data/index.ts#L91) (function) |
| [lib/data/store.ts](../../lib/data/store.ts) | 60 | - | [`DATA_DIR`](../../lib/data/store.ts#L5) (const)<br>[`assertChannelId`](../../lib/data/store.ts#L8) (function)<br>[`dataPath`](../../lib/data/store.ts#L13) (function)<br>[`readJson`](../../lib/data/store.ts#L20) (function)<br>[`serialize`](../../lib/data/store.ts#L34) (function)<br>[`writeNow`](../../lib/data/store.ts#L41) (function)<br>[`writeJsonNow`](../../lib/data/store.ts#L48) (function)<br>[`mutateJson`](../../lib/data/store.ts#L53) (function) |
| [lib/session.ts](../../lib/session.ts) | 45 | - | [`SESSION_COOKIE`](../../lib/session.ts#L4) (const)<br>[`LONG_SESSION_MS`](../../lib/session.ts#L5) (const)<br>[`SHORT_SESSION_MS`](../../lib/session.ts#L6) (const)<br>[`safeEqual`](../../lib/session.ts#L25) (function)<br>[`createSessionToken`](../../lib/session.ts#L33) (function)<br>[`verifySessionToken`](../../lib/session.ts#L39) (function) |
| [lib/types.ts](../../lib/types.ts) | 122 | - | [`Format`](../../lib/types.ts#L3) (type)<br>[`StepState`](../../lib/types.ts#L5) (type)<br>[`Channel`](../../lib/types.ts#L7) (interface)<br>[`Series`](../../lib/types.ts#L27) (interface)<br>[`VideoStatus`](../../lib/types.ts#L35) (type)<br>[`VideoMetrics`](../../lib/types.ts#L39) (interface)<br>[`ChecklistItem`](../../lib/types.ts#L52) (interface)<br>[`Video`](../../lib/types.ts#L58) (interface)<br>[`Task`](../../lib/types.ts#L82) (interface)<br>[`Credit`](../../lib/types.ts#L92) (interface)<br>[`STEP_STATES`](../../lib/types.ts#L101) (const)<br>[`DEFAULT_STEPS`](../../lib/types.ts#L103) (const)<br>[`DEFAULT_GATES`](../../lib/types.ts#L108) (const)<br>[`CHANNEL_COLORS`](../../lib/types.ts#L115) (const) |
| [next.config.ts](../../next.config.ts) | 22 | - | [`default nextConfig`](../../next.config.ts#L22) (value) |
| [package.json](../../package.json) | 31 | - | - |
| [proxy.ts](../../proxy.ts) | 22 | - | [`proxy`](../../proxy.ts#L5) (function)<br>[`config`](../../proxy.ts#L20) (const) |
| [scripts/wiki.mjs](../../scripts/wiki.mjs) | 379 | - | - |
| [tsconfig.json](../../tsconfig.json) | 35 | - | - |

## 근거 대상 제외 파일

규칙(`NON_SOURCE` in [scripts/wiki.mjs](../../scripts/wiki.mjs))에 의해 제외: `.claude/agents/code-reviewer.md`, `.claude/agents/content-reviewer.md`, `.claude/agents/yt-researcher.md`, `.claude/rules/data-layer.md`, `.claude/rules/nextjs.md`, `.claude/rules/working-principles.md`, `.claude/rules/youtube-domain.md`, `.claude/skills/debug/SKILL.md`, `.claude/skills/plan-feature/SKILL.md`, `.claude/skills/verify/SKILL.md`, `.claude/skills/yt-hook/SKILL.md`, `.claude/skills/yt-hook/references/hook-formulas.md`, `.claude/skills/yt-idea/SKILL.md`, `.claude/skills/yt-package/SKILL.md`, `.claude/skills/yt-plan-week/SKILL.md`, `.claude/skills/yt-review/SKILL.md`, `.claude/skills/yt-script/SKILL.md`, `.claude/skills/yt-status/SKILL.md`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `app/favicon.ico`, `data/channels.json`, `data/lockedlibrary/credits.json`, `data/lockedlibrary/logo.jpg`, `data/lockedlibrary/plans.json`, `data/lockedlibrary/series.json`, `data/lockedlibrary/tasks.json`, `data/lockedlibrary/videos.json`, `package-lock.json`, `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
