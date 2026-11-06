import "server-only";
import { connection } from "next/server";
import type { Channel, Credit, Series, Task, Video } from "@/lib/types";
import { assertChannelId, dataPath, mutateJson, readJson, serialize, writeJsonNow, writeNow } from "./store";

type ChannelsFile = { version: 1; channels: Channel[] };
type SeriesFile = { version: 1; series: Series[] };
type VideosFile = { version: 1; videos: Video[] };
type TasksFile = { version: 1; tasks: Task[] };
type CreditsFile = { version: 1; credits: Credit[] };

const channelsFile = () => dataPath("channels.json");
const chFile = (id: string, name: string) => dataPath(assertChannelId(id), name);

export async function listChannels(): Promise<Channel[]> {
  await connection();
  const f = await readJson<ChannelsFile>(channelsFile(), { version: 1, channels: [] });
  return f.channels;
}

export async function getChannel(id: string): Promise<Channel | undefined> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return undefined;
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
  const [s, v, t, c] = await Promise.all([
    readJson<SeriesFile>(chFile(id, "series.json"), { version: 1, series: [] }),
    readJson<VideosFile>(chFile(id, "videos.json"), { version: 1, videos: [] }),
    readJson<TasksFile>(chFile(id, "tasks.json"), { version: 1, tasks: [] }),
    readJson<CreditsFile>(chFile(id, "credits.json"), { version: 1, credits: [] }),
  ]);
  return { series: s.series, videos: v.videos, tasks: t.tasks, credits: c.credits };
}

// ---- 쓰기 (Server Action 에서만 호출) ----

export function addChannel(channel: Channel): Promise<void> {
  return mutateJson<ChannelsFile, void>(channelsFile(), { version: 1, channels: [] }, (f) => {
    if (f.channels.some((c) => c.id === channel.id)) throw new Error("DUPLICATE");
    f.channels.push(channel);
  });
}

export function updateVideo(channelId: string, videoId: string, fn: (v: Video) => void): Promise<boolean> {
  return mutateJson<VideosFile, boolean>(chFile(channelId, "videos.json"), { version: 1, videos: [] }, (f) => {
    const v = f.videos.find((x) => x.id === videoId);
    if (!v) return false;
    fn(v);
    v.updatedAt = new Date().toISOString();
    return true;
  });
}

export function updateTask(channelId: string, taskId: string, fn: (t: Task) => void): Promise<boolean> {
  return mutateJson<TasksFile, boolean>(chFile(channelId, "tasks.json"), { version: 1, tasks: [] }, (f) => {
    const t = f.tasks.find((x) => x.id === taskId);
    if (!t) return false;
    fn(t);
    t.updatedAt = new Date().toISOString();
    return true;
  });
}

// 새 채널: 빈 데이터 파일과(있으면) 로고를 만든다. channels.json 등록 전에 호출한다.
export function initChannelFiles(id: string, logo?: { name: string; bytes: Uint8Array }): Promise<void> {
  return serialize(async () => {
    const empty: Record<string, unknown> = {
      "series.json": { version: 1, series: [] },
      "videos.json": { version: 1, videos: [] },
      "plans.json": { version: 1, weeks: [] },
      "tasks.json": { version: 1, tasks: [] },
      "credits.json": { version: 1, credits: [] },
    };
    for (const [name, value] of Object.entries(empty)) {
      const file = chFile(id, name);
      if ((await readJson<unknown>(file, null)) === null) await writeJsonNow(file, value);
    }
    if (logo) await writeNow(chFile(id, logo.name), logo.bytes);
  });
}

export async function readChannelLogo(id: string): Promise<{ bytes: Buffer; type: string } | null> {
  const ch = await getChannel(id);
  if (!ch?.logo || !/^logo\.(png|jpg|webp)$/.test(ch.logo)) return null;
  const { readFile } = await import("node:fs/promises");
  try {
    const bytes = await readFile(chFile(id, ch.logo));
    const ext = ch.logo.split(".")[1];
    return { bytes, type: ext === "jpg" ? "image/jpeg" : `image/${ext}` };
  } catch {
    return null;
  }
}
