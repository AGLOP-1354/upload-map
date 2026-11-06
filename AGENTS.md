<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## LLM Wiki (프로젝트 지식 베이스)

Karpathy 의 LLM Wiki 패턴을 따른다. **원본(raw)= 코드**, **wiki/ = LLM 이 유지하는 정리본**, **이 섹션 = 스키마(규칙)**.

### 구조
- `wiki/index.md` — 진입점. 자동 생성. 질문에 답하거나 작업을 시작할 때 먼저 읽는다.
- `wiki/generated/*.md` — 코드에서 기계적으로 뽑는 사실(파일·export·라우트·의존성). `scripts/wiki.mjs gen` 이 만든다. 직접 수정 금지.
- `wiki/*.md` — 서술 페이지. LLM 이 작성·유지. 한 주제당 한 페이지 (예: overview, architecture, ui, data, tooling).

### 서술 페이지 규칙
1. frontmatter 필수: `title`, `summary`(index 에 표시될 한 줄), `sources`(근거 파일 경로/글롭 목록), `verified`(stamp 가 기록).
2. **근거 기반**: 모든 사실 주장은 실제 코드를 읽고 쓰며 `[경로:라인](../경로#Lx-Ly)` 링크로 인용한다. 인용한 코드 파일은 반드시 `sources` 에 포함한다. 코드로 확인할 수 없는 내용은 쓰지 않는다. 예외는 소유자가 말한 요구사항뿐이며 "근거: 소유자 진술"로 표시하고 구현 상태와 분리한다.
3. **현재 상태만**: 변경 이력, 날짜, "이전에는…", "추가됨/삭제됨" 같은 서술을 쓰지 않는다. 로그 파일을 두지 않는다. 사라진 코드는 페이지에서도 지운다.
4. Next.js 동작에 대한 설명은 `node_modules/next/dist/docs/` 를 근거로 한다.

### 운영 (ingest / lint)
- 코드를 바꾼 작업을 끝내기 전에: `npm run wiki:check` → 보고된 페이지의 근거 코드를 다시 읽고 현재 상태로 고친다 → `npm run wiki:stamp -- wiki/<page>.md`. 내용 확인 없이 stamp 만 하지 않는다.
- `[coverage]` 가 나오면 새 파일을 다루는 페이지의 `sources` 에 추가하거나 새 페이지를 만든다.
- `data/**` 등 런타임 데이터 파일은 근거가 아니다. 데이터 스키마는 그것을 정의/검증하는 코드를 근거로 기술한다.
- 질문에 답하며 새로 확인한 사실이 위키에 없으면 해당 페이지에 반영한다(근거 인용 포함).
