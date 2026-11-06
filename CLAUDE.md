@AGENTS.md

# upload-map

유튜브 채널 운영자 1인용 계획·진행도 관리 앱. Next.js 16 (App Router, `cacheComponents: true`) + React 19 + Tailwind v4.
DB 없음 — 모든 데이터는 `data/*.json`, 긴 글(대본 등)은 `content/videos/<id>/*.md`.

## 명령어

- 개발 서버: `npm run dev` (이미 떠 있으면 `.next/dev/lock`에 URL/PID가 있음 — 새로 띄우지 말고 재사용)
- 린트: `npm run lint`
- 타입체크: `npx tsc --noEmit`
- 빌드(최종 확인용): `npm run build`
- 테스트 러너는 아직 없음. 추가하기 전에 사용자에게 물어볼 것.

## 어디에 무엇이 있나

- 작업 원칙·완료 기준: `.claude/rules/working-principles.md`
- 도메인 용어(제작 단계·KPI): `.claude/rules/youtube-domain.md`
- JSON 스키마·저장 규칙: `.claude/rules/data-layer.md` (← 스키마의 단일 출처)
- Next.js 16 코딩 규칙: `.claude/rules/nextjs.md`

## 하지 말 것

- `data/*.json`을 앱 밖에서 일괄 재작성하지 말 것. 손으로 고쳐야 하면 해당 레코드만 바꾸고 `updatedAt` 갱신.
- 유튜브에 업로드/게시했다고 말하지 말 것. Claude는 초안을 만들고, 게시는 사용자가 한다.
- 조회수·CTR 등 수치를 지어내지 말 것. 없으면 물어볼 것.
- 새 npm 의존성은 사용자 확인 후에만 추가.
