<!-- 자동 생성 파일: `node scripts/wiki.mjs gen`. 직접 수정 금지. 근거: wiki/*.md frontmatter -->

# Wiki 인덱스

이 위키는 코드의 **현재 상태**만 기술한다. 규칙은 [AGENTS.md](../AGENTS.md)의 "LLM Wiki" 섹션. 질문에 답할 때 이 파일에서 시작한다.

## 서술 페이지 (LLM 유지)

| 페이지 | 요약 |
|---|---|
| [아키텍처](architecture.md) | Next.js 16 App Router 설정, 빌드·스타일 파이프라인, TypeScript/ESLint 구성 |
| [Claude Code 설정](claude-setup.md) | .claude 권한·편집 후 검사 훅, 유튜브 스킬 보조 스크립트(훅 채점·제목 린트·현황 요약), next-devtools MCP |
| [데이터·MCP](data.md) | 데이터 타입·검증, 저장 백엔드(fs/GitHub 커밋), 도메인 함수, 원격 MCP 도구와 인증, 배포 설정 |
| [개요](overview.md) | 제품 목적·운영 제약(소유자 진술)과 코드 기준 현재 구현 상태 |
| [위키 도구](tooling.md) | LLM Wiki 생성·검증 스크립트, Claude Code 훅과 git pre-commit 자동 실행 경로 |
| [UI](ui.md) | 루트 레이아웃, 페이지, 전역 스타일·테마 토큰의 현재 구조 |

## 생성 페이지 (스크립트 유지)

- [파일 맵 — 파일·라인 수·export 심볼](generated/files.md)
- [라우트 — app/ 파일 컨벤션 기반 URL](generated/routes.md)
- [패키지 — 스크립트·의존성·lock 버전](generated/package.md)
