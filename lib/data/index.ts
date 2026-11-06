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

// 통합 보드용: 채널 목록과 모든 채널의 데이터를 한 번의 읽기로 가져온다.
export async function getAllChannelData(): Promise<{ channels: Channel[]; data: Record<string, ChannelData> }> {
  const channels = await listChannels();
  const paths = channels.flatMap((c) => [PATHS.series(c.id), PATHS.videos(c.id), PATHS.tasks(c.id), PATHS.credits(c.id)]);
  const { files } = await readFiles(paths);
  const data: Record<string, ChannelData> = {};
  for (const c of channels) {
    const p = { s: PATHS.series(c.id), v: PATHS.videos(c.id), t: PATHS.tasks(c.id), cr: PATHS.credits(c.id) };
    data[c.id] = {
      series: parse("series", files[p.s], p.s).series,
      videos: parse("videos", files[p.v], p.v).videos,
      tasks: parse("tasks", files[p.t], p.t).tasks,
      credits: parse("credits", files[p.cr], p.cr).credits,
    };
  }
  return { channels, data };
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

// 새 영상. 같은 id 가 있으면 "DUPLICATE" 예외.
export async function addVideo(channelId: string, video: Video): Promise<void> {
  const path = PATHS.videos(channelId);
  await mutate([path], (files) => {
    const f = parse("videos", files[path], path);
    if (f.videos.some((v) => v.id === video.id)) throw new Error("DUPLICATE");
    f.videos.push(video);
    return { changes: { [path]: serialize("videos", f, path) }, message: `영상: ${channelId}/${video.id} 추가`, result: {} };
  });
}

// 새 시리즈. 같은 id 가 있으면 "DUPLICATE" 예외.
export async function addSeries(channelId: string, series: Series): Promise<void> {
  const path = PATHS.series(channelId);
  await mutate([path], (files) => {
    const f = parse("series", files[path], path);
    if (f.series.some((s) => s.id === series.id)) throw new Error("DUPLICATE");
    f.series.push(series);
    return { changes: { [path]: serialize("series", f, path) }, message: `시리즈: ${channelId}/${series.id} 추가`, result: {} };
  });
}

export async function addTask(channelId: string, task: Task): Promise<void> {
  const path = PATHS.tasks(channelId);
  await mutate([path], (files) => {
    const f = parse("tasks", files[path], path);
    f.tasks.push(task);
    return { changes: { [path]: serialize("tasks", f, path) }, message: `확인 대기: ${channelId} "${task.text}" 추가`, result: {} };
  });
}

// 크레딧 기록은 서비스별 최신 값만 두므로 목록을 통째로 바꾼다.
export async function setCredits(channelId: string, credits: Credit[]): Promise<void> {
  const path = PATHS.credits(channelId);
  await mutate([path], (files) => {
    const f = parse("credits", files[path], path);
    f.credits = credits;
    return { changes: { [path]: serialize("credits", f, path) }, message: `크레딧: ${channelId} 기록`, result: {} };
  });
}

// 채널 설정 저장. id 는 바꾸지 않는다. 로고를 새로 올리면 같은 커밋에 쓴다.
export async function updateChannel(
  channelId: string,
  fn: (c: Channel) => void,
  logo?: { name: string; bytes: Uint8Array },
): Promise<boolean> {
  const r = await mutate([PATHS.channels], (files) => {
    const f = parse("channels", files[PATHS.channels], PATHS.channels);
    const c = f.channels.find((x) => x.id === channelId);
    if (!c) return { changes: {}, message: "", result: { ok: false } };
    fn(c);
    c.id = channelId;
    c.updatedAt = new Date().toISOString();
    const changes: Record<string, string | Uint8Array> = { [PATHS.channels]: serialize("channels", f, PATHS.channels) };
    if (logo) changes[PATHS.channelFile(channelId, logo.name)] = logo.bytes;
    return { changes, message: `채널: ${channelId} 설정 수정`, result: { ok: true } };
  });
  return r.ok;
}

export async function readChannelLogo(id: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const ch = await getChannel(id);
  if (!ch?.logo || !/^logo\.(png|jpg|webp)$/.test(ch.logo)) return null;
  const bytes = await readBytes(PATHS.channelFile(id, ch.logo));
  if (!bytes) return null;
  const ext = ch.logo.split(".")[1];
  return { bytes, type: ext === "jpg" ? "image/jpeg" : `image/${ext}` };
}
