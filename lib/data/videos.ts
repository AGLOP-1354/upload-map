import "server-only";
import {
  CONTENT_KINDS,
  VIDEO_STATUSES,
  type ContentKind,
  type SlotRole,
  type Video,
  type VideoMetrics,
  type VideoStatus,
} from "@/lib/types";
import {
  DataError,
  PATHS,
  mondayOf,
  mutate,
  parseChannel,
  parsePlans,
  parseVideos,
  readFiles,
  serializePlans,
  serializeVideos,
  todaySeoul,
} from "./files";

// 영상·주간 계획 도메인 함수. UI(Server Action)와 MCP 도구가 함께 쓴다.

const now = () => new Date().toISOString();

function findVideo(videos: Video[], id: string): Video {
  const v = videos.find((x) => x.id === id);
  if (!v) throw new DataError(`영상 '${id}' 이(가) 없습니다`);
  return v;
}

// ── 읽기 ──────────────────────────────────────────────

export async function getState() {
  const { files, rev } = await readFiles([PATHS.channel, PATHS.videos, PATHS.plans]);
  return {
    rev,
    channel: parseChannel(files[PATHS.channel]),
    videos: parseVideos(files[PATHS.videos]).videos,
    weeks: parsePlans(files[PATHS.plans]).weeks,
  };
}

export async function getVideo(id: string, include: ContentKind[] = []) {
  const contentPaths = include.map((k) => PATHS.content(id, k));
  const { files } = await readFiles([PATHS.videos, ...contentPaths]);
  const video = findVideo(parseVideos(files[PATHS.videos]).videos, id);
  const content = Object.fromEntries(include.map((k) => [k, files[PATHS.content(id, k)]]));
  return { video, content };
}

export function weekOfToday() {
  return mondayOf(todaySeoul());
}

/** yt-status 와 같은 기준의 진행 현황 요약 */
export async function getOverview() {
  const { channel, videos, weeks } = await getState();
  const today = todaySeoul();
  const byStatus = Object.fromEntries(
    VIDEO_STATUSES.map((s) => [s, videos.filter((v) => v.status === s).map((v) => v.id)]),
  );
  const active = videos.filter((v) => !["published", "reviewed", "dropped", "idea"].includes(v.status));
  const overdue = active
    .filter((v) => v.targetPublishDate && v.targetPublishDate < today)
    .map((v) => ({ id: v.id, status: v.status, targetPublishDate: v.targetPublishDate }));
  const needMetrics = videos
    .filter((v) => {
      if (v.status !== "published" || !v.publishedAt) return false;
      const days = (Date.now() - Date.parse(v.publishedAt)) / 864e5;
      const has = (d: number) => v.metrics.some((m) => m.daysSincePublish === d);
      return (days >= 2 && !has(2)) || (days >= 7 && !has(7));
    })
    .map((v) => ({ id: v.id, publishedAt: v.publishedAt }));
  const thisWeek = weeks.find((w) => w.weekOf === mondayOf(today)) ?? null;
  return {
    today,
    channel: channel && { name: channel.name, pillars: channel.pillars, cadence: channel.cadence },
    videoCount: videos.length,
    byStatus,
    overdue,
    needMetrics,
    thisWeek,
  };
}

// ── 쓰기 ──────────────────────────────────────────────

export interface CreateVideoInput {
  id: string;
  workingTitle: string;
  format: Video["format"];
  pillarId: string;
  promise?: string;
  parentId?: string;
}

export function createVideo(input: CreateVideoInput) {
  return mutate([PATHS.channel, PATHS.videos], (files) => {
    const channel = parseChannel(files[PATHS.channel]);
    if (!channel) throw new DataError("data/channel.json 이 없습니다. 채널 프로필(필러)부터 만들어 주세요.");
    if (!channel.pillars.some((p) => p.id === input.pillarId)) {
      throw new DataError(
        `필러 '${input.pillarId}' 이(가) 없습니다. 가능한 값: ${channel.pillars.map((p) => p.id).join(", ")}`,
      );
    }
    const file = parseVideos(files[PATHS.videos]);
    if (file.videos.some((v) => v.id === input.id)) throw new DataError(`id '${input.id}' 이(가) 이미 있습니다`);
    if (input.parentId) findVideo(file.videos, input.parentId);
    const t = now();
    const video: Video = { ...input, status: "idea", metrics: [], createdAt: t, updatedAt: t };
    file.videos.push(video);
    return {
      changes: { [PATHS.videos]: serializeVideos(file) },
      message: `아이디어: ${input.id} 추가`,
      result: { video },
    };
  });
}

export type VideoPatch = Partial<
  Pick<Video, "workingTitle" | "promise" | "hook" | "package" | "targetPublishDate" | "youtubeId" | "notes">
>;

export function updateVideo(id: string, patch: VideoPatch) {
  return mutate([PATHS.videos], (files) => {
    const file = parseVideos(files[PATHS.videos]);
    const v = findVideo(file.videos, id);
    Object.assign(v, patch, { updatedAt: now() });
    return {
      changes: { [PATHS.videos]: serializeVideos(file) },
      message: `수정: ${id} (${Object.keys(patch).join(", ")})`,
      result: { video: v },
    };
  });
}

const FLOW: readonly VideoStatus[] = VIDEO_STATUSES.filter((s) => s !== "dropped");

/** 단계 s 를 떠나기 위한 조건(.claude/rules/youtube-domain.md). 못 채우면 경고 문구 */
function exitWarning(s: VideoStatus, v: Video, has: (k: ContentKind) => boolean): string | null {
  switch (s) {
    case "idea":
      return v.promise ? null : "idea: 시청자 약속(promise) 한 문장이 없습니다";
    case "research":
      if (v.format === "short") return null;
      return has("brief") ? null : "research: 브리프(brief.md)가 없습니다";
    case "scripting": {
      const missing = [];
      if (!v.hook?.text) missing.push("훅");
      else if (v.hook.score !== undefined && v.hook.score < 55) missing.push(`훅 점수 ${v.hook.score}(WEAK)`);
      if (!has("script")) missing.push("대본(script.md)");
      return missing.length ? `scripting: ${missing.join(", ")} 확인 필요` : null;
    }
    case "packaging":
      if (v.format === "short") return null;
      if (!v.package?.selectedTitle) return "packaging: 선택된 제목이 없습니다";
      if (!v.package.thumbnailText && !v.package.thumbnailConcept) return "packaging: 썸네일 문구/컨셉이 없습니다";
      return null;
    case "published":
      return v.metrics.length ? null : "published: 지표 스냅샷이 없습니다";
    default:
      return null;
  }
}

export function setStatus(id: string, status: VideoStatus, reason?: string) {
  if (status === "dropped" && !reason?.trim()) throw new DataError("dropped 로 바꾸려면 reason(사유)이 필요합니다");
  const contentPaths = (["brief", "script"] as const).map((k) => PATHS.content(id, k));
  return mutate([PATHS.videos, ...contentPaths], (files) => {
    const file = parseVideos(files[PATHS.videos]);
    const v = findVideo(file.videos, id);
    const from = v.status;
    const has = (k: ContentKind) => Boolean(files[PATHS.content(id, k)]?.trim());

    const warnings: string[] = [];
    const fi = FLOW.indexOf(from);
    const ti = FLOW.indexOf(status);
    if (fi >= 0 && ti > fi) {
      for (const s of FLOW.slice(fi, ti)) {
        const w = exitWarning(s, v, has);
        if (w) warnings.push(w);
      }
    }

    const t = now();
    v.status = status;
    v.updatedAt = t;
    if (status === "published" && !v.publishedAt) v.publishedAt = t;
    const note = reason?.trim() ? `[${todaySeoul()} ${from}→${status}] ${reason.trim()}` : null;
    if (note) v.notes = v.notes ? `${v.notes}\n${note}` : note;

    return {
      changes: { [PATHS.videos]: serializeVideos(file) },
      message: `진행: ${id} 상태 ${from} → ${status}`,
      result: { video: v, from, warnings },
    };
  });
}

export type MetricsInput = Omit<VideoMetrics, "capturedAt" | "daysSincePublish"> &
  Partial<Pick<VideoMetrics, "capturedAt" | "daysSincePublish">>;

export function addMetrics(id: string, input: MetricsInput) {
  return mutate([PATHS.videos], (files) => {
    const file = parseVideos(files[PATHS.videos]);
    const v = findVideo(file.videos, id);
    const capturedAt = input.capturedAt ?? now();
    let days = input.daysSincePublish;
    if (days === undefined) {
      if (!v.publishedAt) throw new DataError("publishedAt 이 없어 daysSincePublish 를 계산할 수 없습니다. 직접 넣어 주세요.");
      days = Math.floor((Date.parse(capturedAt) - Date.parse(v.publishedAt)) / 864e5);
    }
    const snapshot: VideoMetrics = { ...input, capturedAt, daysSincePublish: days };
    v.metrics.push(snapshot);
    v.updatedAt = now();
    return {
      changes: { [PATHS.videos]: serializeVideos(file) },
      message: `지표: ${id} ${days}일차 스냅샷 추가`,
      result: { video: v, snapshot },
    };
  });
}

export function saveContent(id: string, kind: ContentKind, markdown: string) {
  if (!CONTENT_KINDS.includes(kind)) throw new DataError(`kind 는 ${CONTENT_KINDS.join(", ")} 중 하나여야 합니다`);
  const path = PATHS.content(id, kind);
  return mutate([PATHS.videos], (files) => {
    const file = parseVideos(files[PATHS.videos]);
    const v = findVideo(file.videos, id);
    v.updatedAt = now();
    const body = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
    return {
      changes: { [path]: body, [PATHS.videos]: serializeVideos(file) },
      message: `${kind}: ${id} ${kind}.md 저장`,
      result: { path, bytes: Buffer.byteLength(body) },
    };
  });
}

export interface WeekSlotInput {
  weekOf: string;
  videoId: string;
  role: SlotRole;
  due?: string;
  done?: boolean;
}

export function setWeekSlot(input: WeekSlotInput) {
  if (mondayOf(input.weekOf) !== input.weekOf) {
    throw new DataError(`weekOf 는 월요일이어야 합니다 (${input.weekOf} 의 월요일: ${mondayOf(input.weekOf)})`);
  }
  return mutate([PATHS.videos, PATHS.plans], (files) => {
    findVideo(parseVideos(files[PATHS.videos]).videos, input.videoId);
    const plans = parsePlans(files[PATHS.plans]);
    let week = plans.weeks.find((w) => w.weekOf === input.weekOf);
    if (!week) {
      week = { weekOf: input.weekOf, slots: [] };
      plans.weeks.push(week);
      plans.weeks.sort((a, b) => a.weekOf.localeCompare(b.weekOf));
    }
    let slot = week.slots.find((s) => s.videoId === input.videoId);
    if (!slot) {
      slot = { videoId: input.videoId, role: input.role, done: false };
      week.slots.push(slot);
    }
    slot.role = input.role;
    if (input.due !== undefined) slot.due = input.due;
    if (input.done !== undefined) slot.done = input.done;
    return {
      changes: { [PATHS.plans]: serializePlans(plans) },
      message: `주간: ${input.weekOf} ${input.videoId}(${input.role})${slot.done ? " 완료" : ""}`,
      result: { week },
    };
  });
}
