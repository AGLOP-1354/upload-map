---
name: yt-hook
description: 영상 첫 15~30초 훅을 21개 공식 중에서 5개 써서 채점 스크립트로 점수 매기고 상위 2개를 제시. 제목·썸네일 약속과 일치하는지도 확인. "훅 써줘", "도입부", "첫 30초", "인트로 어떻게 시작", "hook" 요청에 사용.
argument-hint: "[video-id]"
allowed-tools: Read, Edit, Write, Bash(node *)
---

# 훅 작성

대상: `$ARGUMENTS` (video id. 없으면 어떤 영상인지 묻는다)

## 준비
1. `data/<채널id>/videos.json`에서 해당 영상의 `promise`, `package.selectedTitle`, `package.thumbnailText`를 읽는다. `data/channels.json`의 해당 채널의 `voice`를 따른다.
2. 약속(promise)이 없으면 먼저 한 문장으로 받는다. 약속 없는 훅은 쓰지 않는다.
3. 공식 목록: [references/hook-formulas.md](references/hook-formulas.md)

## 작성 규칙
- **서로 다른 공식** 5개로 5개를 쓴다.
- 첫 문장에서 제목의 약속을 확인시킨다. 제목과 다른 이야기로 시작하지 않는다.
- 훅 하나에 아이디어 하나. 큰 말보다 구체적인 말(숫자·이름·날짜·실물).
- 결과물/증거를 20초 안에 보여준다 (`[ON SCREEN: ...]` 표기).
- 금지: 자기소개로 시작, 인트로 스팅, 구독 요청을 훅 앞에.
- 롱폼 30초 비트맵을 따른다:
  - 0~3초: 콜드 라인 또는 가장 강한 장면
  - 3~10초: 제목의 약속을 다시 말함
  - 10~18초: 판돈을 올리고 궁금증(열린 고리)을 남김
  - 18~28초: 시청 계약 ("끝까지 보면 ___ 를 알게 됩니다")
  - 28~30초: 본론으로 바로 컷
- 쇼츠: 첫 프레임에 결과, 무음으로도 이해되게, 마지막 문장이 첫 문장으로 이어지게.

## 채점
첫 문장(0~3초 라인)만 따로 뽑아 채점한다:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/score-hook.mjs" "훅1 첫 문장" "훅2 첫 문장" ...
```

- 휴리스틱이다. 점수는 참고값이며 WEAK 판정이라도 사용자가 원하면 쓴다.
- 결과 JSON의 `weakest` 속성을 보고 상위 후보를 한 번씩 고친 뒤 다시 채점한다(1회만).

## 출력
- 상위 2개를 전체 30초 스크립트로, 각각 `공식 · 점수 · 등급 · 약한 속성` 표시.
- 나머지 3개는 첫 문장만 한 줄씩.
- 사용자가 고르면 `videos.json`의 `hook`에 `{formula, text, score}` 기록, `content/<채널id>/<id>/script.md` 맨 위 `## Hook` 섹션에 저장, `updatedAt` 갱신.
- 마지막 줄: "이걸로 갈까요, 바꿀까요?"
