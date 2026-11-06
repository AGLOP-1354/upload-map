"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth";
import { kstDate } from "@/lib/dashboard";
import {
  addSeries,
  addTask,
  addVideo,
  getChannel,
  getChannelData,
  setCredits,
  updateTask,
  updateVideo,
} from "@/lib/data";
import { setStatus } from "@/lib/data/videos";
import { syncReady } from "@/lib/board";
import { STEP_STATES, VIDEO_STATUSES, type ChecklistItem, type Credit, type StepState, type Video, type VideoStatus } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const text = (fd: FormData, k: string) => str(fd, k).replace(/\r\n/g, "\n").trim();
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// 값이 비면 키를 지워 JSON 을 깔끔하게 둔다.
function setOpt<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | undefined | "") {
  if (value === undefined || value === "") delete obj[key];
  else obj[key] = value;
}

// 영문 제목이면 slug, 아니면 접두어 + 순번. 이미 쓰는 id 와 겹치지 않게 한다.
function makeId(title: string, prefix: string, used: Set<string>): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const base = slug || prefix;
  if (slug && !used.has(base)) return base;
  for (let n = 1; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

// saved = 저장된 영상 id (편집 패널이 저장 뒤 보기로 돌아갈 때 쓴다)
export type FormState = { error?: string; field?: string; saved?: string };

// 세부 단계: to 가 있으면 그 상태로, 없으면 대기 → 일부 → 완료 → 대기 순환
export async function cycleStep(formData: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(formData, "channel"));
  if (!channel) return;
  const step = str(formData, "step");
  const to = str(formData, "to") as StepState;
  await updateVideo(channel.id, str(formData, "video"), (v) => {
    if (!channel.steps[v.format].includes(step)) return;
    const cur = v.steps[step] ?? "wait";
    if (cur === "skip") return;
    v.steps[step] = STEP_STATES.includes(to) ? to : STEP_STATES[(STEP_STATES.indexOf(cur) + 1) % STEP_STATES.length];
    syncReady(channel, v);
  });
  refresh();
}

// 보드 열 이동·drawer 단계 선택. 보류는 사유가 필요하므로 dropVideo 로만.
export async function setVideoStatus(formData: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(formData, "channel"));
  const status = str(formData, "status") as VideoStatus;
  if (!channel || !VIDEO_STATUSES.includes(status) || status === "dropped") return;
  await setStatus(channel.id, str(formData, "video"), status);
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

// ---- 영상 추가·편집 (오른쪽 패널) ----

export async function saveVideo(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const channel = await getChannel(str(fd, "channel"));
  if (!channel) return { error: "채널을 찾을 수 없습니다." };
  const existingId = str(fd, "video");
  const data = await getChannelData(channel.id);

  const workingTitle = text(fd, "workingTitle");
  if (!workingTitle || workingTitle.length > 60) return { error: "작업 제목을 1~60자로 입력하세요.", field: "workingTitle" };
  const format = str(fd, "format") === "long" ? "long" : "short";
  const seriesId = str(fd, "seriesId");
  if (seriesId && !data.series.some((s) => s.id === seriesId)) return { error: "없는 시리즈입니다.", field: "seriesId" };
  const epRaw = str(fd, "episode").trim();
  const episode = epRaw === "" ? undefined : Number(epRaw);
  if (episode !== undefined && (!Number.isInteger(episode) || episode < 0 || episode > 999)) {
    return { error: "화수는 0~999 사이 정수로 입력하세요.", field: "episode" };
  }
  const date = str(fd, "targetPublishDate");
  if (date && !DATE.test(date)) return { error: "게시 예정일 형식이 올바르지 않습니다.", field: "targetPublishDate" };
  const status = str(fd, "status") as VideoStatus;
  if (!VIDEO_STATUSES.includes(status) || status === "dropped") return { error: "제작 단계를 고르세요.", field: "status" };
  const youtubeId = str(fd, "youtubeId").trim();
  if (youtubeId && !/^[A-Za-z0-9_-]{6,20}$/.test(youtubeId)) return { error: "유튜브 영상 ID 형식이 올바르지 않습니다.", field: "youtubeId" };

  const skip = new Set(fd.getAll("skip").map(String).filter((s) => channel.steps[format].includes(s)));
  let checklist: ChecklistItem[] = [];
  try {
    const raw = JSON.parse(str(fd, "checklist") || "[]") as unknown;
    if (Array.isArray(raw)) {
      checklist = raw
        .map((c) => ({ text: String(c?.text ?? "").trim().slice(0, 200), path: String(c?.path ?? "").trim().slice(0, 300), done: c?.done === true }))
        .filter((c) => c.text)
        .slice(0, 50)
        .map((c) => (c.path ? c : { text: c.text, done: c.done }));
    }
  } catch {
    return { error: "체크리스트를 읽지 못했습니다.", field: "checklist" };
  }
  const copy = Object.fromEntries(
    (["overlay", "coldOpen", "recap", "endCard"] as const).map((k) => [k, text(fd, k)]).filter(([, v]) => v),
  ) as Video["copy"];

  const apply = (v: Video) => {
    v.workingTitle = workingTitle;
    v.format = format;
    v.status = status;
    setOpt(v, "seriesId", seriesId);
    setOpt(v, "episode", episode);
    setOpt(v, "targetPublishDate", date);
    setOpt(v, "youtubeId", youtubeId);
    setOpt(v, "notes", text(fd, "notes"));
    if (status === "published" && !v.publishedAt) v.publishedAt = new Date().toISOString();
    for (const s of channel.steps[format]) {
      if (skip.has(s)) v.steps[s] = "skip";
      else if (v.steps[s] === "skip") delete v.steps[s];
    }
    setOpt(v, "copy", copy && Object.keys(copy).length ? copy : undefined);
    setOpt(v, "checklist", checklist.length ? checklist : undefined);
  };

  let id = existingId;
  if (existingId) {
    if (!(await updateVideo(channel.id, existingId, apply))) return { error: "영상을 찾을 수 없습니다. 새로고침해 주세요." };
  } else {
    const wanted = str(fd, "id").trim();
    if (wanted && !SLUG.test(wanted)) return { error: "id 는 영문 소문자·숫자·- 만 쓸 수 있습니다.", field: "id" };
    const used = new Set(data.videos.map((v) => v.id));
    id = wanted || (seriesId && episode !== undefined && !used.has(`${seriesId}-ep${episode}`) ? `${seriesId}-ep${episode}` : makeId(workingTitle, "video", used));
    const now = new Date().toISOString();
    const video: Video = { id, workingTitle, format, status, steps: {}, metrics: [], createdAt: now, updatedAt: now };
    apply(video);
    try {
      await addVideo(channel.id, video);
    } catch (e) {
      if (e instanceof Error && e.message === "DUPLICATE") return { error: `id '${id}' 가 이미 있습니다.`, field: "id" };
      throw e;
    }
  }
  refresh();
  return { saved: id };
}

// 영상은 지우지 않고 보류(dropped)로 내린다. 사유는 notes 에 날짜와 함께 남긴다.
export async function dropVideo(fd: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(fd, "channel"));
  const reason = text(fd, "reason");
  if (!channel || !reason) return;
  await updateVideo(channel.id, str(fd, "video"), (v) => {
    const note = `[${kstDate()} ${v.status}→dropped] ${reason}`;
    v.status = "dropped";
    v.notes = v.notes ? `${v.notes}\n${note}` : note;
  });
  refresh();
}

// ---- 작은 폼 ----

export async function createSeries(fd: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(fd, "channel"));
  const title = text(fd, "title").slice(0, 40);
  if (!channel || !title) return;
  const { series } = await getChannelData(channel.id);
  const id = makeId(title, "series", new Set(series.map((s) => s.id)));
  const now = new Date().toISOString();
  const description = text(fd, "description").slice(0, 200);
  await addSeries(channel.id, { id, title, ...(description ? { description } : {}), createdAt: now, updatedAt: now });
  refresh();
}

export async function createTask(fd: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(fd, "channel"));
  const body = text(fd, "text").slice(0, 80);
  if (!channel || !body) return;
  const detail = text(fd, "detail").slice(0, 120);
  const videoId = str(fd, "videoId");
  const { videos } = await getChannelData(channel.id);
  const now = new Date().toISOString();
  await addTask(channel.id, {
    id: `task-${Date.now().toString(36)}`,
    text: body,
    ...(detail ? { detail } : {}),
    ...(videoId && videos.some((v) => v.id === videoId) ? { videoId } : {}),
    done: false,
    createdAt: now,
    updatedAt: now,
  });
  refresh();
}

// 서비스별 남은 양을 한 번에 기록. 서비스 이름을 비우면 그 줄은 빠진다.
export async function saveCredits(fd: FormData): Promise<void> {
  await requireSession();
  const channel = await getChannel(str(fd, "channel"));
  if (!channel) return;
  const { credits: old } = await getChannelData(channel.id);
  const services = fd.getAll("service").map((s) => String(s).trim().slice(0, 30));
  const amounts = fd.getAll("amount").map(String);
  const notes = fd.getAll("note").map((s) => String(s).trim().slice(0, 60));
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const credits: Credit[] = [];
  services.forEach((service, i) => {
    if (!service || seen.has(service)) return;
    seen.add(service);
    const n = Number(amounts[i]?.replace(/,/g, ""));
    const unit = old.find((c) => c.service === service)?.unit;
    credits.push({
      service,
      ...(amounts[i]?.trim() && Number.isFinite(n) && n >= 0 ? { amount: n } : {}),
      ...(unit ? { unit } : {}),
      ...(notes[i] ? { note: notes[i] } : {}),
      recordedAt: now,
    });
  });
  await setCredits(channel.id, credits);
  refresh();
}
