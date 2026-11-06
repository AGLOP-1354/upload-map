<!-- 자동 생성 파일: `node scripts/wiki.mjs gen`. 직접 수정 금지. 근거: wiki/*.md frontmatter -->

# Wiki 인덱스

이 위키는 코드의 **현재 상태**만 기술한다. 규칙은 [AGENTS.md](../AGENTS.md)의 "LLM Wiki" 섹션. 질문에 답할 때 이 파일에서 시작한다.

## 서술 페이지 (LLM 유지)

| 페이지 | 요약 |
|---|---|
| [아키텍처](architecture.md) | Next.js 16 App Router 설정, 빌드·스타일 파이프라인, TypeScript/ESLint 구성 |
| [인증](auth.md) | 환경변수 단일 계정 로그인, HMAC 서명 세션 쿠키, proxy 리다이렉트, Server Action 재확인 |
| [Claude Code 설정](claude-setup.md) | .claude 권한·편집 후 검사 훅, 유튜브 스킬 보조 스크립트(훅 채점·제목 린트·현황 요약), next-devtools MCP |
| [데이터](data.md) | data/·content/ 파일 배치, lib/types.ts 타입과 zod 검증, Store(fs|github) 저장 계층, UI 쓰기 경로 |
| [원격 MCP](mcp.md) | claude.ai 커스텀 커넥터용 /api/mcp — 도구 11개, 채널 단위 도메인 함수, Bearer 토큰 인증, 배포 환경 변수 |
| [개요](overview.md) | 제품 목적·운영 제약(소유자 진술)과 코드 기준 현재 구현 상태 |
| [위키 도구](tooling.md) | LLM Wiki 생성·검증 스크립트, Claude Code 훅과 git pre-commit 자동 실행 경로 |
| [UI](ui.md) | 통합 단계 보드(사이드바·6열 칸반·필터·side peek drawer)와 채널 등록·설정 화면, 공용 컴포넌트, 다크 테마 토큰과 폰트 |

## 생성 페이지 (스크립트 유지)

- [파일 맵 — 파일·라인 수·export 심볼](generated/files.md)
- [라우트 — app/ 파일 컨벤션 기반 URL](generated/routes.md)
- [패키지 — 스크립트·의존성·lock 버전](generated/package.md)
