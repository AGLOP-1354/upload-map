"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useOptimistic, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import { ChannelAvatar } from "@/components/channel-avatar";
import { LockIcon, PlusIcon } from "@/components/icons";
import { BOARD_COLUMNS, boardItem, columnOf, syncReady, weekRange, type BoardItem, type ColumnKey } from "@/lib/board";
import { FORMAT_LABEL } from "@/lib/dashboard";
import type { Channel, StepState, Task, Video, VideoStatus } from "@/lib/types";
import { cycleStep, setVideoStatus, toggleChecklist, toggleTask } from "./actions";
import { CardView, StageBadge } from "./card";
import { Drawer } from "./drawer";
import { GatesView, ManageView } from "./views";

// lib/data 의 ChannelData 와 같은 모양(서버 전용 모듈이라 여기서 다시 적는다)
export interface ChannelData {
  series: { id: string; title: string; description?: string; createdAt: string; updatedAt: string }[];
  videos: Video[];
  tasks: Task[];
  credits: { service: string; amount?: number; unit?: string; note?: string; recordedAt: string }[];
}
export type AllData = Record<string, ChannelData>;

// 사이드바 보기. board 는 단계 보드, gates·manage 는 다른 화면.
const VIEWS = [
  { key: "all", label: "모든 작업" },
  { key: "week", label: "이번 주 업로드" },
  { key: "risk", label: "일정 위험" },
  { key: "metrics", label: "지표 기록 필요" },
  { key: "gates", label: "확인 대기" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"] | "manage";

// 낙관적 갱신: 서버 응답 전에 보드에 바로 반영한다. 실패하면 refresh 된 서버 값으로 돌아간다.
export type Opt =
  | { kind: "status"; channel: string; video: string; status: VideoStatus }
  | { kind: "step"; channel: string; video: string; step: string; to?: StepState }
  | { kind: "check"; channel: string; video: string; index: number }
  | { kind: "task"; channel: string; task: string };

const CYCLE: StepState[] = ["wait", "part", "done"];

function applyOpt(channels: Channel[], data: AllData, o: Opt): AllData {
  const d = data[o.channel];
  if (!d) return data;
  if (o.kind === "task") {
    return { ...data, [o.channel]: { ...d, tasks: d.tasks.map((t) => (t.id === o.task ? { ...t, done: !t.done } : t)) } };
  }
  const channel = channels.find((c) => c.id === o.channel)!;
  const videos = d.videos.map((src) => {
    if (src.id !== o.video) return src;
    const v: Video = { ...src, steps: { ...src.steps }, checklist: src.checklist?.map((c) => ({ ...c })) };
    if (o.kind === "status") v.status = o.status;
    if (o.kind === "step") {
      const cur = v.steps[o.step] ?? "wait";
      if (cur !== "skip") v.steps[o.step] = o.to ?? CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      syncReady(channel, v);
    }
    if (o.kind === "check" && v.checklist?.[o.index]) v.checklist[o.index].done = !v.checklist[o.index].done;
    return v;
  });
  return { ...data, [o.channel]: { ...d, videos } };
}

function fd(fields: Record<string, string | number>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, String(v));
  return f;
}

export function Board({ channels, data, today, now }: { channels: Channel[]; data: AllData; today: string; now: string }) {
  const sp = useSearchParams();
  const [shown, addOpt] = useOptimistic(data, (d: AllData, o: Opt) => applyOpt(channels, d, o));
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ---- 주소 쿼리 = 화면 상태 ----
  const view = (VIEWS.some((v) => v.key === sp.get("view")) || sp.get("view") === "manage" ? sp.get("view") : "all") as ViewKey;
  const chSel = (sp.get("ch") ?? "").split(",").filter((id) => channels.some((c) => c.id === id));
  const fmt = sp.get("fmt") === "short" || sp.get("fmt") === "long" ? (sp.get("fmt") as "short" | "long") : undefined;
  const ser = sp.get("ser") ?? "";
  const q = sp.get("q") ?? "";
  const itemKey = sp.get("item") ?? "";
  const editing = sp.get("edit") === "1";
  const newFor = sp.get("new") ?? "";

  const setParams = (patch: Record<string, string | undefined>, mode: "push" | "replace" = "push") => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", s ? `?${s}` : "/");
  };

  // ---- 보드 항목 ----
  const all = (() => {
    const out: BoardItem[] = [];
    for (const c of channels) {
      const d = shown[c.id];
      if (!d) continue;
      for (const v of d.videos) {
        if (v.status === "dropped") continue;
        out.push(boardItem(c, v, today, d.series.find((s) => s.id === v.seriesId)?.title, d.tasks));
      }
    }
    return out.sort(
      (a, b) =>
        (a.day ?? "9999").localeCompare(b.day ?? "9999") ||
        (a.video.episode ?? 999) - (b.video.episode ?? 999) ||
        a.video.workingTitle.localeCompare(b.video.workingTitle),
    );
  })();

  const [wStart, wEnd] = weekRange(today);
  const viewTest: Record<"all" | "week" | "risk" | "metrics", (i: BoardItem) => boolean> = {
    all: () => true,
    week: (i) => Boolean(i.day && i.day >= wStart && i.day <= wEnd),
    risk: (i) => i.risk,
    metrics: (i) => i.needsMetrics,
  };
  const inChannels = (i: BoardItem) => !chSel.length || chSel.includes(i.channel.id);
  const scoped = all.filter(inChannels);
  const needle = q.trim().toLowerCase();
  const boardView = view in viewTest ? (view as keyof typeof viewTest) : "all";
  const items = scoped.filter(
    (i) =>
      viewTest[boardView](i) &&
      (!fmt || i.video.format === fmt) &&
      (!ser || `${i.channel.id}/${i.video.seriesId}` === ser) &&
      (!needle ||
        [i.video.workingTitle, i.seriesTitle, i.video.package?.selectedTitle].some((t) => t?.toLowerCase().includes(needle))),
  );
  const ordered = BOARD_COLUMNS.flatMap((col) => items.filter((i) => i.column === col.key));
  const openTasks = channels.flatMap((c) => (chSel.length && !chSel.includes(c.id) ? [] : (shown[c.id]?.tasks ?? []).filter((t) => !t.done).map((t) => ({ channel: c, task: t }))));
  const counts: Record<ViewKey, number> = {
    all: scoped.length,
    week: scoped.filter(viewTest.week).length,
    risk: scoped.filter(viewTest.risk).length,
    metrics: scoped.filter(viewTest.metrics).length,
    gates: openTasks.length,
    manage: 0,
  };
  const filtersOn = Boolean(fmt || ser || q);

  // drawer 대상은 거른 목록 밖에 있어도 연다(링크로 들어온 경우). 이전/다음은 거른 목록 안에서.
  const current = all.find((i) => i.key === itemKey);
  const idx = ordered.findIndex((i) => i.key === itemKey);
  const drawerOpen = Boolean(current || newFor);

  const open = (key: string) => setParams({ item: key, edit: undefined, new: undefined });
  const close = () => {
    const key = itemKey;
    setParams({ item: undefined, edit: undefined, new: undefined });
    // 닫으면 연 카드로 포커스를 돌려준다.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${CSS.escape(key)}"]`)?.focus());
  };
  const step = (dir: 1 | -1) => {
    if (!ordered.length) return;
    const next = ordered[idx < 0 ? 0 : (idx + dir + ordered.length) % ordered.length];
    setParams({ item: next.key, edit: undefined }, "replace");
  };

  // ---- 키보드: Esc 닫기, j/k 이전·다음, ⌘K 또는 / 검색 ----
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const typing = el.closest("input, textarea, select, [contenteditable=true]");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (typing) return;
    if (e.key === "/") {
      e.preventDefault();
      searchRef.current?.focus();
    } else if (e.key === "Escape" && drawerOpen && !editing) close();
    else if (current && !editing && (e.key === "j" || e.key === "k")) step(e.key === "j" ? 1 : -1);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ---- 변경 (낙관적 반영 → Server Action) ----
  const run = (o: Opt, action: (f: FormData) => Promise<void>, fields: Record<string, string | number>) =>
    startTransition(async () => {
      addOpt(o);
      await action(fd(fields));
    });
  const act = {
    status: (i: BoardItem, status: VideoStatus) =>
      run({ kind: "status", channel: i.channel.id, video: i.video.id, status }, setVideoStatus, { channel: i.channel.id, video: i.video.id, status }),
    step: (i: BoardItem, name: string, to?: StepState) =>
      run({ kind: "step", channel: i.channel.id, video: i.video.id, step: name, to }, cycleStep, { channel: i.channel.id, video: i.video.id, step: name, to: to ?? "" }),
    check: (i: BoardItem, index: number) =>
      run({ kind: "check", channel: i.channel.id, video: i.video.id, index }, toggleChecklist, { channel: i.channel.id, video: i.video.id, index }),
    task: (channelId: string, taskId: string) =>
      run({ kind: "task", channel: channelId, task: taskId }, toggleTask, { channel: channelId, task: taskId }),
  };
  const moveTo = (key: string, col: ColumnKey) => {
    const i = all.find((x) => x.key === key);
    const target = BOARD_COLUMNS.find((c) => c.key === col);
    if (!i || !target || columnOf(i.video.status) === col) return;
    act.status(i, target.statuses[0]);
  };

  const viewTitle = view === "manage" ? "채널 · 크레딧" : VIEWS.find((v) => v.key === view)!.label;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="flex min-h-[53px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bar px-4 py-2 sm:px-5">
        <Link href="/" className="flex items-center gap-2 text-fg no-underline">
          <LockIcon className="size-5 text-accent" />
          <span className="font-serif text-[17px] font-extrabold tracking-tight">업로드맵</span>
        </Link>
        <label className="flex h-9 min-w-0 flex-[0_1_360px] items-center gap-2 rounded-lg border border-line bg-ink px-3 text-muted focus-within:border-accent">
          <span className="sr-only">영상 검색</span>
          <svg viewBox="0 0 24 24" className="size-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setParams({ q: e.target.value || undefined }, "replace")}
            placeholder="영상 제목·시리즈 검색"
            className="min-w-0 flex-auto bg-transparent text-[13px] text-fg outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line-strong px-1.5 font-mono text-[11px]">⌘K</kbd>
        </label>
        <div className="flex-auto" />
        <span className="font-mono text-xs text-muted">{now}</span>
        <button
          type="button"
          onClick={() => setParams({ new: chSel[0] ?? channels[0].id, item: undefined, edit: undefined })}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-bold text-accent-ink hover:bg-accent-2"
        >
          <PlusIcon className="size-3.5" />새 영상
        </button>
      </header>

      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <Sidebar
          channels={channels}
          data={shown}
          view={view}
          counts={counts}
          chSel={chSel}
          onView={(v) => setParams({ view: v === "all" ? undefined : v })}
          onChannel={(id) => setParams({ ch: id, ser: undefined })}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-auto px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-xl font-bold">{viewTitle}</h1>
            {chSel.length ? (
              channels
                .filter((c) => chSel.includes(c.id))
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setParams({ ch: chSel.filter((id) => id !== c.id).join(",") || undefined, ser: undefined })}
                    aria-label={`${c.name} 필터 해제 · 모든 채널 보기`}
                    className="inline-flex h-7 items-center gap-1.5 self-center rounded-full border border-accent bg-accent-wash pr-2.5 pl-1 text-[13px] text-accent-2 hover:bg-raised"
                  >
                    <ChannelAvatar channel={c} size={20} />
                    {c.name}
                    <span aria-hidden>✕</span>
                  </button>
                ))
            ) : (
              <span className="text-[13px] text-muted">모든 채널 통합</span>
            )}
          </div>

          {view === "gates" ? (
            <GatesView channels={channels} data={shown} tasks={openTasks} onOpen={open} onToggle={act.task} />
          ) : view === "manage" ? (
            <ManageView channels={channels.filter((c) => !chSel.length || chSel.includes(c.id))} data={shown} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label="형식" className="flex gap-0.5 rounded-full border border-line-strong p-0.5">
                  {([undefined, "short", "long"] as const).map((f) => (
                    <button
                      key={f ?? "all"}
                      type="button"
                      aria-pressed={fmt === f}
                      onClick={() => setParams({ fmt: f })}
                      className={`h-7 rounded-full px-3 text-[13px] ${fmt === f ? "bg-accent-wash text-accent-2" : "text-fg-2 hover:text-fg"}`}
                    >
                      {f ? FORMAT_LABEL[f] : "전체 형식"}
                    </button>
                  ))}
                </div>
                <label className="flex h-8 items-center gap-2 rounded-full border border-line-strong px-3 text-[13px] text-fg-2 has-[option:checked:not([value=''])]:border-accent">
                  <span>시리즈</span>
                  <select value={ser} onChange={(e) => setParams({ ser: e.target.value || undefined })} className="max-w-[180px] bg-transparent text-fg outline-none">
                    <option value="">전체</option>
                    {channels
                      .filter((c) => !chSel.length || chSel.includes(c.id))
                      .map((c) => (
                        <optgroup key={c.id} label={c.name}>
                          {(shown[c.id]?.series ?? []).map((s) => (
                            <option key={s.id} value={`${c.id}/${s.id}`}>{s.title}</option>
                          ))}
                        </optgroup>
                      ))}
                  </select>
                </label>
                <div className="flex-auto" />
                <span className="text-xs text-muted" aria-live="polite">
                  {items.length}개{filtersOn ? ` / ${counts[view]}개 중` : ""}
                </span>
                {filtersOn && (
                  <button type="button" onClick={() => setParams({ fmt: undefined, ser: undefined, q: undefined })} className="h-8 rounded-lg border border-line-strong px-3 text-[13px] text-fg-2 hover:bg-raised">
                    필터 초기화
                  </button>
                )}
              </div>

              <div className="flex min-h-0 flex-1 gap-2.5 overflow-x-auto pb-2">
                {BOARD_COLUMNS.map((col) => {
                  const cards = items.filter((i) => i.column === col.key);
                  return (
                    <section
                      key={col.key}
                      aria-label={`${col.label} ${cards.length}개`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(col.key);
                      }}
                      onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        moveTo(e.dataTransfer.getData("text/plain"), col.key);
                      }}
                      className={`flex w-[248px] flex-none flex-col gap-2 rounded-[10px] border bg-bar p-2 ${drawerOpen ? "lg:w-[200px]" : "lg:w-auto lg:min-w-[176px] lg:flex-1"} ${dragOver === col.key ? "border-accent" : "border-line"}`}
                    >
                      <div className="flex flex-col gap-1 border-b border-raised px-1 pb-2">
                        <div className="flex items-center gap-2">
                          <StageBadge col={col.key} />
                          <span className="font-mono text-xs text-fg-2">{cards.length}</span>
                        </div>
                      </div>
                      {cards.map((i) => (
                        <CardView key={i.key} item={i} compact={drawerOpen} selected={i.key === itemKey} onOpen={() => open(i.key)} />
                      ))}
                      {cards.length === 0 && (
                        <p className="rounded-lg border border-dashed border-line-strong px-3 py-3.5 text-xs leading-relaxed break-keep text-muted">
                          {filtersOn || view !== "all" ? "조건에 맞는 영상이 없습니다." : col.hint}
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </main>

        {drawerOpen && (
          <Drawer
            key={newFor ? `new-${newFor}` : `${itemKey}-${editing}`}
            item={current}
            newFor={newFor}
            channels={channels}
            data={shown}
            editing={editing}
            position={idx >= 0 ? `${idx + 1} / ${ordered.length}` : undefined}
            today={today}
            onClose={close}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onEdit={(on) => setParams({ edit: on ? "1" : undefined }, "replace")}
            onNewChannel={(id) => setParams({ new: id }, "replace")}
            onSaved={(key) => setParams({ item: key, edit: undefined, new: undefined }, "replace")}
            act={act}
          />
        )}
      </div>
    </div>
  );
}

function Sidebar({
  channels,
  data,
  view,
  counts,
  chSel,
  onView,
  onChannel,
}: {
  channels: Channel[];
  data: AllData;
  view: ViewKey;
  counts: Record<ViewKey, number>;
  chSel: string[];
  onView: (v: ViewKey) => void;
  onChannel: (id: string | undefined) => void;
}) {
  const item = "flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px]";
  const total = channels.reduce((n, c) => n + (data[c.id]?.videos ?? []).filter((v) => v.status !== "dropped").length, 0);
  return (
    <nav aria-label="보기와 채널" className="flex flex-none flex-col gap-0.5 border-line bg-bar p-3 max-lg:border-b lg:w-[232px] lg:overflow-y-auto lg:border-r">
      <div className="px-2.5 pt-1 pb-1 text-[11px] tracking-wider text-muted">보기</div>
      {VIEWS.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-current={view === v.key ? "page" : undefined}
          onClick={() => onView(v.key)}
          className={`${item} ${view === v.key ? "bg-raised text-fg" : "text-fg-2 hover:bg-panel hover:text-fg"}`}
        >
          <span className="flex-auto">{v.label}</span>
          <span className={`font-mono text-xs ${v.key === "risk" && counts.risk ? "text-danger-2" : v.key === "gates" && counts.gates ? "text-accent-2" : "text-muted"}`}>
            {counts[v.key]}
          </span>
        </button>
      ))}

      <div className="px-2.5 pt-4 pb-1 text-[11px] tracking-wider text-muted">채널</div>
      <button
        type="button"
        aria-pressed={chSel.length === 0}
        onClick={() => onChannel(undefined)}
        className={`${item} ${chSel.length === 0 ? "bg-raised text-fg" : "text-fg-2 hover:bg-panel hover:text-fg"}`}
      >
        <span aria-hidden className="flex size-5 flex-none items-center justify-center rounded-full border border-line-strong text-muted">
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
            <path d="m12 3 9 5-9 5-9-5 9-5z" />
            <path d="m3 13 9 5 9-5" />
          </svg>
        </span>
        <span className="flex-auto">모든 채널</span>
        <span className="font-mono text-xs text-muted">{total}</span>
      </button>
      {channels.map((c) => {
        const on = chSel.includes(c.id);
        const n = (data[c.id]?.videos ?? []).filter((v) => v.status !== "dropped").length;
        return (
          <div key={c.id} className={`group flex items-center rounded-md ${on ? "bg-raised" : "hover:bg-panel"}`}>
            <button type="button" aria-pressed={on} onClick={() => onChannel(c.id)} className={`${item} ${on ? "text-fg" : "text-fg-2 hover:text-fg"}`}>
              <ChannelAvatar channel={c} size={20} />
              <span className="flex-auto truncate">{c.name}</span>
              <span className="font-mono text-xs text-muted">{n}</span>
            </button>
          </div>
        );
      })}
      <Link href="/channels/new" className={`${item} text-muted no-underline hover:bg-panel hover:text-fg`}>
        <PlusIcon className="size-3.5" />채널 추가
      </Link>

      <div className="flex-auto" />
      <div className="mt-4 flex flex-col gap-0.5 border-t border-line pt-3">
        <button
          type="button"
          aria-current={view === "manage" ? "page" : undefined}
          onClick={() => onView("manage")}
          className={`${item} ${view === "manage" ? "bg-raised text-fg" : "text-fg-2 hover:bg-panel hover:text-fg"}`}
        >
          채널 설정 · 시리즈 · 크레딧
        </button>
        <form action={logout}>
          <button type="submit" className={`${item} text-muted hover:bg-panel hover:text-fg`}>로그아웃</button>
        </form>
      </div>
    </nav>
  );
}
