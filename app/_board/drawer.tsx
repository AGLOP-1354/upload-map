"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CheckIcon, MonitorIcon, PencilIcon, XIcon } from "@/components/icons";
import { BOARD_COLUMNS, COLUMN_STYLE, STATUS_LABEL, ddayLabel, type BoardItem } from "@/lib/board";
import { FORMAT_LABEL, dayLabel, kstDate } from "@/lib/dashboard";
import { VIDEO_STATUSES, type Channel, type StepState, type VideoStatus } from "@/lib/types";
import type { AllData } from "./board";
import { SEG, shortTitle } from "./card";
import { VideoEditor } from "./video-editor";

export interface Act {
  status: (i: BoardItem, s: VideoStatus) => void;
  step: (i: BoardItem, name: string, to?: StepState) => void;
  check: (i: BoardItem, index: number) => void;
  task: (channelId: string, taskId: string) => void;
}

const STATE_LABEL: Record<StepState, string> = { done: "완료", part: "일부", wait: "대기", skip: "해당 없음" };
const iconBtn = "flex size-8 items-center justify-center rounded-md border border-line-strong bg-panel text-fg-2 hover:bg-raised hover:text-fg disabled:opacity-40";
const h3 = "flex items-center gap-2 text-[13px] font-medium text-fg-2";
const box = "rounded-md border border-line bg-ink px-3 py-2.5 text-[13px]";

// 목록을 가리지 않는 오른쪽 상세 패널(side peek). 좁은 화면에서는 전체 화면으로 덮는다.
export function Drawer({
  item,
  newFor,
  channels,
  data,
  editing,
  position,
  today,
  onClose,
  onPrev,
  onNext,
  onEdit,
  onNewChannel,
  onSaved,
  act,
}: {
  item?: BoardItem;
  newFor: string;
  channels: Channel[];
  data: AllData;
  editing: boolean;
  position?: string;
  today: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEdit: (on: boolean) => void;
  onNewChannel: (id: string) => void;
  onSaved: (key: string) => void;
  act: Act;
}) {
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headRef.current?.focus(), []);

  const newChannel = newFor ? channels.find((c) => c.id === newFor) ?? channels[0] : undefined;
  const editChannel = newChannel ?? item?.channel;
  const editorProps = editChannel && {
    channelId: editChannel.id,
    steps: editChannel.steps,
    series: (data[editChannel.id]?.series ?? []).map(({ id, title }) => ({ id, title })),
    defaults: { format: editChannel.cadence.shortsPerWeek > 0 || editChannel.cadence.longPerWeek === 0 ? ("short" as const) : ("long" as const) },
    onSaved: (id: string) => onSaved(`${editChannel.id}/${id}`),
    onDropped: onClose,
  };

  return (
    <aside
      aria-labelledby="drawer-h"
      className="flex flex-col border-line-strong bg-panel shadow-[-12px_0_24px_rgba(0,0,0,0.35)] max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:overflow-y-auto lg:w-[480px] lg:flex-none lg:overflow-y-auto lg:border-l"
    >
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-line bg-panel px-4 py-2.5">
        {item && !editing && (
          <>
            <button type="button" onClick={onPrev} disabled={!position} aria-label="이전 영상 (k)" className={iconBtn}>↑</button>
            <button type="button" onClick={onNext} disabled={!position} aria-label="다음 영상 (j)" className={iconBtn}>↓</button>
            {position && <span className="ml-1 font-mono text-xs text-muted">{position}</span>}
          </>
        )}
        <div className="flex-auto" />
        {item && !editing && (
          <button type="button" onClick={() => onEdit(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] text-fg hover:bg-raised">
            <PencilIcon className="size-3.5" />편집
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="닫기 (Esc)" className={iconBtn}>
          <XIcon className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        {newChannel && editorProps ? (
          <>
            <h2 ref={headRef} tabIndex={-1} id="drawer-h" className="text-xl font-bold outline-none">새 영상</h2>
            {channels.length > 1 && (
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-[13px] text-fg-2">채널</legend>
                <div className="flex flex-wrap gap-1.5">
                  {channels.map((c) => (
                    <label key={c.id} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] has-[:checked]:border-accent has-[:checked]:bg-accent-wash has-[:checked]:text-accent-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                      <input type="radio" name="new-channel" checked={c.id === newChannel.id} onChange={() => onNewChannel(c.id)} className="sr-only" />
                      <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                      {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <VideoEditor key={newChannel.id} {...editorProps} onClose={onClose} />
          </>
        ) : item && editing && editorProps ? (
          <>
            <span ref={headRef} tabIndex={-1} id="drawer-h" className="sr-only">{shortTitle(item)} 편집</span>
            <VideoEditor {...editorProps} video={item.video} onClose={() => onEdit(false)} />
          </>
        ) : item ? (
          <Detail item={item} today={today} act={act} headRef={headRef} />
        ) : null}
      </div>
    </aside>
  );
}

function Detail({ item, today, act, headRef }: { item: BoardItem; today: string; act: Act; headRef: React.RefObject<HTMLHeadingElement | null> }) {
  const v = item.video;
  const ch = item.channel;
  const list = v.checklist ?? [];
  const copy = v.copy ?? {};
  const colIdx = BOARD_COLUMNS.findIndex((c) => c.key === item.column);
  const next = item.steps.find((s) => s.name === item.nextStep);
  const metric = v.metrics.at(-1);
  const capcut = item.column !== "published" && item.steps.some((s) => /캡컷|조립/.test(s.name) && s.state !== "done");

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ background: ch.color }} aria-hidden />
          {ch.name}
          {item.seriesTitle && <> › {item.seriesTitle}{v.episode !== undefined && ` ${v.episode}화`}</>}
          <span>· {FORMAT_LABEL[v.format]}</span>
        </span>
        <h2 ref={headRef} tabIndex={-1} id="drawer-h" className="text-[22px] font-bold break-keep outline-none">{shortTitle(item)}</h2>
      </div>

      <nav aria-label="제작 단계">
        <ol className="grid grid-cols-6 gap-1">
          {BOARD_COLUMNS.map((c, i) => {
            const cur = c.key === item.column;
            return (
              <li key={c.key} className="flex flex-col gap-1.5">
                <span className={`h-1.5 rounded-full ${i <= colIdx ? COLUMN_STYLE[c.key].bar : "bg-raised"} ${cur ? "outline-1 outline-offset-2 outline-accent" : ""}`} />
                <button
                  type="button"
                  aria-current={cur ? "step" : undefined}
                  onClick={() => !cur && act.status(item, c.statuses[0])}
                  className={`text-left text-xs whitespace-nowrap ${cur ? "font-bold text-fg" : i < colIdx ? "text-fg-2 hover:text-fg" : "text-muted hover:text-fg"}`}
                >
                  {c.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {item.risk && (
        <div role="status" className="flex gap-2.5 rounded-md border border-[#5a2a20] bg-danger-wash px-3 py-2.5 text-[13px] text-danger-2">
          <span aria-hidden>⚠</span>
          <span>
            {item.dday !== undefined && item.dday < 0
              ? `예정일이 ${-item.dday}일 지났습니다. 날짜를 다시 잡거나 보류하세요.`
              : `업로드까지 ${item.dday}일인데 세부 단계 ${item.steps.length}개 중 완료한 것이 없습니다.`}
          </span>
        </div>
      )}

      {item.column === "ready" ? (
        <NextBox title="업로드만 남았습니다" sub="유튜브 스튜디오에서 예약한 뒤 옮기세요.">
          <button type="button" onClick={() => act.status(item, "scheduled")} className="h-9 rounded-md bg-accent px-3.5 text-[13px] font-bold text-accent-ink hover:bg-accent-2">예약됨으로</button>
        </NextBox>
      ) : item.column === "scheduled" ? (
        <NextBox title="예약 완료" sub="공개되면 게시됨으로 옮기세요.">
          <button type="button" onClick={() => act.status(item, "published")} className="h-9 rounded-md bg-accent px-3.5 text-[13px] font-bold text-accent-ink hover:bg-accent-2">게시됨으로</button>
        </NextBox>
      ) : item.column === "published" ? (
        item.needsMetrics && <NextBox title="지표 기록 필요" sub="유튜브 스튜디오 수치를 Claude에게 붙여넣으면 48시간·7일 스냅샷으로 기록합니다." />
      ) : next ? (
        <NextBox title={`다음: ${next.name}${next.state === "part" ? " (일부 진행)" : ""}`} sub={item.dday !== undefined && item.dday >= 0 ? `업로드 ${ddayLabel(item.dday)}` : undefined}>
          <button type="button" onClick={() => act.step(item, next.name, "done")} className="h-9 rounded-md bg-accent px-3.5 text-[13px] font-bold whitespace-nowrap text-accent-ink hover:bg-accent-2">완료로 표시</button>
        </NextBox>
      ) : null}

      <dl className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-[13px]">
        <dt className="text-muted">업로드</dt>
        <dd>
          {item.day ? (
            <>
              <span className="font-mono">{dayLabel(item.day)}{!v.publishedAt && ch.uploadTime ? ` ${ch.uploadTime}` : ""}</span>
              {item.dday !== undefined && item.column !== "published" && (
                <span className={`ml-2 font-mono ${item.risk ? "font-medium text-danger-2" : item.dday <= 1 ? "text-accent-2" : "text-muted"}`}>{ddayLabel(item.dday)}</span>
              )}
              {v.publishedAt && <span className="ml-2 text-muted">게시됨</span>}
            </>
          ) : (
            <span className="text-muted">미정 · 편집에서 날짜를 정하세요</span>
          )}
        </dd>
        <dt className="text-muted"><label htmlFor="dr-status">상태</label></dt>
        <dd>
          <select
            id="dr-status"
            value={v.status}
            onChange={(e) => act.status(item, e.target.value as VideoStatus)}
            className="h-8 rounded-md border border-line-strong bg-ink px-2 text-[13px] text-fg"
          >
            {VIDEO_STATUSES.filter((s) => s !== "dropped").map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </dd>
        {v.youtubeId && (
          <>
            <dt className="text-muted">유튜브</dt>
            <dd>
              <a href={`https://youtube.com/${v.format === "short" ? "shorts/" : "watch?v="}${v.youtubeId}`} target="_blank" rel="noreferrer">유튜브에서 보기</a>
            </dd>
          </>
        )}
      </dl>

      {item.steps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className={h3}>
            세부 단계 <span className="font-mono text-muted">{item.done} / {item.steps.length}</span>
            <span className="flex-auto" />
            <span className="text-[11px] font-normal text-muted">눌러서 대기 → 일부 → 완료</span>
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-1.5">
            {item.steps.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => act.step(item, s.name)}
                aria-label={`${s.name}: ${STATE_LABEL[s.state]}. 눌러서 다음 상태로`}
                className={`flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[13px] ${s.state === "done" ? "border-[#2f5236] bg-[#16261a] text-[#9fd1a4]" : s.state === "part" ? "border-[#5a5226] bg-[#2e2a12] text-accent-2" : "border-dashed border-[#4a453a] text-fg-2 hover:bg-raised"}`}
              >
                <span aria-hidden className={`size-2 rounded-sm ${SEG[s.state]}`} />
                <span className="truncate">{s.name}</span>
                <span className="flex-auto" />
                <span className="text-[11px] opacity-80">{STATE_LABEL[s.state]}</span>
              </button>
            ))}
          </div>
          {capcut && (
            <span className="flex items-center gap-1.5 text-xs text-accent-2">
              <MonitorIcon className="size-3.5" />조립은 캡컷이 있는 Mac에서만 가능
            </span>
          )}
        </section>
      )}

      {item.gates.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className={h3}>확인 대기</h3>
          {item.gates.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 rounded-md border border-[#5a5226] bg-accent-wash px-3 py-2 text-[13px]">
              <span className="flex flex-auto flex-col">
                <span>{t.text}</span>
                {t.detail && <span className="text-xs text-muted">{t.detail}</span>}
              </span>
              <button type="button" onClick={() => act.task(ch.id, t.id)} className="h-8 flex-none rounded-md border border-line-strong bg-panel px-2.5 text-xs text-fg-2 hover:bg-raised">확인함</button>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-1">
        <h3 className={h3}>체크리스트 <span className="font-mono text-muted">{list.filter((c) => c.done).length} / {list.length}</span></h3>
        {list.length === 0 && <p className="text-[13px] text-muted">항목이 없습니다. 편집에서 추가하세요.</p>}
        <ul className="flex flex-col">
          {list.map((c, i) => (
            <li key={i}>
              <button type="button" role="checkbox" aria-checked={c.done} onClick={() => act.check(item, i)} className="flex min-h-10 w-full items-start gap-2.5 border-b border-raised py-2 text-left">
                <span className={`mt-0.5 flex size-[18px] flex-none items-center justify-center rounded border ${c.done ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-ink"}`}>
                  {c.done && <CheckIcon className="size-3" />}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`text-[13px] ${c.done ? "text-faint line-through" : "text-fg"}`}>{c.text}</span>
                  {c.path && <span className="font-mono text-[11px] break-all text-muted">{c.path}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {(copy.overlay || copy.coldOpen || copy.recap || copy.endCard) && (
        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>확정 카피</h3>
          {([
            ["오버레이", copy.overlay],
            ["콜드오픈", copy.coldOpen],
            ["지난 이야기", copy.recap],
            ["엔드카드", copy.endCard],
          ] as const).map(([label, text]) =>
            text ? (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[11px] text-muted">{label}</span>
                <p className={`${box} leading-relaxed whitespace-pre-line`}>{text}</p>
              </div>
            ) : null,
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className={h3}>약속 일치 · 훅 / 제목 / 썸네일</h3>
        {v.promise && <p className={box}><span className="mr-2 text-[11px] text-muted">시청자 약속</span>{v.promise}</p>}
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ["훅", v.hook ? `${v.hook.text}${v.hook.score !== undefined ? ` (${v.hook.score}점)` : ""}` : undefined],
            ["제목", v.package?.selectedTitle ?? (v.package?.titles.length ? `후보 ${v.package.titles.length}개` : undefined)],
            ["썸네일 문구", v.package?.thumbnailText],
          ] as const).map(([label, text]) => (
            <div key={label} className={`${box} flex flex-col gap-1 ${text ? "" : "border-dashed"}`}>
              <span className="text-[11px] text-muted">{label}</span>
              <span className={`break-keep ${text ? "" : "text-muted"}`}>{text ?? "없음"}</span>
            </div>
          ))}
        </div>
      </section>

      {item.column === "published" && (
        <section className="flex flex-col gap-2">
          <h3 className={h3}>지표</h3>
          {metric ? (
            <div className={`${box} grid grid-cols-3 gap-2`}>
              <span className="col-span-3 text-[11px] text-muted">{metric.daysSincePublish}일차 · {kstDate(new Date(metric.capturedAt))} 기록</span>
              {([
                ["조회수", metric.views?.toLocaleString("ko-KR")],
                ["CTR", metric.ctr !== undefined ? `${metric.ctr}%` : undefined],
                ["30초 잔존", metric.retention30s !== undefined ? `${metric.retention30s}%` : undefined],
                ["평균 시청", metric.avdSeconds !== undefined ? `${metric.avdSeconds}초` : undefined],
                ["시청 비율", metric.avgPercentViewed !== undefined ? `${metric.avgPercentViewed}%` : undefined],
                ["구독 증가", metric.subsGained?.toLocaleString("ko-KR")],
              ] as const).map(([label, val]) => (
                <span key={label} className="flex flex-col">
                  <span className="text-[11px] text-muted">{label}</span>
                  <span className="font-mono">{val ?? "—"}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted">아직 기록된 지표가 없습니다.</p>
          )}
        </section>
      )}

      {v.notes && (
        <section className="flex flex-col gap-2">
          <h3 className={h3}>메모</h3>
          <p className={`${box} whitespace-pre-line`}>{v.notes}</p>
        </section>
      )}

      <p className="border-t border-line pt-3 text-xs text-muted">
        수정 {kstDate(new Date(v.updatedAt)) === today ? "오늘" : dayLabel(kstDate(new Date(v.updatedAt)))} · Esc 닫기 · j/k 이동 ·{" "}
        <Link href={`/c/${ch.id}/settings`}>채널 설정</Link>
      </p>
    </>
  );
}

function NextBox({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#5a5226] bg-accent-wash px-3.5 py-3">
      <span className="flex flex-auto flex-col gap-0.5">
        <span className="text-[13px] font-medium text-accent-2">{title}</span>
        {sub && <span className="text-xs text-fg-2">{sub}</span>}
      </span>
      {children}
    </div>
  );
}
