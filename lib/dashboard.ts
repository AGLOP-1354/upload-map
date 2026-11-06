// 대시보드 계산(순수 함수). 날짜는 모두 Asia/Seoul 기준 YYYY-MM-DD 문자열로 다룬다.
import type { Channel, StepState, Video } from "@/lib/types";

const TZ = "Asia/Seoul";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function kstDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function kstNowLabel(d: Date = new Date()): string {
  const day = kstDate(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return `${dayLabel(day)} ${time} KST`;
}

// "2026-11-07" → "11.07 토"
export function dayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} ${WEEKDAYS[wd]}`;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 864e5);
}

// 게시일(KST). 게시됐으면 publishedAt, 아니면 목표일.
export function videoDay(v: Video): string | undefined {
  return v.publishedAt ? kstDate(new Date(v.publishedAt)) : v.targetPublishDate;
}

export function isPublished(v: Video): boolean {
  return Boolean(v.publishedAt) || v.status === "published" || v.status === "reviewed";
}

// 이 영상에 적용되는 단계(템플릿에서 "skip" 표시한 것 제외)
export function stepsFor(channel: Channel, v: Video): string[] {
  return (channel.steps[v.format] ?? []).filter((s) => v.steps?.[s] !== "skip");
}

export function stepState(v: Video, step: string): StepState {
  return v.steps?.[step] ?? "wait";
}

export const FORMAT_LABEL = { short: "쇼츠", long: "롱폼" } as const;
