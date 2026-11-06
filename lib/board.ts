// 통합 단계 보드 계산(순수 함수, 클라이언트에서도 쓴다). 날짜는 lib/dashboard.ts 와 같이 KST YYYY-MM-DD.
import { addDays, daysBetween, isPublished, stepState, stepsFor, videoDay } from "@/lib/dashboard";
import type { Channel, StepState, Task, Video, VideoStatus } from "@/lib/types";

export const STATUS_LABEL: Record<VideoStatus, string> = {
  idea: "아이디어",
  research: "자료조사",
  scripting: "대본",
  packaging: "제목·썸네일",
  filming: "촬영",
  editing: "편집",
  ready: "작업 완료",
  scheduled: "예약됨",
  published: "게시됨",
  reviewed: "회고 완료",
  dropped: "보류",
};

// 보드 열 6개. statuses[0] 이 카드를 이 열로 옮길 때 쓰는 상태다. 보류(dropped)는 어느 열에도 없다.
export const BOARD_COLUMNS = [
  { key: "idea", label: "아이디어", glyph: "○", statuses: ["idea"], hint: "한 줄 아이디어. 소재를 잡고 준비에 들어가면 다음 열로 옮기세요." },
  { key: "prep", label: "준비 중", glyph: "◔", statuses: ["research", "scripting", "packaging", "filming"], hint: "자료조사·대본·제목/썸네일·촬영 단계의 영상이 모입니다." },
  { key: "editing", label: "편집", glyph: "◑", statuses: ["editing"], hint: "편집 중인 영상. 마지막 세부 단계만 남으면 작업 완료로 자동 이동합니다." },
  { key: "ready", label: "작업 완료", glyph: "◕", statuses: ["ready"], hint: "렌더 끝, 업로드만 남은 영상. 유튜브에서 예약한 뒤 예약됨으로 옮기세요." },
  { key: "scheduled", label: "예약됨", glyph: "◷", statuses: ["scheduled"], hint: "유튜브 예약을 마친 영상. 공개되면 게시됨으로 옮기세요." },
  { key: "published", label: "게시됨", glyph: "●", statuses: ["published", "reviewed"], hint: "공개된 영상. 48시간·7일 지표를 기록하세요." },
] as const satisfies readonly { key: string; label: string; glyph: string; statuses: readonly VideoStatus[]; hint: string }[];

export type ColumnKey = (typeof BOARD_COLUMNS)[number]["key"];

// 열 배지 색. 색만으로 구분하지 않도록 glyph·이름과 함께 쓴다.
export const COLUMN_STYLE: Record<ColumnKey, { badge: string; bar: string }> = {
  idea: { badge: "border-line-strong bg-[#26241f] text-fg-2", bar: "bg-line-strong" },
  prep: { badge: "border-[#2d4560] bg-[#172230] text-[#a9c6e0]", bar: "bg-[#4f7aa3]" },
  editing: { badge: "border-[#5a5226] bg-[#2e2a12] text-accent-2", bar: "bg-accent" },
  ready: { badge: "border-[#5a3a22] bg-[#2c1d12] text-[#e8b48a]", bar: "bg-[#c4834f]" },
  scheduled: { badge: "border-[#44345a] bg-[#221a2c] text-[#c9b0e6]", bar: "bg-[#8f72b5]" },
  published: { badge: "border-[#2f5236] bg-[#16261a] text-[#9fd1a4]", bar: "bg-[#6fa877]" },
};

export function columnOf(status: VideoStatus): ColumnKey | undefined {
  return BOARD_COLUMNS.find((c) => (c.statuses as readonly VideoStatus[]).includes(status))?.key;
}

export interface BoardItem {
  key: string; // "<채널id>/<영상id>" — 영상 id 는 채널 안에서만 유일하다
  channel: Channel;
  video: Video;
  column: ColumnKey;
  seriesTitle?: string;
  steps: { name: string; state: StepState }[]; // 이 영상에 해당하는 세부 단계
  done: number;
  nextStep?: string; // 첫 번째로 완료되지 않은 세부 단계
  day?: string; // 게시일 또는 목표일
  dday?: number; // 오늘 기준 남은 날
  risk: boolean;
  needsMetrics: boolean;
  gates: Task[]; // 이 영상에 연결된 미완료 확인 대기
}

// 편집 ↔ 작업 완료 자동 이동: 마지막 세부 단계(업로드)만 남으면 ready, 앞 단계가 다시 풀리면 editing.
// Server Action(cycleStep)과 보드의 낙관적 갱신이 같이 쓴다. v 를 직접 바꾼다.
export function syncReady(channel: Channel, v: Video): void {
  const steps = channel.steps[v.format].filter((s) => v.steps[s] !== "skip");
  if (steps.length < 2) return;
  const restDone = steps.slice(0, -1).every((s) => v.steps[s] === "done");
  if (v.status === "editing" && restDone && v.steps[steps.at(-1)!] !== "done") v.status = "ready";
  else if (v.status === "ready" && !restDone) v.status = "editing";
}

export const RISK_DAYS = 5;
const AFTER_DONE: VideoStatus[] = ["ready", "scheduled", "published", "reviewed", "dropped"];

export function boardItem(channel: Channel, video: Video, today: string, seriesTitle: string | undefined, tasks: Task[]): BoardItem {
  const steps = stepsFor(channel, video).map((name) => ({ name, state: stepState(video, name) }));
  const done = steps.filter((s) => s.state === "done").length;
  const day = videoDay(video);
  const dday = day ? daysBetween(today, day) : undefined;
  const open = !AFTER_DONE.includes(video.status) && !isPublished(video);
  // 일정 위험: 아직 작업 중인데 예정일이 지났거나, RISK_DAYS 안에 올라가야 하는데 세부 단계를 하나도 못 끝낸 영상
  const risk = open && dday !== undefined && (dday < 0 || (dday <= RISK_DAYS && done === 0));
  return {
    key: `${channel.id}/${video.id}`,
    channel,
    video,
    column: columnOf(video.status) ?? "idea",
    seriesTitle,
    steps,
    done,
    nextStep: steps.find((s) => s.state !== "done")?.name,
    day,
    dday,
    risk,
    needsMetrics: isPublished(video) && video.metrics.length === 0,
    gates: tasks.filter((t) => !t.done && t.videoId === video.id),
  };
}

// 이번 주(월~일, KST)
export function weekRange(today: string): [string, string] {
  const [y, m, d] = today.split("-").map(Number);
  const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 월=0
  const start = addDays(today, -wd);
  return [start, addDays(start, 6)];
}

export function ddayLabel(n: number): string {
  return n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`;
}
