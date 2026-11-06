import { timingSafeEqual } from "node:crypto";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import {
  contentKindSchema,
  hookSchema,
  metricsSchema,
  packageSchema,
  slotRoleSchema,
  videoIdSchema,
  videoStatusSchema,
} from "@/lib/data/schema";
import {
  addMetrics,
  createVideo,
  getOverview,
  getState,
  getVideo,
  saveContent,
  setStatus,
  setWeekSlot,
  updateVideo,
  weekOfToday,
} from "@/lib/data/videos";

// claude.ai 커스텀 커넥터용 원격 MCP 서버. 도구는 lib/data 도메인 함수만 부른다.

const INSTRUCTIONS = `유튜브 채널 1인 운영자의 기획·제작 진행도 앱이다. 영상 기획·제작을 도우면서 진행 상황을 이 도구로 기록한다.

제작 단계(status): idea → research → scripting → packaging → filming → editing → scheduled → published → reviewed. 보류/폐기는 dropped(사유 필수).
- 다음 단계 조건: idea=필러+시청자 약속 한 문장 / research=브리프 / scripting=훅 확정(점수 55+ WORKABLE, 72+ STRONG)+대본 초안 / packaging=제목 1개 선택+썸네일 문구·컨셉 / filming=촬영본 / editing=최종 렌더 / scheduled=게시 / published=48시간·7일 지표 기록.
- 쇼츠(format "short")는 research, packaging 을 건너뛸 수 있다. 패키징을 대본보다 먼저 해도 된다.
- 핵심 원칙: 훅(첫 15~30초)·제목·썸네일은 같은 약속을 한다. 썸네일 문구는 제목을 반복하지 않는다.

규칙:
- 작업을 시작할 때 get_overview 로 현황을 먼저 본다.
- 결정된 것만 기록한다(제목 후보를 고르기 전이면 selectedTitle 을 넣지 않는다). 긴 글(브리프·대본·패키지·회고)은 save_content 로 마크다운에 저장한다.
- 조회수·CTR 등 지표는 사용자가 준 수치만 add_metrics 로 기록한다. 지어내거나 추정하지 않는다. 없으면 물어본다.
- 유튜브에 업로드·게시했다고 말하지 않는다. 게시는 사용자가 한다. published 는 사용자가 게시했다고 말했을 때만 설정한다.
- KPI 경험치(CTR 4~8% 양호 등)는 검증된 기준이 아니라 대략적 경험치라고 밝힌다. 아웃라이어는 채널 자기 중앙값 대비 배수로 판단한다.
- 쓰기 도구는 호출할 때마다 GitHub 에 커밋 1개를 만든다. 결과의 warnings 가 있으면 사용자에게 알려준다.`;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await fn(), null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
  }
}

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

const handler = createMcpHandler(
  (server) => {
    // ── 읽기 ──
    server.registerTool(
      "get_overview",
      {
        title: "진행 현황",
        description: "채널 요약, 단계별 영상 id, 마감 지난 영상, 지표 기록이 필요한 영상, 이번 주 계획을 돌려준다.",
        inputSchema: z.object({}),
        annotations: READ,
      },
      () => run(getOverview),
    );

    server.registerTool(
      "list_videos",
      {
        title: "영상 목록",
        description: "영상 목록(요약 필드). status·pillarId 로 거를 수 있다.",
        inputSchema: z.object({ status: videoStatusSchema.optional(), pillarId: z.string().optional() }),
        annotations: READ,
      },
      ({ status, pillarId }) =>
        run(async () => {
          const { videos } = await getState();
          return videos
            .filter((v) => (!status || v.status === status) && (!pillarId || v.pillarId === pillarId))
            .map(({ id, workingTitle, format, pillarId, status, targetPublishDate, updatedAt }) => ({
              id,
              workingTitle,
              format,
              pillarId,
              status,
              targetPublishDate,
              updatedAt,
            }));
        }),
    );

    server.registerTool(
      "get_video",
      {
        title: "영상 상세",
        description: "영상 레코드 전체와, include 로 요청한 마크다운(brief·script·package·review). 없는 문서는 null.",
        inputSchema: z.object({ id: videoIdSchema, include: z.array(contentKindSchema).optional() }),
        annotations: READ,
      },
      ({ id, include }) => run(() => getVideo(id, include)),
    );

    server.registerTool(
      "get_week",
      {
        title: "주간 계획",
        description: "주간 계획. weekOf(월요일 YYYY-MM-DD)를 생략하면 이번 주(Asia/Seoul).",
        inputSchema: z.object({ weekOf: z.string().optional() }),
        annotations: READ,
      },
      ({ weekOf }) =>
        run(async () => {
          const target = weekOf ?? weekOfToday();
          const { weeks } = await getState();
          return weeks.find((w) => w.weekOf === target) ?? { weekOf: target, slots: [], empty: true };
        }),
    );

    // ── 쓰기 ──
    server.registerTool(
      "create_video",
      {
        title: "영상 아이디어 추가",
        description: "새 영상을 idea 단계로 추가한다. id 는 kebab-case 영문 슬러그(불변). pillarId 는 채널 필러 id.",
        inputSchema: z.object({
          id: videoIdSchema,
          workingTitle: z.string().min(1),
          format: z.enum(["long", "short"]),
          pillarId: z.string().min(1),
          promise: z.string().optional().describe("시청자에게 하는 약속 한 문장"),
          parentId: z.string().optional().describe("쇼츠가 잘려 나온 롱폼 id"),
        }),
        annotations: WRITE,
      },
      (input) => run(() => createVideo(input)),
    );

    server.registerTool(
      "update_video",
      {
        title: "영상 정보 수정",
        description:
          "영상 필드를 부분 수정한다(workingTitle, promise, hook, package, targetPublishDate, youtubeId, notes). hook·package 는 객체 전체를 교체한다. 단계는 set_status, 지표는 add_metrics 로.",
        inputSchema: z.object({
          id: videoIdSchema,
          patch: z
            .object({
              workingTitle: z.string().min(1).optional(),
              promise: z.string().optional(),
              hook: hookSchema.optional(),
              package: packageSchema.optional(),
              targetPublishDate: z.string().optional().describe("YYYY-MM-DD"),
              youtubeId: z.string().optional(),
              notes: z.string().optional(),
            })
            .strict(),
        }),
        annotations: { ...WRITE, idempotentHint: true },
      },
      ({ id, patch }) => run(() => updateVideo(id, patch)),
    );

    server.registerTool(
      "set_status",
      {
        title: "제작 단계 변경",
        description:
          "제작 단계를 바꾼다. 다음 단계 조건을 못 채우면 막지 않고 warnings 로 돌려준다. dropped 는 reason 필수. reason 은 notes 에 날짜와 함께 남는다.",
        inputSchema: z.object({ id: videoIdSchema, status: videoStatusSchema, reason: z.string().optional() }),
        annotations: WRITE,
      },
      ({ id, status, reason }) => run(() => setStatus(id, status, reason)),
    );

    server.registerTool(
      "add_metrics",
      {
        title: "지표 스냅샷 추가",
        description:
          "게시 후 지표 스냅샷을 누적한다(덮어쓰지 않음). 사용자가 YouTube Studio 에서 확인해 알려준 수치만 넣는다. ctr·비율은 0~100(%). daysSincePublish 를 생략하면 publishedAt 으로 계산.",
        inputSchema: z.object({
          id: videoIdSchema,
          snapshot: metricsSchema.partial({ capturedAt: true, daysSincePublish: true }),
        }),
        annotations: WRITE,
      },
      ({ id, snapshot }) => run(() => addMetrics(id, snapshot)),
    );

    server.registerTool(
      "save_content",
      {
        title: "긴 글 저장",
        description:
          "content/videos/<id>/<kind>.md 를 통째로 교체 저장한다. kind: brief(리서치 브리프), script(대본, 맨 위 ## Hook), package(제목 후보·썸네일 브리프), review(성과 회고). 부분 수정이면 get_video 로 먼저 읽고 전체를 보낸다.",
        inputSchema: z.object({ id: videoIdSchema, kind: contentKindSchema, markdown: z.string().min(1) }),
        annotations: { ...WRITE, idempotentHint: true },
      },
      ({ id, kind, markdown }) => run(() => saveContent(id, kind, markdown)),
    );

    server.registerTool(
      "set_week_slot",
      {
        title: "주간 슬롯 설정",
        description:
          "주간 계획에 영상 슬롯을 추가하거나 수정한다(같은 videoId 면 갱신). weekOf 는 그 주 월요일. role: anchor(공들인 롱폼) / cheap(재활용 롱폼) / short(쇼츠).",
        inputSchema: z.object({
          weekOf: z.string().describe("월요일 YYYY-MM-DD"),
          videoId: videoIdSchema,
          role: slotRoleSchema,
          due: z.string().optional().describe("YYYY-MM-DD"),
          done: z.boolean().optional(),
        }),
        annotations: { ...WRITE, idempotentHint: true },
      },
      (input) => run(() => setWeekSlot(input)),
    );
  },
  {
    serverInfo: { name: "upload-map", version: "0.1.0" },
    instructions: INSTRUCTIONS,
  },
);

/** 정적 Bearer 토큰 검사. MCP_TOKEN 이 없으면 모두 거부(닫힌 상태가 기본). */
function verifyToken(_req: Request, bearerToken?: string) {
  const expected = process.env.MCP_TOKEN;
  if (!expected || !bearerToken) return undefined;
  const a = Buffer.from(bearerToken);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  return { token: bearerToken, clientId: "owner", scopes: [] };
}

const authed = withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
