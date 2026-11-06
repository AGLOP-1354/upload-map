---
title: 위키 도구
summary: LLM Wiki 생성·검증 스크립트, Claude Code 훅과 git pre-commit 자동 실행 경로
sources:
  - scripts/wiki.mjs
  - package.json
  - .claude/settings.json
  - .githooks/pre-commit
verified: ac510afe05160789
---

# 위키 도구 — `scripts/wiki.mjs`

외부 의존성 없는 Node 스크립트. npm 스크립트 `wiki:gen`, `wiki:check`, `wiki:stamp` 로 실행 — [package.json:10-12](../package.json#L10-L12).

## 명령

| 명령 | 동작 | 근거 |
|---|---|---|
| `gen` | `wiki/generated/*.md`, `wiki/index.md` 를 코드에서 다시 만들고 바뀐 파일만 기록 | [scripts/wiki.mjs:217](../scripts/wiki.mjs#L217), [scripts/wiki.mjs:330](../scripts/wiki.mjs#L330) |
| `check` | `gen` 후 린트. 문제가 있으면 목록 출력, exit 1 | [scripts/wiki.mjs:243](../scripts/wiki.mjs#L243), [scripts/wiki.mjs:335](../scripts/wiki.mjs#L335) |
| `stamp <page…>` / `--all` | 페이지 `sources` 의 현재 내용 해시를 `verified` 에 기록 | [scripts/wiki.mjs:296](../scripts/wiki.mjs#L296) |
| `hook-post` | 파일 편집 후 `gen` (wiki/generated 자체 편집은 무시) | [scripts/wiki.mjs:348](../scripts/wiki.mjs#L348) |
| `hook-stop` | `gen` + 린트. 문제가 있으면 stderr 보고 후 exit 2. 이미 한 번 막힌 상태(`stop_hook_active`)면 통과시키고 사용자 메시지만 출력 | [scripts/wiki.mjs:356-361](../scripts/wiki.mjs#L356-L361) |
| `hook-start` | `gen` + 린트 결과를 stdout 으로 출력 (세션 컨텍스트 주입용) | [scripts/wiki.mjs:370](../scripts/wiki.mjs#L370) |

## 린트 항목 (`check`)

1. 생성 페이지가 현재 코드로 다시 만든 결과와 같은지.
2. 서술 페이지 frontmatter 에 `title`, `summary` 가 있는지.
3. `sources` 의 각 경로/글롭이 실제 파일과 매칭되는지.
4. **stale**: `sources` 파일 내용 해시(경로+내용, 16자리 sha256)가 `verified` 와 같은지 — [scripts/wiki.mjs:103](../scripts/wiki.mjs#L103).
5. 본문 링크의 경로가 존재하는지, `#Lx-Ly` 범위가 파일 길이 안인지, 인용한 코드 파일이 `sources` 에 들어 있는지 — [scripts/wiki.mjs:268](../scripts/wiki.mjs#L268).
6. **coverage**: 근거 대상 파일마다 그것을 `sources` 로 가진 서술 페이지가 하나 이상인지.

## 근거 대상 범위

`git ls-files --cached --others --exclude-standard` 결과에서 `NON_SOURCE` 글롭(위키 자체, `*.md`, lock 파일, `.gitignore`, `data/**`, `public/**`, 이미지)을 뺀 텍스트 파일 — [scripts/wiki.mjs:22](../scripts/wiki.mjs#L22). `data/**` 는 런타임 데이터이므로 근거가 아니며, 그 스키마를 정의한 코드가 근거다.

## 자동 실행 경로

| 트리거 | 실행 | 근거 |
|---|---|---|
| Claude Code 세션 시작 | `hook-start` | [.claude/settings.json:3-13](../.claude/settings.json#L3-L13) |
| Claude 의 `Edit`/`Write`/`MultiEdit` 직후 | `hook-post` | [.claude/settings.json:14-25](../.claude/settings.json#L14-L25) |
| Claude 응답 종료 시 | `hook-stop` (불일치 시 종료 차단) | [.claude/settings.json:26-37](../.claude/settings.json#L26-L37) |
| `git commit` | `gen` 후 `wiki/generated`, `wiki/index.md` 를 스테이징하고 `check` 실패 시 커밋 중단 | [.githooks/pre-commit:3-9](../.githooks/pre-commit#L3-L9) |

git 훅은 `core.hooksPath=.githooks` 일 때만 동작한다. `npm install` 시 `prepare` 스크립트가 이 값을 설정한다 — [package.json:13](../package.json#L13).
