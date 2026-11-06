"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { addChannel, initChannelFiles, listChannels } from "@/lib/data";
import type { Channel } from "@/lib/types";
import { parseChannelForm, type ChannelFormState } from "./parse-channel";

export type CreateChannelState = ChannelFormState;

export async function createChannel(_prev: CreateChannelState, fd: FormData): Promise<CreateChannelState> {
  await requireSession();

  const handle = String(fd.get("handle") ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(handle)) {
    return { error: "핸들은 영문·숫자·. _ - 로 3~30자여야 합니다.", field: "handle" };
  }
  const id = handle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) return { error: "핸들로 폴더 이름을 만들 수 없습니다.", field: "handle" };
  if ((await listChannels()).some((c) => c.id === id)) {
    return { error: `이미 등록된 채널입니다 (data/${id}/).`, field: "handle" };
  }

  const parsed = await parseChannelForm(fd);
  if ("error" in parsed) return parsed.error;
  const { fields, logo } = parsed;
  const now = new Date().toISOString();

  const channel: Channel = {
    id,
    name: fields.name,
    handle,
    color: fields.color,
    ...(logo ? { logo: logo.name } : {}),
    ...(fields.url ? { url: fields.url } : {}),
    ...(fields.niche ? { niche: fields.niche } : {}),
    cadence: fields.cadence,
    ...(fields.uploadTime ? { uploadTime: fields.uploadTime } : {}),
    steps: fields.steps,
    gates: fields.gates,
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
