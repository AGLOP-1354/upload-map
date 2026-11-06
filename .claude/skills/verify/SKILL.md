---
name: verify
description: 코드 변경을 증거로 검증 — lint, 타입체크, Next.js dev 서버 컴파일 이슈, 실제 페이지 렌더링·콘솔 에러까지 확인하고 통과/실패를 출력 그대로 보고. 기능 구현·버그 수정 후 "완료"라고 말하기 전에, 또는 "확인해줘", "잘 되나 봐줘", "verify" 요청에 사용.
argument-hint: "[확인할 경로, 예: /videos]"
allowed-tools: Read, Bash(npm run lint*), Bash(npx tsc *), Bash(npm run build*), Bash(cat .next/dev/lock), Bash(git diff*), Bash(git status*)
---

# 검증

대상 경로: $ARGUMENTS (없으면 이번 변경과 관련된 페이지를 고른다)

## 현재 변경
!`git status --short || true`

## 단계 (앞 단계가 실패하면 거기서 멈추고 보고)
1. **정적 검사**
   - `npm run lint`
   - `npx tsc --noEmit`
2. **dev 서버**
   - `cat .next/dev/lock` 으로 실행 중인 서버 확인. 없으면 사용자에게 `npm run dev`를 켜 달라고 하거나 Browser 미리보기를 시작한다(포트 3000). 서버를 중복으로 띄우지 않는다.
   - `next-devtools` MCP가 연결돼 있으면 `nextjs_index` → `nextjs_call`로 컴파일 이슈·서버 에러 확인.
3. **화면**
   - 브라우저 도구로 대상 경로를 열고: 페이지 텍스트 확인, 콘솔 에러 확인, 바꾼 상호작용(폼 제출 등)을 한 번 실제로 수행.
   - 폼이 `data/*.json`을 바꾸는 경우: 실행 전후 해당 레코드를 비교하고, 테스트로 만든 레코드는 끝나고 되돌린다(사용자 데이터 보호).
4. **빌드** — 라우팅·캐시 설정을 건드렸을 때만 `npm run build`. Cache Components 블로킹 에러가 나오면 메시지의 fix 선택지를 그대로 보고.

## 보고 형식
```
lint: ✅/❌   tsc: ✅/❌   dev 컴파일: ✅/❌/미확인   화면: ✅/❌/미확인   build: ✅/❌/생략
```
❌ 은 에러 원문 핵심 줄을 붙인다. "미확인"인 항목은 왜 못 했는지 쓴다. 통과하지 않은 걸 통과라고 쓰지 않는다.
