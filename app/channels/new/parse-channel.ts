import "server-only";
import { CHANNEL_COLORS, DEFAULT_GATES, type Channel } from "@/lib/types";

// 채널 등록·설정 폼의 공통 입력 해석. 핸들·id 는 등록에서만 다룬다.

export type ChannelFormState = { error?: string; field?: "name" | "handle" | "logo" | "format" };

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

type Fields = Pick<Channel, "name" | "color" | "url" | "niche" | "cadence" | "uploadTime" | "steps" | "gates">;

export async function parseChannelForm(
  fd: FormData,
): Promise<{ error: ChannelFormState } | { fields: Fields; logo?: { name: string; bytes: Uint8Array } }> {
  const name = str(fd, "name");
  if (!name || name.length > 40) return { error: { error: "채널 이름을 1~40자로 입력하세요.", field: "name" } };

  const shortsOn = fd.get("short_on") === "on";
  const longOn = fd.get("long_on") === "on";
  if (!shortsOn && !longOn) return { error: { error: "쇼츠나 롱폼 중 하나 이상 고르세요.", field: "format" } };

  let logo: { name: string; bytes: Uint8Array } | undefined;
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) {
    const ext = LOGO_TYPES[file.type];
    if (!ext) return { error: { error: "로고는 PNG·JPG·WEBP만 올릴 수 있습니다.", field: "logo" } };
    if (file.size > MAX_LOGO) return { error: { error: "로고는 2MB 이하로 올려주세요.", field: "logo" } };
    logo = { name: `logo.${ext}`, bytes: new Uint8Array(await file.arrayBuffer()) };
  }

  const url = str(fd, "url");
  const uploadTime = /^\d{2}:\d{2}$/.test(str(fd, "uploadTime")) ? str(fd, "uploadTime") : undefined;
  return {
    logo,
    fields: {
      name,
      color: CHANNEL_COLORS.some((c) => c.hex === str(fd, "color")) ? str(fd, "color") : CHANNEL_COLORS[0].hex,
      url: url && /^https?:\/\//.test(url) ? url : undefined,
      niche: str(fd, "niche") ? str(fd, "niche").slice(0, 60) : undefined,
      cadence: { shortsPerWeek: shortsOn ? count(fd, "short_n") : 0, longPerWeek: longOn ? count(fd, "long_n") : 0 },
      uploadTime,
      steps: {
        short: shortsOn ? parseSteps(str(fd, "steps_short")) : [],
        long: longOn ? parseSteps(str(fd, "steps_long")) : [],
      },
      gates: fd.getAll("gate").map(String).filter((g) => DEFAULT_GATES.includes(g)),
    },
  };
}
