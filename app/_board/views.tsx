"use client";

import Link from "next/link";
import { useState } from "react";
import { ChannelAvatar } from "@/components/channel-avatar";
import { PlusIcon } from "@/components/icons";
import { dayLabel, kstDate } from "@/lib/dashboard";
import type { Channel, Task } from "@/lib/types";
import { createSeries, createTask, saveCredits } from "./actions";
import type { AllData } from "./board";

const field =
  "h-9 w-full rounded-md border border-line-strong bg-ink px-2.5 text-[13px] text-fg outline-none focus-visible:outline-2 focus-visible:outline-accent";
const submit = "h-9 rounded-md bg-accent px-4 text-[13px] font-bold text-accent-ink hover:bg-accent-2";
const card = "rounded-[10px] border border-line bg-bar";

// 확인 대기: 모든 채널의 미완료 할 일. 영상에 연결된 것은 눌러서 drawer 로 연다.
export function GatesView({
  channels,
  data,
  tasks,
  onOpen,
  onToggle,
}: {
  channels: Channel[];
  data: AllData;
  tasks: { channel: Channel; task: Task }[];
  onOpen: (key: string) => void;
  onToggle: (channelId: string, taskId: string) => void;
}) {
  const [chId, setChId] = useState(channels[0].id);
  const videos = (data[chId]?.videos ?? []).filter((v) => v.status !== "dropped");
  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <ul className={`${card} flex flex-col`}>
        {tasks.length === 0 && <li className="px-4 py-6 text-[13px] text-muted">확인할 일이 없습니다.</li>}
        {tasks.map(({ channel, task }) => {
          const video = task.videoId ? data[channel.id]?.videos.find((v) => v.id === task.videoId) : undefined;
          return (
            <li key={`${channel.id}/${task.id}`} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: channel.color }} aria-hidden />
              <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                <span className="text-sm">{task.text}</span>
                <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                  <span>{channel.name}</span>
                  {task.detail && <span>· {task.detail}</span>}
                  {video && (
                    <button type="button" onClick={() => onOpen(`${channel.id}/${video.id}`)} className="text-accent-2 hover:underline">
                      · {video.workingTitle} 열기
                    </button>
                  )}
                </span>
              </span>
              <button type="button" onClick={() => onToggle(channel.id, task.id)} className="h-8 flex-none rounded-md border border-line-strong px-3 text-xs text-fg-2 hover:bg-raised">
                확인함
              </button>
            </li>
          );
        })}
      </ul>

      <form action={createTask} className={`${card} flex flex-col gap-2.5 p-4`}>
        <h2 className="text-sm font-bold">확인할 일 추가</h2>
        <div className="grid gap-2.5 sm:grid-cols-[160px_minmax(0,1fr)]">
          <label className="flex flex-col gap-1 text-xs text-fg-2">
            채널
            <select name="channel" value={chId} onChange={(e) => setChId(e.target.value)} className={field}>
              {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-fg-2">
            할 일 <span className="sr-only">(필수)</span>
            <input name="text" required maxLength={80} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-fg-2">
            연결 영상
            <select key={chId} name="videoId" className={field}>
              <option value="">없음</option>
              {videos.map((v) => <option key={v.id} value={v.id}>{v.workingTitle}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-fg-2">
            설명 <span className="text-muted">(선택)</span>
            <input name="detail" maxLength={120} className={field} />
          </label>
        </div>
        <button type="submit" className={`${submit} self-start`}>추가</button>
      </form>
    </div>
  );
}

// 채널별 설정 링크 · 시리즈 · 크레딧 기록
export function ManageView({ channels, data }: { channels: Channel[]; data: AllData }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
      {channels.map((c) => {
        const d = data[c.id];
        const credits = d?.credits ?? [];
        const latest = credits.reduce((a, x) => (x.recordedAt > a ? x.recordedAt : a), "");
        return (
          <section key={c.id} aria-label={c.name} className={`${card} flex flex-col gap-4 p-4`}>
            <div className="flex items-center gap-2.5">
              <ChannelAvatar channel={c} size={32} label />
              <span className="flex flex-auto flex-col">
                <span className="font-bold">{c.name}</span>
                <span className="text-xs text-muted">@{c.handle}{c.niche ? ` · ${c.niche}` : ""}</span>
              </span>
              <Link href={`/c/${c.id}/settings`} className="inline-flex h-8 items-center rounded-md border border-line-strong px-3 text-[13px] text-fg no-underline hover:bg-raised">
                채널 설정
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-medium text-fg-2">시리즈</h3>
              {(d?.series ?? []).length === 0 && <p className="text-[13px] text-muted">없음</p>}
              <ul className="flex flex-col gap-1 text-[13px]">
                {(d?.series ?? []).map((s) => (
                  <li key={s.id} className="flex gap-2">
                    <span className="flex-auto">{s.title}</span>
                    <span className="font-mono text-xs text-muted">{d.videos.filter((v) => v.seriesId === s.id && v.status !== "dropped").length}편</span>
                  </li>
                ))}
              </ul>
              <form action={createSeries} className="flex gap-2">
                <input type="hidden" name="channel" value={c.id} />
                <input name="title" required maxLength={40} placeholder="새 시리즈 제목" aria-label={`${c.name} 새 시리즈 제목`} className={field} />
                <button type="submit" className="inline-flex h-9 flex-none items-center gap-1 rounded-md border border-line-strong px-3 text-[13px] text-fg-2 hover:bg-raised">
                  <PlusIcon className="size-3" />추가
                </button>
              </form>
            </div>

            <form action={saveCredits} className="flex flex-col gap-2">
              <input type="hidden" name="channel" value={c.id} />
              <h3 className="flex items-baseline gap-2 text-[13px] font-medium text-fg-2">
                크레딧 · 수동 기록
                {latest && <span className="text-xs font-normal text-muted">{dayLabel(kstDate(new Date(latest)))} 기준</span>}
              </h3>
              {[...credits, { service: "", recordedAt: "" } as (typeof credits)[number]].map((cr, i) => (
                <div key={`${cr.service}-${i}`} className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                  <input name="service" defaultValue={cr.service} placeholder={cr.service ? undefined : "새 서비스"} aria-label={`${c.name} ${i + 1}번 서비스 이름`} maxLength={30} className={field} />
                  <input name="amount" inputMode="numeric" defaultValue={cr.amount} placeholder="기록 없음" aria-label={`${cr.service || "새 서비스"} 남은 양`} className={`${field} font-mono`} />
                  <input type="hidden" name="note" value={cr.note ?? ""} />
                </div>
              ))}
              <span className="text-xs text-muted">이름을 지우면 그 줄은 빠집니다 · 오늘 날짜로 기록</span>
              <button type="submit" className={`${submit} self-start`}>저장</button>
            </form>
          </section>
        );
      })}
      <Link href="/channels/new" className="flex min-h-24 items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong text-[13px] text-fg-2 no-underline hover:bg-bar">
        <PlusIcon className="size-4" />새 채널 등록
      </Link>
    </div>
  );
}
