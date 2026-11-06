import "server-only";
import type { z } from "zod";
import type { Channel, ContentKind, PlansFile, VideosFile } from "@/lib/types";
import { channelSchema, plansFileSchema, videosFileSchema } from "./schema";
import { getStore } from "./store";

// 파일 경로·파싱·직렬화와 "읽기 → 변경 → 커밋" 공통 흐름.

export const PATHS = {
  channel: "data/channel.json",
  videos: "data/videos.json",
  plans: "data/plans.json",
  content: (id: string, kind: ContentKind) => `content/videos/${id}/${kind}.md`,
} as const;

/** 사용자에게 그대로 보여줄 수 있는 도메인 오류 */
export class DataError extends Error {}

function parse<S extends z.ZodType>(schema: S, raw: string | null, file: string, fallback: z.infer<S>): z.infer<S> {
  if (raw === null) return fallback;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file} JSON 파싱 실패: ${(e as Error).message}`);
  }
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${file} 형식 오류: ${r.error.message}`);
  return r.data;
}

export const parseVideos = (raw: string | null): VideosFile =>
  parse(videosFileSchema, raw, PATHS.videos, { version: 1, videos: [] });
export const parsePlans = (raw: string | null): PlansFile =>
  parse(plansFileSchema, raw, PATHS.plans, { version: 1, weeks: [] });
export const parseChannel = (raw: string | null): Channel | null =>
  raw === null ? null : parse(channelSchema, raw, PATHS.channel, null as never);

/** 저장 전 검증 후 직렬화 */
export function serialize<S extends z.ZodType>(schema: S, value: z.infer<S>, file: string): string {
  const r = schema.safeParse(value);
  if (!r.success) throw new DataError(`${file} 저장 전 검증 실패: ${r.error.message}`);
  return JSON.stringify(r.data, null, 2) + "\n";
}

export const serializeVideos = (v: VideosFile) => serialize(videosFileSchema, v, PATHS.videos);
export const serializePlans = (p: PlansFile) => serialize(plansFileSchema, p, PATHS.plans);

export async function readFiles(paths: string[]) {
  return getStore().read(paths);
}

export interface Mutation<R> {
  changes: Record<string, string>;
  message: string;
  result: R;
}

// 같은 인스턴스 안의 쓰기를 직렬화한다. 인스턴스 사이의 충돌은 github 커밋의 fast-forward 검사가 막는다.
let chain: Promise<unknown> = Promise.resolve();

/**
 * paths 를 읽어 fn 으로 변경을 계산하고 한 번에 커밋한다.
 * 그 사이 다른 커밋이 들어오면 최신 상태로 한 번만 다시 계산한다.
 */
export function mutate<R>(
  paths: string[],
  fn: (files: Record<string, string | null>) => Mutation<R>,
): Promise<R & { rev: string }> {
  const run = async () => {
    const store = getStore();
    for (let attempt = 0; attempt < 2; attempt++) {
      const snap = await store.read(paths);
      const { changes, message, result } = fn(snap.files);
      const res = await store.commit(snap.rev, changes, message);
      if (res.ok) return { ...result, rev: res.rev };
    }
    throw new DataError("다른 변경과 충돌했습니다. 최신 상태를 다시 읽고 시도해 주세요.");
  };
  const next = chain.then(run, run);
  chain = next.catch(() => {});
  return next;
}

const seoulDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

/** Asia/Seoul 기준 YYYY-MM-DD */
export const todaySeoul = (d = new Date()) => seoulDate.format(d);

/** 해당 날짜가 속한 주의 월요일 (YYYY-MM-DD) */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}
