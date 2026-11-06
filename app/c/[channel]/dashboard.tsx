import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ChannelAvatar } from "@/components/channel-avatar";
import {
  AlertIcon,
  CheckIcon,
  LandscapeIcon,
  MonitorIcon,
  PencilIcon,
  PlusIcon,
  PortraitIcon,
} from "@/components/icons";
import {
  FORMAT_LABEL,
  addDays,
  columnsFor,
  dayLabel,
  daysBetween,
  isPublished,
  kstDate,
  kstNowLabel,
  nextUpload,
  progress,
  stepState,
  stepsFor,
  thisWeekCounts,
  videoDay,
} from "@/lib/dashboard";
import { getChannelData, listChannels } from "@/lib/data";
import type { Channel, Credit, Format, StepState, Video } from "@/lib/types";
import { createSeries, createTask, cycleStep, saveCredits, toggleChecklist, toggleTask } from "./actions";
import { VideoEditor } from "./video-editor";

// edit = 오른쪽 편집 패널에 열 영상 id, 새 영상은 "new"
type Query = { s?: string; v?: string; fmt?: string; edit?: string };
const SOLO = "_solo";

const card = "rounded-2xl border border-line bg-panel p-5";

export async function Dashboard({
  params,
  searchParams,
}: {
  params: PageProps<"/c/[channel]">["params"];
  searchParams: PageProps<"/c/[channel]">["searchParams"];
}) {
  const { channel: channelId } = await params;
  const sp = await searchParams;
  const q: Query = {
    s: typeof sp.s === "string" ? sp.s : undefined,
    v: typeof sp.v === "string" ? sp.v : undefined,
    fmt: typeof sp.fmt === "string" ? sp.fmt : undefined,
    edit: typeof sp.edit === "string" ? sp.edit : undefined,
  };

  const channels = await listChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) notFound();

  const today = kstDate();
  const allData = await Promise.all(channels.map((c) => getChannelData(c.id)));
  const data = allData[channels.indexOf(channel)];
  const week = channels.map((c, i) => ({ channel: c, counts: thisWeekCounts(allData[i].videos, today), next: nextUpload(allData[i].videos, today) }));
  const headerChannels = week.map(({ channel: c, counts }) => ({
    ...c,
    weekText: `${c.niche ? c.niche + " · " : ""}이번 주 쇼츠 ${counts.short} · 롱폼 ${counts.long}`,
  }));

  const videos = data.videos.filter((v) => v.status !== "dropped");

  // 시리즈 묶음: series.json 순서 + 시리즈 없는 영상은 '단독 영상'
  const groups = [
    ...data.series.map((s) => ({ id: s.id, title: s.title, description: s.description })),
    ...(videos.some((v) => !v.seriesId) ? [{ id: SOLO, title: "단독 영상", description: undefined }] : []),
  ];
  const groupVideos = (id: string) =>
    videos
      .filter((v) => (id === SOLO ? !v.seriesId : v.seriesId === id))
      .sort((a, b) => (a.episode ?? 999) - (b.episode ?? 999) || (videoDay(a) ?? "").localeCompare(videoDay(b) ?? ""));

  const nextAll = nextUpload(videos, today);
  const defaultGroup = groups.find((g) => g.id === (nextAll?.seriesId ?? SOLO)) ?? groups[0];
  const group = groups.find((g) => g.id === q.s) ?? defaultGroup;
  const inGroup = group ? groupVideos(group.id) : [];

  const fmt: "all" | Format = q.fmt === "short" || q.fmt === "long" ? q.fmt : "all";
  const rows = inGroup.filter((v) => fmt === "all" || v.format === fmt);
  const selected =
    inGroup.find((v) => v.id === q.v) ?? (nextAll && inGroup.includes(nextAll) ? nextAll : undefined) ?? rows[0];
  const columns = columnsFor(channel, inGroup);
  const prog = progress(channel, inGroup);
  const formatsInGroup = (["short", "long"] as const).filter((f) => inGroup.some((v) => v.format === f));

  const href = (patch: Query) => {
    const p = new URLSearchParams();
    const next = { s: group?.id, v: selected?.id, fmt: fmt === "all" ? undefined : fmt, ...patch };
    for (const [k, val] of Object.entries(next)) if (val) p.set(k, val);
    const s = p.toString();
    return `/c/${channel.id}${s ? `?${s}` : ""}`;
  };

  const gates = data.tasks.filter((t) => !t.done);

  const editing = q.edit === "new" ? "new" : videos.find((v) => v.id === q.edit);
  const editor = editing && (
    <aside
      aria-labelledby="editor-h"
      className="w-full border-line bg-panel px-4 py-6 max-lg:order-first max-lg:border-b sm:px-6 lg:sticky lg:top-0 lg:max-h-screen lg:max-w-[520px] lg:flex-[1_1_440px] lg:overflow-y-auto lg:border-l"
    >
      <VideoEditor
        key={q.edit}
        channelId={channel.id}
        steps={channel.steps}
        series={data.series.map(({ id, title }) => ({ id, title }))}
        video={editing === "new" ? undefined : editing}
        defaults={{
          seriesId: group && group.id !== SOLO ? group.id : undefined,
          format: channel.cadence.shortsPerWeek > 0 || channel.cadence.longPerWeek === 0 ? "short" : "long",
        }}
        closeHref={href({})}
      />
    </aside>
  );

  return (
    <>
      <AppHeader channels={headerChannels} current={channel} now={kstNowLabel()} />

      <div className={editor ? "flex flex-wrap items-start lg:flex-nowrap" : undefined}>
      <main className={`mx-auto flex w-full max-w-[1200px] min-w-0 flex-col gap-6 px-4 pt-7 pb-12 sm:px-8 ${editor ? "lg:flex-[999_1_640px]" : ""}`}>
        {/* 모든 채널 · 이번 주 */}
        <section aria-labelledby="all-h" className="flex flex-col gap-2.5">
          <h2 id="all-h" className="text-[13px] font-medium text-muted">모든 채널 · 이번 주 업로드</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2.5">
            {week.map(({ channel: c, counts, next }) => {
              const active = c.id === channel.id;
              return (
                <Link
                  key={c.id}
                  href={`/c/${c.id}`}
                  aria-current={active ? "page" : undefined}
                  style={active ? { borderColor: c.color } : undefined}
                  className={`flex min-h-16 items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-fg no-underline ${active ? "bg-raised" : "border-line bg-panel hover:bg-raised"}`}
                >
                  <ChannelAvatar channel={c} size={44} label />
                  <span className="flex flex-auto flex-col gap-0.5">
                    <span className="font-medium">
                      {c.name}
                      {active && <span className="text-xs font-normal text-accent-2"> · 보는 중</span>}
                    </span>
                    <span className="text-xs text-muted">
                      {next ? `다음 ${dayLabel(next.targetPublishDate!)} · ${next.workingTitle} ${FORMAT_LABEL[next.format]}` : "예정된 업로드 없음"}
                    </span>
                  </span>
                  <span className="flex gap-1.5 font-mono text-xs">
                    <span className="rounded-md bg-ink px-2 py-0.5">쇼츠 {counts.short}</span>
                    <span className="rounded-md bg-ink px-2 py-0.5">롱폼 {counts.long}</span>
                  </span>
                </Link>
              );
            })}
            <Link
              href="/channels/new"
              className="flex min-h-16 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#4a453a] px-3.5 text-[13px] text-fg-2 no-underline hover:bg-panel"
            >
              <PlusIcon className="size-4" />새 채널 등록
            </Link>
          </div>
        </section>

        <div className="h-px bg-line" />

        {/* 시리즈 탭 · 시리즈 추가 · 채널 설정 · 영상 추가 */}
        <div className="flex flex-wrap items-center gap-2">
          {groups.length > 1 && (
            <nav aria-label="시리즈" className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <Link
                  key={g.id}
                  href={href({ s: g.id, v: undefined })}
                  aria-current={g.id === group?.id ? "true" : undefined}
                  className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs no-underline ${g.id === group?.id ? "bg-raised text-fg" : "text-muted hover:text-fg"}`}
                >
                  {g.title}
                </Link>
              ))}
            </nav>
          )}
          <SeriesAdder channelId={channel.id} />
          <div className="flex-auto" />
          <Link href={`/c/${channel.id}/settings`} className="inline-flex h-11 items-center rounded-[10px] border border-line-strong bg-raised px-3.5 text-[13px] text-fg no-underline hover:bg-line">
            채널 설정
          </Link>
          <Link href={href({ edit: "new" })} scroll={false} className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-[13px] font-bold text-accent-ink no-underline hover:bg-accent-2">
            <PlusIcon className="size-3.5" />영상 추가
          </Link>
        </div>

        {groups.length === 0 ? (
          <EmptyChannel channel={channel} />
        ) : (
          <>
            {/* 시리즈 제목 + 진행률 */}
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">
                  {group.id === SOLO ? "시리즈에 묶이지 않은 영상" : "진행 중인 시리즈"}
                  {formatsInGroup.length > 0 && ` · ${formatsInGroup.map((f) => `${FORMAT_LABEL[f]} ${inGroup.filter((v) => v.format === f).length}`).join(" + ")}`}
                </span>
                <h1 className="font-serif text-[32px] font-extrabold tracking-tight">
                  {group.id === SOLO ? group.title : `「${group.title}」`}
                </h1>
              </div>
              <div className="flex-auto" />
              <div className="flex min-w-[260px] items-center gap-3">
                <div className="h-1.5 flex-auto overflow-hidden rounded-full bg-line">
                  <div className="h-1.5 bg-accent" style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }} />
                </div>
                <span className="font-mono text-[13px]">
                  {prog.done} / {prog.total} 단계
                </span>
              </div>
            </div>

            {/* 요약 카드 */}
            <section aria-label="요약" className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              <NextUploadCard channel={channel} video={nextAll} today={today} />
              <GatesCard channelId={channel.id} gates={gates} videos={videos} />
              <CreditsCard channelId={channel.id} credits={data.credits} />
            </section>

            {/* 화별 진행 */}
            <section aria-labelledby="matrix-h" className={`${card} pb-2`}>
              <div className="mb-3.5 flex flex-wrap items-center gap-3">
                <h2 id="matrix-h" className="text-base font-bold">화별 진행</h2>
                {formatsInGroup.length > 1 && (
                  <div role="group" aria-label="형식 필터" className="flex gap-1 rounded-[9px] bg-ink p-[3px]">
                    {(["all", "short", "long"] as const).map((f) => (
                      <Link
                        key={f}
                        href={href({ fmt: f === "all" ? undefined : f })}
                        aria-current={fmt === f ? "true" : undefined}
                        className={`flex h-8 items-center gap-1 rounded-[7px] px-3 text-[13px] no-underline ${fmt === f ? "bg-line text-fg" : "text-muted hover:text-fg"}`}
                      >
                        {f === "all" ? "전체" : FORMAT_LABEL[f]}
                        <span className="font-mono text-xs">{f === "all" ? inGroup.length : inGroup.filter((v) => v.format === f).length}</span>
                      </Link>
                    ))}
                  </div>
                )}
                <span className="text-xs text-muted">칸을 누르면 대기 → 일부 → 완료로 바뀝니다</span>
                <div className="flex-auto" />
                <Legend />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th scope="col" className="px-2.5 py-2 font-medium">화</th>
                      <th scope="col" className="px-1.5 py-2 font-medium">형식</th>
                      {columns.map((c) => (
                        <th key={c} scope="col" className="px-1.5 py-2 font-medium">{c}</th>
                      ))}
                      <th scope="col" className="px-2.5 py-2 text-right font-medium">게시일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => {
                      const isSel = v.id === selected?.id;
                      const applicable = stepsFor(channel, v);
                      const day = videoDay(v);
                      return (
                        <tr key={v.id} className={`border-t border-line ${isSel ? "bg-raised" : ""}`}>
                          <th scope="row" className="px-1 py-1.5 text-left font-medium">
                            <div className="flex items-center">
                              <Link
                                href={href({ v: v.id })}
                                scroll={false}
                                aria-current={isSel ? "true" : undefined}
                                className="flex min-h-11 flex-auto items-center gap-2 px-1.5 text-sm text-fg no-underline"
                              >
                                <span className={`h-5 w-[3px] rounded-sm ${isSel ? "bg-accent" : "bg-transparent"}`} />
                                {v.workingTitle}
                              </Link>
                              <Link
                                href={href({ v: v.id, edit: v.id })}
                                scroll={false}
                                aria-label={`${v.workingTitle} 편집`}
                                className={`flex size-9 flex-none items-center justify-center rounded-md no-underline hover:bg-line hover:text-fg ${q.edit === v.id ? "text-accent-2" : "text-muted"}`}
                              >
                                <PencilIcon className="size-3.5" />
                              </Link>
                            </div>
                          </th>
                          <td className="p-1.5">
                            <FormatChip format={v.format} />
                          </td>
                          {columns.map((step) =>
                            applicable.includes(step) ? (
                              <td key={step} className="p-1.5">
                                <form action={cycleStep}>
                                  <input type="hidden" name="channel" value={channel.id} />
                                  <input type="hidden" name="video" value={v.id} />
                                  <input type="hidden" name="step" value={step} />
                                  <StepButton state={stepState(v, step)} label={`${v.workingTitle} ${step}`} uploadDay={step === "업로드" ? day : undefined} />
                                </form>
                              </td>
                            ) : (
                              <td key={step} className="p-1.5 pl-4 text-xs text-[#8c8573]">해당 없음</td>
                            ),
                          )}
                          <td className="px-2.5 py-1.5 text-right font-mono text-[13px] whitespace-nowrap text-fg-2">
                            {day ? dayLabel(day) : "미정"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {selected && <VideoDetail channel={channel} video={selected} />}

            <Schedule videos={videos} today={today} />
          </>
        )}
      </main>
      {editor}
      </div>
    </>
  );
}

function EmptyChannel({ channel }: { channel: Channel }) {
  return (
    <section className={`${card} flex flex-col items-start gap-2`}>
      <h1 className="font-serif text-2xl font-extrabold">{channel.name}</h1>
      <p className="text-fg-2">아직 등록된 시리즈나 영상이 없습니다.</p>
      <p className="text-xs text-muted">위의 「+ 시리즈」로 시리즈를 만들거나 「영상 추가」로 첫 영상을 등록하세요.</p>
    </section>
  );
}

const smallField =
  "h-10 w-full rounded-[9px] border border-line-strong bg-ink px-2.5 text-sm text-fg outline-none focus-visible:outline-2 focus-visible:outline-accent";
const smallSubmit = "h-10 rounded-[9px] bg-accent px-4 text-[13px] font-bold text-accent-ink hover:bg-accent-2";

// 펼침 폼은 JS 없이 <details> 로 연다(헤더 채널 메뉴와 같은 방식).
function SeriesAdder({ channelId }: { channelId: string }) {
  return (
    <details className="relative">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-full px-3 text-xs text-accent-2 hover:bg-raised">
        <PlusIcon className="size-3" />시리즈
      </summary>
      <form action={createSeries} className="absolute top-full left-0 z-20 mt-2 flex w-72 flex-col gap-2.5 rounded-xl border border-line-strong bg-panel p-4">
        <input type="hidden" name="channel" value={channelId} />
        <label htmlFor="ns-title" className="text-xs text-fg-2">시리즈 제목 <span className="text-danger">*</span></label>
        <input id="ns-title" name="title" required maxLength={40} className={smallField} />
        <label htmlFor="ns-desc" className="text-xs text-fg-2">설명 <span className="text-muted">(선택)</span></label>
        <input id="ns-desc" name="description" maxLength={200} className={smallField} />
        <button type="submit" className={`${smallSubmit} self-start`}>추가</button>
      </form>
    </details>
  );
}

function Legend() {
  return (
    <div className="flex gap-3 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-accent" />완료</span>
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] border-[1.5px] border-accent" />일부</span>
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-line" />대기</span>
    </div>
  );
}

function FormatChip({ format }: { format: Format }) {
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-line-strong px-2 text-xs whitespace-nowrap text-[#dcd4c1]">
      {format === "short" ? <PortraitIcon className="h-3.5 w-2.5" /> : <LandscapeIcon className="h-2.5 w-4" />}
      {format === "short" ? "쇼츠 9:16" : "롱폼 16:9"}
    </span>
  );
}

const STATE_LABEL: Record<StepState, string> = { done: "완료", part: "일부", wait: "대기", skip: "해당 없음" };

function StepButton({ state, label, uploadDay }: { state: StepState; label: string; uploadDay?: string }) {
  const text = state === "wait" && uploadDay ? "예정" : STATE_LABEL[state];
  const cls =
    state === "done"
      ? "bg-accent text-accent-ink font-bold"
      : state === "part"
        ? "border-[1.5px] border-accent text-accent-2 font-medium"
        : "bg-line text-[#b3ab97]";
  return (
    <button
      type="submit"
      aria-label={`${label}: ${STATE_LABEL[state]}. 눌러서 다음 상태로`}
      className={`inline-flex h-[30px] min-w-14 items-center justify-center gap-1 rounded-md px-2.5 text-xs hover:brightness-110 ${cls}`}
    >
      {state === "done" && <CheckIcon className="size-3" />}
      {text}
    </button>
  );
}

function NextUploadCard({ channel, video, today }: { channel: Channel; video?: Video; today: string }) {
  if (!video) {
    return (
      <div className={`${card} flex flex-col gap-3`}>
        <span className="text-xs text-muted">다음 업로드</span>
        <p className="text-fg-2">예정된 업로드가 없습니다.</p>
      </div>
    );
  }
  const steps = stepsFor(channel, video);
  const dd = daysBetween(today, video.targetPublishDate!);
  const remaining = steps.filter((s) => stepState(video, s) !== "done");
  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">다음 업로드</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 font-mono text-xs font-medium ${dd <= 1 ? "bg-danger text-[#160a07]" : "bg-raised text-fg"}`}>
          {dd === 0 ? "D-DAY" : `D-${dd}`}
        </span>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif text-[28px] font-extrabold">{video.workingTitle}</span>
        <span className="font-mono text-sm text-fg-2">{dayLabel(video.targetPublishDate!)}</span>
        <span className="text-xs text-muted">{FORMAT_LABEL[video.format]}</span>
      </div>
      <p className="text-[13px] text-fg-2">
        {remaining.length ? `남은 단계: ${remaining.join(", ")}` : "모든 단계 완료. 게시만 남았습니다."}
      </p>
      <div className="flex gap-1" role="img" aria-label={`준비 ${steps.length - remaining.length}/${steps.length}`}>
        {steps.map((s) => {
          const st = stepState(video, s);
          return <span key={s} className={`h-1 flex-1 rounded-sm ${st === "done" ? "bg-accent" : st === "part" ? "bg-[#5a5241]" : "bg-line"}`} />;
        })}
      </div>
    </div>
  );
}

function GatesCard({
  channelId,
  gates,
  videos,
}: {
  channelId: string;
  gates: { id: string; text: string; detail?: string }[];
  videos: Video[];
}) {
  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">확인 대기</span>
        <span className="ml-auto font-mono text-xs">{gates.length}건</span>
      </div>
      {gates.length === 0 ? (
        <p className="text-[13px] text-fg-2">확인할 일이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {gates.map((g, i) => (
            <li key={g.id} className="flex items-start gap-2.5">
              <AlertIcon className={`mt-[3px] size-4 flex-none ${i === 0 ? "text-danger" : "text-accent"}`} />
              <div className="flex-auto">
                <div className="font-medium">{g.text}</div>
                {g.detail && <div className="text-xs text-muted">{g.detail}</div>}
              </div>
              <form action={toggleTask}>
                <input type="hidden" name="channel" value={channelId} />
                <input type="hidden" name="task" value={g.id} />
                <button type="submit" className="h-8 rounded-md border border-line-strong px-2 text-xs text-fg-2 hover:bg-raised">
                  확인함
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <details className="border-t border-line pt-2.5">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs text-accent-2">
          <PlusIcon className="size-3" />확인할 일 추가
        </summary>
        <form action={createTask} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="channel" value={channelId} />
          <label htmlFor="nt-text" className="text-xs text-fg-2">할 일 <span className="text-danger">*</span></label>
          <input id="nt-text" name="text" required maxLength={80} className={smallField} />
          <label htmlFor="nt-detail" className="text-xs text-fg-2">설명 <span className="text-muted">(선택)</span></label>
          <input id="nt-detail" name="detail" maxLength={120} className={smallField} />
          <label htmlFor="nt-video" className="text-xs text-fg-2">연결 영상</label>
          <select id="nt-video" name="videoId" className={smallField}>
            <option value="">없음</option>
            {videos.map((v) => <option key={v.id} value={v.id}>{v.workingTitle}</option>)}
          </select>
          <button type="submit" className={`${smallSubmit} self-start`}>추가</button>
        </form>
      </details>
    </div>
  );
}

function CreditsCard({ channelId, credits }: { channelId: string; credits: Credit[] }) {
  const latest = credits.reduce((a, c) => (c.recordedAt > a ? c.recordedAt : a), "");
  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">남은 크레딧 · 수동 기록</span>
        {latest && <span className="ml-auto text-xs text-muted">{dayLabel(kstDate(new Date(latest)))} 기준</span>}
      </div>
      {credits.length === 0 && <p className="text-[13px] text-fg-2">기록 없음</p>}
      {credits.map((c) => (
        <div key={c.service} className="flex items-baseline justify-between gap-3">
          <span>{c.service}</span>
          <span className="text-right">
            {c.amount === undefined ? (
              <span className="text-[13px] text-muted">[기록 없음]</span>
            ) : (
              <span className="font-mono text-xl">약 {c.amount.toLocaleString("ko-KR")}</span>
            )}
            {c.note && <span className="ml-1.5 text-xs text-muted">{c.note}</span>}
          </span>
        </div>
      ))}
      <details className="border-t border-line pt-2.5">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs text-accent-2">크레딧 기록</summary>
        <form action={saveCredits} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="channel" value={channelId} />
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-x-2 gap-y-1.5 text-xs text-muted">
            <span>서비스</span><span>남은 양</span>
          </div>
          {[...credits, { service: "", recordedAt: "" } as Credit].map((c, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
              <input name="service" defaultValue={c.service} placeholder={c.service ? undefined : "새 서비스"} aria-label={`${i + 1}번 서비스 이름`} maxLength={30} className={smallField} />
              <input name="amount" inputMode="numeric" defaultValue={c.amount} aria-label={`${c.service || "새 서비스"} 남은 양`} className={`${smallField} font-mono`} />
              <input type="hidden" name="note" value={c.note ?? ""} />
            </div>
          ))}
          <span className="text-xs text-muted">이름을 지우면 그 줄은 빠집니다 · 오늘 날짜로 기록</span>
          <button type="submit" className={`${smallSubmit} self-start`}>저장</button>
        </form>
      </details>
      <div className="border-t border-line pt-2.5 text-xs text-muted">승인 범위 밖 유료 생성은 먼저 확인</div>
    </div>
  );
}

function VideoDetail({ channel, video }: { channel: Channel; video: Video }) {
  const copy = video.copy ?? {};
  const list = video.checklist ?? [];
  const done = list.filter((c) => c.done).length;
  return (
    <section aria-labelledby="detail-h" className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
      <div className={`${card} flex flex-col gap-4`}>
        <h2 id="detail-h" className="text-base font-bold">{video.workingTitle} 확정 카피</h2>
        {copy.overlay ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">제목 오버레이</span>
            <div className="rounded-[10px] bg-[#0d0c0a] px-[18px] py-4 font-serif text-lg leading-snug font-extrabold whitespace-pre-line text-[#f1e8d4]">
              {copy.overlay}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted">제목 미정</p>
        )}
        {copy.coldOpen && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">콜드오픈</span>
            <div className="font-serif text-base text-[#f1e8d4]">“{copy.coldOpen}”</div>
          </div>
        )}
        {copy.recap && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">지난 이야기 대본</span>
            <p className="text-sm leading-relaxed text-[#dcd4c1]">{copy.recap}</p>
          </div>
        )}
        {copy.endCard && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">엔드카드</span>
            <div>{copy.endCard}</div>
          </div>
        )}
        {video.youtubeId && (
          <a
            href={`https://youtube.com/${video.format === "short" ? "shorts/" : "watch?v="}${video.youtubeId}`}
            target="_blank"
            rel="noreferrer"
            className="text-[13px]"
          >
            유튜브에서 보기
          </a>
        )}
      </div>

      <div className={`${card} flex flex-col gap-3.5`}>
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-bold">{video.workingTitle} 남은 작업</h2>
          <span className="ml-auto font-mono text-xs text-muted">{done} / {list.length}</span>
        </div>
        {!isPublished(video) && channel.steps[video.format].some((s) => /캡컷|조립/.test(s)) && stepsFor(channel, video).some((s) => /캡컷|조립/.test(s) && stepState(video, s) !== "done") && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-wash px-3 py-2 text-xs text-accent-2">
            <MonitorIcon className="size-3.5" />
            조립은 캡컷이 있는 Mac에서만 가능
          </div>
        )}
        {list.length === 0 ? (
          <p className="text-[13px] text-muted">체크리스트가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {list.map((item, i) => (
              <li key={i}>
                <form action={toggleChecklist}>
                  <input type="hidden" name="channel" value={channel.id} />
                  <input type="hidden" name="video" value={video.id} />
                  <input type="hidden" name="index" value={i} />
                  <button
                    type="submit"
                    role="checkbox"
                    aria-checked={item.done}
                    className="flex min-h-11 w-full items-start gap-3 border-b border-raised px-1 py-2 text-left"
                  >
                    <span
                      className={`mt-0.5 flex size-[18px] flex-none items-center justify-center rounded border ${item.done ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-ink"}`}
                    >
                      {item.done && <CheckIcon className="size-3" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={`text-sm ${item.done ? "text-faint line-through" : "text-fg"}`}>{item.text}</span>
                      {item.path && <span className="font-mono text-[11px] break-all text-muted">{item.path}</span>}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Schedule({ videos, today }: { videos: Video[]; today: string }) {
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  return (
    <section aria-labelledby="sched-h" className={card}>
      <div className="mb-3.5 flex items-baseline gap-3">
        <h2 id="sched-h" className="text-base font-bold">업로드 일정</h2>
        <span className="text-xs text-muted">오늘부터 8일 · KST</span>
      </div>
      <div className="overflow-x-auto">
        <ol className="grid min-w-[760px] grid-cols-8 gap-2">
          {days.map((d, i) => {
            const items = videos.filter((v) => videoDay(v) === d);
            const isToday = i === 0;
            return (
              <li
                key={d}
                className={`flex min-h-[104px] flex-col gap-1.5 rounded-[10px] border p-3 ${items.length ? "bg-bar" : ""} ${isToday ? "border-accent bg-accent-wash" : "border-line"}`}
              >
                <span className={`font-mono text-xs ${isToday ? "text-accent-2" : "text-muted"}`}>
                  {dayLabel(d)}
                  {isToday && " · 오늘"}
                </span>
                {items.length === 0 && <span className="text-xs text-[#8c8573]">없음</span>}
                {items.map((v) => (
                  <span key={v.id} className="flex flex-col">
                    <span className={`text-sm font-bold ${isPublished(v) ? "text-fg-2" : "text-fg"}`}>{v.workingTitle}</span>
                    <span className="text-xs text-muted">
                      {FORMAT_LABEL[v.format]}
                      {isPublished(v) ? " · 게시됨" : ""}
                    </span>
                  </span>
                ))}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
