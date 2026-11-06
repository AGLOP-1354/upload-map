"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { updateChannel } from "@/lib/data";
import { parseChannelForm, type ChannelFormState } from "@/app/channels/new/parse-channel";

// 채널 설정 저장. id·핸들은 폴더 이름이라 바꾸지 않는다.
export async function updateChannelSettings(_prev: ChannelFormState, fd: FormData): Promise<ChannelFormState> {
  await requireSession();
  const id = String(fd.get("channel") ?? "");
  const parsed = await parseChannelForm(fd);
  if ("error" in parsed) return parsed.error;
  const { fields, logo } = parsed;

  const ok = await updateChannel(
    id,
    (c) => {
      c.name = fields.name;
      c.color = fields.color;
      c.cadence = fields.cadence;
      c.steps = fields.steps;
      c.gates = fields.gates;
      for (const k of ["url", "niche", "uploadTime"] as const) {
        if (fields[k]) c[k] = fields[k];
        else delete c[k];
      }
      if (logo) c.logo = logo.name;
    },
    logo,
  );
  if (!ok) return { error: "채널을 찾을 수 없습니다." };
  redirect(`/c/${id}`);
}
