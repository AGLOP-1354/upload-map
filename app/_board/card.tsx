"use client";

import { ChannelAvatar } from "@/components/channel-avatar";
import { BOARD_COLUMNS, COLUMN_STYLE, ddayLabel, type BoardItem, type ColumnKey } from "@/lib/board";
import { FORMAT_LABEL } from "@/lib/dashboard";
import type { StepState } from "@/lib/types";

export const SEG: Record<StepState, string> = { done: "bg-[#6fa877]", part: "bg-accent", wait: "bg-line-strong", skip: "bg-transparent" };

export function StageBadge({ col, size = "md" }: { col: ColumnKey; size?: "sm" | "md" }) {
  const c = BOARD_COLUMNS.find((x) => x.key === col)!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[5px] border font-medium whitespace-nowrap ${size === "sm" ? "h-5 px-1.5 text-[11px]" : "h-6 px-2 text-xs"} ${COLUMN_STYLE[col].badge}`}>
      <span aria-hidden>{c.glyph}</span>
      {c.label}
    </span>
  );
}

export function StepBar({ item, className = "h-[5px]" }: { item: BoardItem; className?: string }) {
  return (
    <span className="flex flex-auto gap-0.5" role="img" aria-label={`세부 단계 ${item.done}/${item.steps.length} 완료`}>
      {item.steps.map((s) => (
        <span key={s.name} title={`${s.name}: ${s.state === "done" ? "완료" : s.state === "part" ? "일부" : "대기"}`} className={`flex-1 rounded-sm ${className} ${SEG[s.state]}`} />
      ))}
    </span>
  );
}

export function dateTone(item: BoardItem): string {
  if (item.risk) return "font-medium text-danger-2";
  if (item.dday !== undefined && item.dday >= 0 && item.dday <= 1 && item.column !== "published") return "text-accent-2";
  return "text-muted";
}

export function dateText(item: BoardItem): string {
  if (!item.day) return "날짜 미정";
  const [, m, d] = item.day.split("-");
  if (item.column === "published") return `${m}/${d} 게시`;
  return `${m}/${d} ${item.dday !== undefined ? ddayLabel(item.dday) : ""}`;
}

// "2화" 처럼 짧은 작업 제목은 시리즈 이름을 붙여야 어떤 영상인지 알 수 있다.
export function shortTitle(item: BoardItem): string {
  const t = item.video.workingTitle;
  return item.seriesTitle && t.length <= 8 && !t.includes(item.seriesTitle) ? `${item.seriesTitle} ${t}` : t;
}

export function CardView({ item, compact, selected, onOpen }: { item: BoardItem; compact: boolean; selected: boolean; onOpen: () => void }) {
  const v = item.video;
  const sub = [item.seriesTitle, v.episode !== undefined ? `${v.episode}화` : undefined].filter(Boolean).join(" ");
  const next =
    item.column === "published"
      ? item.needsMetrics
        ? "지표 기록 필요"
        : "지표 기록됨"
      : item.nextStep
        ? `다음: ${item.nextStep}${item.steps.find((s) => s.name === item.nextStep)?.state === "part" ? " (일부)" : ""}`
        : "세부 단계 완료";
  return (
    <button
      type="button"
      data-card={item.key}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.key);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full flex-col gap-2 rounded-lg border bg-panel text-left text-fg hover:border-line-strong hover:bg-raised ${compact ? "p-2.5" : "p-3"} ${selected ? "border-accent bg-raised shadow-[0_0_0_1px_var(--color-accent)]" : item.risk ? "border-[#5a2a20]" : "border-line"}`}
    >
      {!compact && (
        <span className="flex w-full items-center gap-1.5 text-xs text-fg-2">
          {/* 채널은 로고로 구분한다(대체 텍스트 = 채널 이름). 옆에는 더 구체적인 시리즈·화, 없으면 채널 이름. */}
          <span title={item.channel.name} className="flex flex-none"><ChannelAvatar channel={item.channel} size={18} label /></span>
          <span className="truncate">{sub || item.channel.name}</span>
          <span className="flex-auto" />
          <span className={`flex-none whitespace-nowrap ${v.format === "long" ? "font-bold text-fg" : "text-muted"}`}>{FORMAT_LABEL[v.format]}</span>
        </span>
      )}
      <span className="flex items-start gap-1.5">
        {compact && <span title={item.channel.name} className="mt-px flex flex-none"><ChannelAvatar channel={item.channel} size={18} label /></span>}
        <span className="line-clamp-2 text-sm font-medium break-keep">{compact ? shortTitle(item) : v.workingTitle}</span>
      </span>
      <span className="flex w-full items-center gap-2">
        <StepBar item={item} />
        <span className="font-mono text-[11px] text-muted">{item.done}/{item.steps.length}</span>
      </span>
      <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {!compact && <span className="text-muted">{next}</span>}
        <span className="flex-auto" />
        {item.gates.length > 0 && <span className="rounded bg-accent-wash px-1.5 text-[11px] text-accent-2">확인 {item.gates.length}</span>}
        <span className={`font-mono ${dateTone(item)}`}>
          {item.risk && <span aria-hidden>⚠ </span>}
          {dateText(item)}
          {item.risk && <span className="sr-only"> 일정 위험</span>}
        </span>
      </span>
    </button>
  );
}
