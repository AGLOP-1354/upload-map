---
name: yt-status
description: 채널 제작 현황 브리핑 — 단계별 영상, 마감 지난 것, 지표 기록이 필요한 영상, 이번 주 계획 진행도를 data/*.json에서 읽어 요약하고 오늘 할 일 1~3개를 제안. "진행 상황", "지금 뭐 해야 돼", "이번 주 어때", "status", "현황" 같은 요청에 사용.
allowed-tools: Read, Bash(node *)
---

# 제작 현황 브리핑

## 현재 데이터

!`node "${CLAUDE_SKILL_DIR}/scripts/summary.mjs" . || true`

## 할 일

1. 위 출력만 근거로 요약한다. 출력에 없는 수치를 만들지 않는다.
2. 다음 순서로 우선순위를 매겨 **오늘 할 일 1~3개**를 제안한다:
   1. 지표 기록 필요(48h/7d) → `/yt-review <id>`
   2. 마감 지난 영상 → 막힌 단계가 뭔지 짚고 다음 행동 하나
   3. 이번 주 미완료 슬롯 중 `anchor` 우선
   4. 진행 중 영상이 없으면 → `idea` 백로그에서 후보를 골라 `/yt-package` (패키징 먼저 테스트)
3. 데이터가 없으면 `data/channel.json` 부터 만들자고 제안한다 (스키마: `.claude/rules/data-layer.md`).

출력 형식: 3줄 요약 → 할 일 목록(각각 실행할 스킬 명시). 길게 쓰지 않는다.
