---
name: debug
description: 체계적 디버깅 — 버그·에러·예상과 다른 동작을 고치기 전에 재현 → 증거 수집 → 가설 하나씩 검증 → 원인 확정 → 최소 수정 → 재검증 순으로 진행. "에러 나", "안 돼", "버그", "왜 이래", "데이터가 안 바뀌어", "debug" 요청에 사용.
argument-hint: "[증상]"
---

# 체계적 디버깅

증상: $ARGUMENTS

obra/superpowers의 systematic-debugging을 이 프로젝트에 맞게 줄인 절차. **원인을 찾기 전에 수정 코드를 쓰지 않는다.**

## 1. 재현
- 정확한 재현 절차를 적는다(경로, 클릭, 입력값). 재현이 안 되면 사용자에게 추가 정보를 묻는다.
- 에러 메시지·스택트레이스를 **끝까지** 읽는다. Next.js 에러의 `Learn more` 링크가 있으면 해당 문서를 `node_modules/next/dist/docs/`나 nextjs.org `/docs/messages/*.md`에서 읽는다.

## 2. 증거 수집
- `git diff` / `git log -5 --stat` 로 최근 변경 확인.
- 경계마다 값 확인: 폼 → Server Action 인자 → `lib/data` 쓰기 → `data/*.json` 실제 내용 → 다음 렌더 읽기.

## 3. 이 프로젝트에서 자주 나는 원인 (먼저 의심)
- 저장은 됐는데 화면이 안 바뀜 → Server Action에서 `refresh()` 누락, 또는 `readFileSync`/모듈 스코프 읽기로 값이 프리렌더 때 고정됨 (`.claude/rules/data-layer.md`).
- "uncached data during prerendering" → 읽기가 `<Suspense>` 밖. 메시지의 `[stream]/[cache]/[block]` 중 선택.
- JSON 파싱 에러 → 원자적 쓰기(tmp→rename) 누락으로 반쯤 쓰인 파일. `data/backup/` 확인.
- 클라이언트 번들에 `fs` 에러 → `lib/data`를 클라이언트 컴포넌트가 import. `server-only` 확인.
- 학습 데이터 기반의 옛 Next.js API 사용 → 번들 문서에서 현재 API 확인.

## 4. 가설 → 검증
- 가설은 한 번에 하나: "X 때문에 Y가 생긴다". 가장 작은 변경(로그 한 줄, 값 하나)으로 확인.
- 확인되지 않으면 변경을 되돌리고 다음 가설로. 여러 수정을 겹쳐 쌓지 않는다.
- **수정 시도 3번 실패** → 멈추고 사용자에게 지금까지의 증거와 함께 접근 자체를 재검토하자고 말한다.

## 5. 수정 + 재검증
- 원인에 대한 최소 수정. 증상만 가리는 try/catch, 무조건 재시도 금지.
- 1단계 재현 절차로 다시 확인 → `/verify`.
- 보고: 원인 1줄 · 수정 내용 · 검증 증거.
