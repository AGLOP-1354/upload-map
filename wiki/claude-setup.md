---
title: Claude Code 설정
summary: .claude 권한·편집 후 검사 훅, 유튜브 스킬 보조 스크립트(훅 채점·제목 린트·현황 요약), next-devtools MCP
sources:
  - .claude/settings.json
  - .claude/hooks/post-edit-check.mjs
  - .claude/skills/yt-hook/scripts/score-hook.mjs
  - .claude/skills/yt-package/scripts/lint-package.mjs
  - .claude/skills/yt-status/scripts/summary.mjs
  - .mcp.json
verified: 36dc53ab5ab4fc36
---

# Claude Code 설정

규칙(`.claude/rules/*.md`), 스킬(`.claude/skills/*/SKILL.md`), 서브에이전트(`.claude/agents/*.md`)는 마크다운이라 이 위키의 근거 대상이 아니다. 이 페이지는 그 옆에서 실제로 실행되는 코드만 다룬다. 위키 훅은 [위키 도구](tooling.md) 참고.

## 권한 — `.claude/settings.json`

- `allow`: lint·build·`wiki:*`·`tsc --noEmit`·eslint, `.claude/skills/*` 스크립트 실행, git 조회 명령, 번들된 Next.js 문서 읽기, `next-devtools` MCP 도구 — [.claude/settings.json:4-17](../.claude/settings.json#L4-L17)
- `ask`: `npm install`, `git push`, `git commit` — [.claude/settings.json:18-23](../.claude/settings.json#L18-L23)
- `deny`: `.env` 읽기, `data`/`content` 재귀 삭제 — [.claude/settings.json:24-31](../.claude/settings.json#L24-L31)

## 편집 후 검사 훅 — `.claude/hooks/post-edit-check.mjs`

`Edit|Write` 직후 실행 — [.claude/settings.json:56-65](../.claude/settings.json#L56-L65). 경로는 `git rev-parse --show-toplevel` 기준이라 워크트리에서도 해당 체크아웃의 스크립트를 쓴다. 기준 디렉터리는 stdin의 `cwd` — [.claude/hooks/post-edit-check.mjs:21-22](../.claude/hooks/post-edit-check.mjs#L21-L22).

| 대상 | 검사 | 실패 시 | 근거 |
|---|---|---|---|
| `data/**/*.json` (`data/backup/` 제외) | JSON 파싱. `data/channels.json` 과 `data/<채널id>/{videos,plans,series,tasks,credits}.json` 은 `{version: number, <키>: [...]}` 형태(키: channels·videos·weeks·series·tasks·credits). `videos.json` 은 `id` 중복과 `status` 허용값도 검사 | exit 2 + stderr | [.claude/hooks/post-edit-check.mjs:26-45](../.claude/hooks/post-edit-check.mjs#L26-L45) |
| `*.ts`, `*.tsx` | 해당 파일만 `npx --no-install eslint` | eslint exit 1이면 exit 2 | [.claude/hooks/post-edit-check.mjs:47-51](../.claude/hooks/post-edit-check.mjs#L47-L51) |

훅 입력 파싱 실패나 eslint 실행 불가는 작업을 막지 않고 exit 0.

## 스킬 보조 스크립트

모두 외부 의존성 없는 Node 스크립트, 결과는 JSON 또는 텍스트로 stdout.

| 스크립트 | 쓰는 스킬 | 동작 | 근거 |
|---|---|---|---|
| `score-hook.mjs` | `yt-hook` | 훅 문장을 specificity·address·stakes·curiosity·brevity(각 0~100)로 정규식 채점. 종합 = 평균×0.6 + 최약×0.4, STRONG ≥72 / WORKABLE ≥55. 한글이면 적정 길이 6~16어절, 인사로 시작하면 40점 상한 | [.claude/skills/yt-hook/scripts/score-hook.mjs:30-53](../.claude/skills/yt-hook/scripts/score-hook.mjs#L30-L53) |
| `lint-package.mjs` | `yt-package` | 제목 표시 폭(한글 1자=1.7) 60 초과는 issue, 40 초과는 note. 대문자 단어·이모지·반복 부호 검사, 썸네일 문구와 단어 중복은 issue(숫자 중복은 note), 썸네일 3어절 초과 경고 | [.claude/skills/yt-package/scripts/lint-package.mjs:20-64](../.claude/skills/yt-package/scripts/lint-package.mjs#L20-L64) |
| `summary.mjs` | `yt-status` | `node summary.mjs [루트] [채널id]`. `data/channels.json` 에서 채널을 고르고(생략하면 첫 채널, 여러 개면 목록 안내) `data/<채널id>/videos.json`·`plans.json` 을 읽어 단계별 목록, 목표일 지난 진행 중 영상, 48h/7d 지표 미기록 영상, 이번 주 슬롯 완료율 출력. 채널이나 파일이 없으면 안내만 하고 exit 0 | [.claude/skills/yt-status/scripts/summary.mjs:1-32](../.claude/skills/yt-status/scripts/summary.mjs#L1-L32), [.claude/skills/yt-status/scripts/summary.mjs:34-71](../.claude/skills/yt-status/scripts/summary.mjs#L34-L71) |

## MCP — `.mcp.json`

`next-devtools` 서버(`npx -y next-devtools-mcp@latest`)를 등록 — [.mcp.json:1-8](../.mcp.json#L1-L8). 실행 중인 `next dev`의 `/_next/mcp`에 연결해 컴파일 이슈·라우트·로그를 제공한다(`node_modules/next/dist/docs/01-app/02-guides/mcp.md`).
