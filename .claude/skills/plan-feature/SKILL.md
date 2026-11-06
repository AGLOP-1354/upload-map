---
name: plan-feature
description: 앱 기능을 만들기 전에 요구사항을 짧게 묻고 구현 계획을 docs/plans/YYYY-MM-DD-<slug>.md로 작성 — 각 단계는 한 가지 행동과 확인 방법을 가진다. 사용자가 직접 /plan-feature로 호출할 때만.
argument-hint: "[만들 기능]"
disable-model-invocation: true
---

# 기능 계획

기능: $ARGUMENTS

obra/superpowers의 brainstorming + writing-plans를 1인용 프로젝트 규모로 줄인 것.

## 1. 질문 (한 번에 하나씩, 최대 3개)
- 이 기능으로 **무엇을 판단하거나 행동**하고 싶은지 (예: "이번 주 막힌 영상을 바로 보고 싶다")
- 어느 화면에서, 얼마나 자주 쓰는지
- 이번에 **안 할 것**
답이 명확하면 질문을 건너뛴다.

## 2. 설계 확인
- 접근 2가지 이하를 비교하고 하나를 추천. 1인용·로컬 JSON 전제에서 가장 단순한 것.
- 데이터 스키마가 바뀌면 `.claude/rules/data-layer.md` 수정을 계획 첫 단계로 넣는다.
- 확신 없는 Next.js API는 이 단계에서 `node_modules/next/dist/docs/`로 확인하고 문서 경로를 계획에 적는다.

## 3. 계획 파일
`docs/plans/<오늘 YYYY-MM-DD>-<kebab-slug>.md`:
```md
# <기능 이름>
목표: <한 문장>
안 할 것: <목록>
참고 문서: <node_modules/next/dist/docs/... 경로>

## 단계
1. [ ] <행동 하나> — 확인: <명령 또는 화면에서 볼 것>
2. [ ] ...
N. [ ] /verify 로 전체 확인
```
- 단계는 2~15분 단위. 파일 경로를 구체적으로.
- 저장 후 요약 3줄 + "이 계획으로 진행할까요?" — 승인 전에는 코드를 쓰지 않는다.
- 진행하면서 단계를 `[x]`로 체크한다.
