"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { addChannel, initChannelFiles, listChannels } from "@/lib/data";
import { CHANNEL_COLORS, DEFAULT_GATES, type Channel } from "@/lib/types";

export type CreateChannelState = { error?: string; field?: "name" | "handle" | "logo" | "format" };

const LOGO_TYPES: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_LOGO = 2 * 1024 * 1024;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const count = (fd: FormData, k: string) => Math.max(0, Math.min(14, Math.trunc(Number(fd.get(k)) || 0)));

function parseSteps(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map((s) => String(s).trim()).filter((s) => s && s.length <= 30))].slice(0, 12);
  } catch {
    return [];
  }
}

export async function createChannel(_prev: CreateChannelState, fd: FormData): Promise<CreateChannelState> {
  await requireSession();

  const name = str(fd, "name");
  const handle = str(fd, "handle").replace(/^@/, "");
  if (!name || name.length > 40) return { error: "채널 이름을 1~40자로 입력하세요.", field: "name" };
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(handle)) {
    return { error: "핸들은 영문·숫자·. _ - 로 3~30자여야 합니다.", field: "handle" };
  }
  const id = handle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) return { error: "핸들로 폴더 이름을 만들 수 없습니다.", field: "handle" };
  if ((await listChannels()).some((c) => c.id === id)) {
    return { error: `이미 등록된 채널입니다 (data/${id}/).`, field: "handle" };
  }

  const shortsOn = fd.get("short_on") === "on";
  const longOn = fd.get("long_on") === "on";
  if (!shortsOn && !longOn) return { error: "쇼츠나 롱폼 중 하나 이상 고르세요.", field: "format" };

  let logo: { name: string; bytes: Uint8Array } | undefined;
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) {
    const ext = LOGO_TYPES[file.type];
    if (!ext) return { error: "로고는 PNG·JPG·WEBP만 올릴 수 있습니다.", field: "logo" };
    if (file.size > MAX_LOGO) return { error: "로고는 2MB 이하로 올려주세요.", field: "logo" };
    logo = { name: `logo.${ext}`, bytes: new Uint8Array(await file.arrayBuffer()) };
  }

  const color = CHANNEL_COLORS.some((c) => c.hex === str(fd, "color")) ? str(fd, "color") : CHANNEL_COLORS[0].hex;
  const uploadTime = /^\d{2}:\d{2}$/.test(str(fd, "uploadTime")) ? str(fd, "uploadTime") : undefined;
  const url = str(fd, "url");
  const gates = fd.getAll("gate").map(String).filter((g) => DEFAULT_GATES.includes(g));
  const now = new Date().toISOString();

  const channel: Channel = {
    id,
    name,
    handle,
    color,
    ...(logo ? { logo: logo.name } : {}),
    ...(url && /^https?:\/\//.test(url) ? { url } : {}),
    ...(str(fd, "niche") ? { niche: str(fd, "niche").slice(0, 60) } : {}),
    cadence: { shortsPerWeek: shortsOn ? count(fd, "short_n") : 0, longPerWeek: longOn ? count(fd, "long_n") : 0 },
    ...(uploadTime ? { uploadTime } : {}),
    steps: {
      short: shortsOn ? parseSteps(str(fd, "steps_short")) : [],
      long: longOn ? parseSteps(str(fd, "steps_long")) : [],
    },
    gates,
    createdAt: now,
    updatedAt: now,
  };

  await initChannelFiles(id, logo);
  try {
    await addChannel(channel);
  } catch (e) {
    if (e instanceof Error && e.message === "DUPLICATE") return { error: "이미 등록된 채널입니다.", field: "handle" };
    throw e;
  }
  redirect(`/c/${id}`);
}
