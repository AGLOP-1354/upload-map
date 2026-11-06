import "server-only";
import type { z } from "zod";
import type { ContentKind } from "@/lib/types";
import {
  channelIdSchema,
  channelsFileSchema,
  creditsFileSchema,
  plansFileSchema,
  seriesFileSchema,
  tasksFileSchema,
  videoIdSchema,
  videosFileSchema,
} from "./schema";
import { getStore, type FileContent } from "./store";

// 파일 경로·파싱·직렬화와 "읽기 → 변경 → 커밋" 공통 흐름.

/** 사용자에게 그대로 보여줄 수 있는 도메인 오류 */
export class DataError extends Error {}

// 경로에 들어가는 id 는 여기서 검사한다(경로 조작 방지).
function safeId(schema: z.ZodString, id: string, what: string): string {
  if (!schema.safeParse(id).success) throw new DataError(`잘못된 ${what}: ${id}`);
  return id;
}
const ch = (id: string) => safeId(channelIdSchema, id, "채널 id");

export const PATHS = {
  channels: "data/channels.json",
  series: (c: string) => `data/${ch(c)}/series.json`,
  videos: (c: string) => `data/${ch(c)}/videos.json`,
  plans: (c: string) => `data/${ch(c)}/plans.json`,
  tasks: (c: string) => `data/${ch(c)}/tasks.json`,
  credits: (c: string) => `data/${ch(c)}/credits.json`,
  /** 채널 폴더 안의 파일(로고 등). name 은 호출하는 쪽이 고정 패턴으로 검사한다 */
  channelFile: (c: string, name: string) => `data/${ch(c)}/${name}`,
  content: (c: string, videoId: string, kind: ContentKind) =>
    `content/${ch(c)}/${safeId(videoIdSchema, videoId, "영상 id")}/${kind}.md`,
} as const;

/** 파일 종류별 스키마와 빈 기본값 */
export const FILES = {
  channels: { schema: channelsFileSchema, empty: { version: 1, channels: [] } },
  series: { schema: seriesFileSchema, empty: { version: 1, series: [] } },
  videos: { schema: videosFileSchema, empty: { version: 1, videos: [] } },
  plans: { schema: plansFileSchema, empty: { version: 1, weeks: [] } },
  tasks: { schema: tasksFileSchema, empty: { version: 1, tasks: [] } },
  credits: { schema: creditsFileSchema, empty: { version: 1, credits: [] } },
} as const;

type Kind = keyof typeof FILES;
type FileOf<K extends Kind> = z.infer<(typeof FILES)[K]["schema"]>;

/** 파일이 없으면 빈 기본값. 파싱·형식 오류는 그대로 던진다(데이터 유실 방지) */
export function parse<K extends Kind>(kind: K, raw: string | null, file: string): FileOf<K> {
  const { schema, empty } = FILES[kind];
  if (raw === null) return structuredClone(empty) as FileOf<K>;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file} JSON 파싱 실패: ${(e as Error).message}`);
  }
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${file} 형식 오류: ${r.error.message}`);
  // 검증만 하고 원본을 돌려준다. zod 결과(r.data)는 키를 스키마 순서로 바꾸고 모르는 키를 지워서,
  // 다시 저장하면 건드리지 않은 레코드까지 diff 가 생긴다.
  return data as FileOf<K>;
}

/** 저장 전 검증 후 직렬화(원본 키 순서 유지) */
export function serialize<K extends Kind>(kind: K, value: FileOf<K>, file: string): string {
  const r = FILES[kind].schema.safeParse(value);
  if (!r.success) throw new DataError(`${file} 저장 전 검증 실패: ${r.error.message}`);
  return JSON.stringify(value, null, 2) + "\n";
}

export function readFiles(paths: string[]) {
  return getStore().read(paths);
}

export function readBytes(path: string) {
  return getStore().readBytes(path);
}

export interface Mutation<R> {
  changes: Record<string, FileContent>;
  message: string;
  result: R;
}

// 같은 인스턴스 안의 쓰기를 직렬화한다. 인스턴스 사이의 충돌은 github 커밋의 fast-forward 검사가 막는다.
let chain: Promise<unknown> = Promise.resolve();

/**
 * paths 를 읽어 fn 으로 변경을 계산하고 한 번에 커밋한다.
 * 그 사이 다른 커밋이 들어오면 최신 상태로 한 번만 다시 계산한다.
 * changes 가 비어 있으면 커밋하지 않는다.
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
      if (Object.keys(changes).length === 0) return { ...result, rev: snap.rev };
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
