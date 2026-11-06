import "server-only";
import { connection } from "next/server";
import type { Channel, Credit, Series, Task, Video } from "@/lib/types";
import { FILES, PATHS, mutate, parse, readBytes, readFiles, serialize } from "./files";

// UI(페이지·Server Action)용 읽기/쓰기. 저장 백엔드(fs | github)는 files.ts → store.ts 가 고른다.

const CHANNEL_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function listChannels(): Promise<Channel[]> {
  await connection();
  const { files } = await readFiles([PATHS.channels]);
  return parse("channels", files[PATHS.channels], PATHS.channels).channels;
}

export async function getChannel(id: string): Promise<Channel | undefined> {
  if (!CHANNEL_ID.test(id)) return undefined;
  return (await listChannels()).find((c) => c.id === id);
}

export interface ChannelData {
  series: Series[];
  videos: Video[];
  tasks: Task[];
  credits: Credit[];
}

export async function getChannelData(id: string): Promise<ChannelData> {
  await connection();
  const p = { s: PATHS.series(id), v: PATHS.videos(id), t: PATHS.tasks(id), c: PATHS.credits(id) };
  const { files } = await readFiles(Object.values(p));
  return {
    series: parse("series", files[p.s], p.s).series,
    videos: parse("videos", files[p.v], p.v).videos,
    tasks: parse("tasks", files[p.t], p.t).tasks,
    credits: parse("credits", files[p.c], p.c).credits,
  };
}

// ---- 쓰기 (Server Action 에서만 호출) ----

export async function addChannel(channel: Channel): Promise<void> {
  await mutate([PATHS.channels], (files) => {
    const f = parse("channels", files[PATHS.channels], PATHS.channels);
    if (f.channels.some((c) => c.id === channel.id)) throw new Error("DUPLICATE");
    f.channels.push(channel);
    return {
      changes: { [PATHS.channels]: serialize("channels", f, PATHS.channels) },
      message: `채널: ${channel.id} 등록`,
      result: {},
    };
  });
}

export async function updateVideo(channelId: string, videoId: string, fn: (v: Video) => void): Promise<boolean> {
  const path = PATHS.videos(channelId);
  const r = await mutate([path], (files) => {
    const f = parse("videos", files[path], path);
    const v = f.videos.find((x) => x.id === videoId);
    if (!v) return { changes: {}, message: "", result: { ok: false } };
    fn(v);
    v.updatedAt = new Date().toISOString();
    return {
      changes: { [path]: serialize("videos", f, path) },
      message: `진행표: ${channelId}/${videoId} 수정`,
      result: { ok: true },
    };
  });
  return r.ok;
}

export async function updateTask(channelId: string, taskId: string, fn: (t: Task) => void): Promise<boolean> {
  const path = PATHS.tasks(channelId);
  const r = await mutate([path], (files) => {
    const f = parse("tasks", files[path], path);
    const t = f.tasks.find((x) => x.id === taskId);
    if (!t) return { changes: {}, message: "", result: { ok: false } };
    fn(t);
    t.updatedAt = new Date().toISOString();
    return {
      changes: { [path]: serialize("tasks", f, path) },
      message: `확인 대기: ${channelId}/${taskId} ${t.done ? "완료" : "되돌림"}`,
      result: { ok: true },
    };
  });
  return r.ok;
}

// 새 채널: 빈 데이터 파일과(있으면) 로고를 만든다. channels.json 등록 전에 호출한다.
export async function initChannelFiles(id: string, logo?: { name: string; bytes: Uint8Array }): Promise<void> {
  const kinds = ["series", "videos", "plans", "tasks", "credits"] as const;
  const paths = kinds.map((k) => PATHS[k](id));
  await mutate(paths, (files) => {
    const changes: Record<string, string | Uint8Array> = {};
    kinds.forEach((k, i) => {
      if (files[paths[i]] === null) changes[paths[i]] = JSON.stringify(FILES[k].empty, null, 2) + "\n";
    });
    if (logo) changes[PATHS.channelFile(id, logo.name)] = logo.bytes;
    return { changes, message: `채널: ${id} 데이터 폴더 생성`, result: {} };
  });
}

export async function readChannelLogo(id: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const ch = await getChannel(id);
  if (!ch?.logo || !/^logo\.(png|jpg|webp)$/.test(ch.logo)) return null;
  const bytes = await readBytes(PATHS.channelFile(id, ch.logo));
  if (!bytes) return null;
  const ext = ch.logo.split(".")[1];
  return { bytes, type: ext === "jpg" ? "image/jpeg" : `image/${ext}` };
}
