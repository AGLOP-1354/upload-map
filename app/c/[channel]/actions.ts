"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth";
import { getChannel, updateTask, updateVideo } from "@/lib/data";
import { STEP_STATES } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// 진행표 칸: 대기 → 일부 → 완료 → 대기 순환
export async function cycleStep(formData: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(formData, "channel"));
  if (!channel) return;
  const step = str(formData, "step");
  await updateVideo(channel.id, str(formData, "video"), (v) => {
    if (!channel.steps[v.format].includes(step)) return;
    const cur = v.steps[step] ?? "wait";
    if (cur === "skip") return;
    v.steps[step] = STEP_STATES[(STEP_STATES.indexOf(cur) + 1) % STEP_STATES.length];
  });
  refresh();
}

export async function toggleChecklist(formData: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(formData, "channel"));
  if (!channel) return;
  const index = Number(str(formData, "index"));
  await updateVideo(channel.id, str(formData, "video"), (v) => {
    const item = v.checklist?.[index];
    if (item) item.done = !item.done;
  });
  refresh();
}

export async function toggleTask(formData: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(formData, "channel"));
  if (!channel) return;
  await updateTask(channel.id, str(formData, "task"), (t) => {
    t.done = !t.done;
  });
  refresh();
}
