"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { AlertIcon, PlusIcon, XIcon } from "@/components/icons";
import { VIDEO_STATUSES, type ChecklistItem, type Format, type Video } from "@/lib/types";
import { dropVideo, saveVideo, type FormState } from "./actions";

const field =
  "h-11 w-full rounded-[10px] border border-line-strong bg-ink px-3 text-[15px] text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-invalid:border-danger";
const area = `${field.replace("h-11 ", "")} py-2.5 leading-relaxed`;
const label = "text-[13px] text-fg-2";

const STATUS_LABEL: Record<Video["status"], string> = {
  idea: "아이디어",
  research: "자료조사",
  scripting: "대본",
  packaging: "제목·썸네일",
  filming: "촬영",
  editing: "편집",
  scheduled: "예약됨",
  published: "게시됨",
  reviewed: "회고 완료",
  dropped: "보류",
};

const TABS = [
  { id: "basic", label: "기본" },
  { id: "copy", label: "카피" },
  { id: "checklist", label: "체크리스트" },
  { id: "publish", label: "게시·메모" },
] as const;
type Tab = (typeof TABS)[number]["id"];
// 오류가 난 칸이 있는 탭을 연다.
const TAB_OF: Record<string, Tab> = { checklist: "checklist", youtubeId: "publish" };

export function VideoEditor({
  channelId,
  steps,
  series,
  video,
  defaults,
  closeHref,
}: {
  channelId: string;
  steps: Record<Format, string[]>;
  series: { id: string; title: string }[];
  video?: Video;
  defaults: { seriesId?: string; format: Format };
  closeHref: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveVideo, {});
  const [tab, setTab] = useState<Tab>("basic");
  const [format, setFormat] = useState<Format>(video?.format ?? defaults.format);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(video?.checklist ?? []);
  // 새 오류가 오면 그 칸이 있는 탭으로 넘긴다(렌더 중 상태 갱신 패턴).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.field) setTab(TAB_OF[state.field] ?? "basic");
  }
  const shownTab = tab;
  const invalid = (f: string) => state.field === f || undefined;
  const title = video ? `${video.workingTitle} 편집` : "새 영상";

  const setItem = (i: number, patch: Partial<ChecklistItem>) =>
    setChecklist(checklist.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 id="editor-h" className="font-serif text-2xl font-extrabold">{title}</h2>
        {video && <span className="font-mono text-xs text-muted">{video.id}</span>}
        <Link href={closeHref} scroll={false} aria-label="편집 패널 닫기" className="ml-auto flex size-11 items-center justify-center rounded-[10px] text-muted no-underline hover:bg-raised hover:text-fg">
          <XIcon className="size-4" />
        </Link>
      </div>

      {/* 하이드레이션 뒤에는 onSubmit 으로 보낸다: 폼 action 은 끝나면 입력을 초기화해 오류 때 고친 값이 사라진다.
          action 은 JS 가 붙기 전 제출을 위한 것(기본 GET 으로 입력이 주소에 실리지 않게). */}
      <form
        action={action}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        className="flex flex-col gap-4"
        aria-labelledby="editor-h"
      >
        <input type="hidden" name="channel" value={channelId} />
        <input type="hidden" name="video" value={video?.id ?? ""} />
        <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />

        {state.error && (
          <div role="alert" className="flex items-start gap-2 rounded-[10px] bg-danger-wash px-3 py-2.5 text-[13px] text-danger-2">
            <AlertIcon className="mt-0.5 size-4 flex-none" />
            {state.error}
          </div>
        )}

        <div role="tablist" aria-label="편집 구역" className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-controls={`panel-${t.id}`}
              aria-selected={shownTab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px h-11 border-b-2 px-3 text-[13px] whitespace-nowrap ${shownTab === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 숨긴 탭의 입력도 폼에 남아 함께 저장된다(hidden 속성). */}
        <div role="tabpanel" id="panel-basic" aria-labelledby="tab-basic" hidden={shownTab !== "basic"} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-title" className={label}>작업 제목 <span className="text-danger">*</span></label>
            <input id="ve-title" name="workingTitle" maxLength={60} defaultValue={video?.workingTitle} placeholder="예: 6화" aria-invalid={invalid("workingTitle")} className={field} />
          </div>
          {!video && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-id" className={label}>id <span className="text-muted">(선택 · 나중에 못 바꿈)</span></label>
              <input id="ve-id" name="id" maxLength={64} placeholder="비우면 시리즈-ep화수 로 자동" aria-invalid={invalid("id")} className={`${field} font-mono`} />
            </div>
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className={`${label} mb-1.5`}>형식</legend>
            <div className="flex gap-[3px] rounded-[10px] border border-line bg-ink p-[3px]">
              {(["short", "long"] as const).map((f) => (
                <label key={f} className={`flex h-9 flex-1 cursor-pointer items-center justify-center rounded-[7px] text-[13px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${format === f ? "bg-line text-fg" : "text-muted"}`}>
                  <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                  {f === "short" ? "쇼츠 9:16" : "롱폼 16:9"}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-series" className={label}>시리즈</label>
              <select id="ve-series" name="seriesId" defaultValue={video?.seriesId ?? defaults.seriesId ?? ""} aria-invalid={invalid("seriesId")} className={field}>
                <option value="">단독 영상</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-ep" className={label}>화수</label>
              <input id="ve-ep" name="episode" type="number" min={0} max={999} defaultValue={video?.episode} aria-invalid={invalid("episode")} className={`${field} font-mono`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-date" className={label}>게시 예정일</label>
              <input id="ve-date" name="targetPublishDate" type="date" defaultValue={video?.targetPublishDate} aria-invalid={invalid("targetPublishDate")} className={`${field} font-mono`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ve-status" className={label}>제작 단계</label>
              <select id="ve-status" name="status" defaultValue={video?.status ?? "idea"} aria-invalid={invalid("status")} className={field}>
                {VIDEO_STATUSES.filter((s) => s !== "dropped").map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          {steps[format].length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className={`${label} mb-1.5`}>이 영상에 해당 없는 단계 <span className="text-xs text-muted">· 진행률에서 빠짐</span></legend>
              <div className="flex flex-wrap gap-1.5">
                {steps[format].map((s) => (
                  <label key={`${format}-${s}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] has-[:checked]:border-accent has-[:checked]:bg-accent-wash has-[:checked]:text-accent-2">
                    <input type="checkbox" name="skip" value={s} defaultChecked={video?.format === format && video.steps[s] === "skip"} className="size-4 accent-accent" />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div role="tabpanel" id="panel-copy" aria-labelledby="tab-copy" hidden={shownTab !== "copy"} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-overlay" className={label}>제목 오버레이 <span className="text-xs text-muted">· 줄바꿈 그대로 표시</span></label>
            <textarea id="ve-overlay" name="overlay" rows={2} maxLength={120} defaultValue={video?.copy?.overlay} className={`${area} font-serif font-extrabold`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-cold" className={label}>콜드오픈</label>
            <input id="ve-cold" name="coldOpen" maxLength={120} defaultValue={video?.copy?.coldOpen} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-recap" className={label}>지난 이야기 대본</label>
            <textarea id="ve-recap" name="recap" rows={4} maxLength={1000} defaultValue={video?.copy?.recap} className={area} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-end" className={label}>엔드카드</label>
            <input id="ve-end" name="endCard" maxLength={120} defaultValue={video?.copy?.endCard} className={field} />
          </div>
        </div>

        <div role="tabpanel" id="panel-checklist" aria-labelledby="tab-checklist" hidden={shownTab !== "checklist"} className="flex flex-col gap-3">
          {checklist.length === 0 && <p className="text-[13px] text-muted">항목이 없습니다.</p>}
          <ul className="flex flex-col gap-2.5">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <input type="checkbox" checked={c.done} onChange={(e) => setItem(i, { done: e.target.checked })} aria-label={`${i + 1}번 완료`} className="mt-3.5 size-[18px] flex-none accent-accent" />
                <div className="flex min-w-0 flex-auto flex-col gap-1.5">
                  <input value={c.text} onChange={(e) => setItem(i, { text: e.target.value })} aria-label={`${i + 1}번 할 일`} placeholder="할 일" maxLength={200} className={field} />
                  <input value={c.path ?? ""} onChange={(e) => setItem(i, { path: e.target.value })} aria-label={`${i + 1}번 파일 경로`} placeholder="파일 경로 (선택)" maxLength={300} className={`${field} h-9 font-mono text-xs`} />
                </div>
                <button type="button" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} aria-label={`${i + 1}번 항목 삭제`} className="flex size-11 flex-none items-center justify-center rounded-[10px] text-muted hover:bg-raised hover:text-fg">
                  <XIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setChecklist([...checklist, { text: "", done: false }])} className="inline-flex h-11 items-center gap-1.5 self-start rounded-[10px] border border-dashed border-[#4a453a] px-3.5 text-[13px] text-fg-2 hover:bg-raised">
            <PlusIcon className="size-3.5" />항목 추가
          </button>
        </div>

        <div role="tabpanel" id="panel-publish" aria-labelledby="tab-publish" hidden={shownTab !== "publish"} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-yt" className={label}>유튜브 영상 ID <span className="text-xs text-muted">· 게시한 뒤 입력</span></label>
            <input id="ve-yt" name="youtubeId" maxLength={20} defaultValue={video?.youtubeId} placeholder="vFHIfex3Iao" aria-invalid={invalid("youtubeId")} className={`${field} font-mono`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ve-notes" className={label}>메모</label>
            <textarea id="ve-notes" name="notes" rows={4} maxLength={2000} defaultValue={video?.notes} className={area} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button type="submit" disabled={pending} className="h-12 rounded-[10px] bg-accent px-6 font-bold text-accent-ink hover:bg-accent-2 disabled:opacity-60">
            {pending ? "저장 중…" : video ? "저장" : "영상 추가"}
          </button>
          <Link href={closeHref} scroll={false} className="inline-flex h-12 items-center px-3 text-fg-2 no-underline hover:text-fg">닫기</Link>
        </div>
      </form>

      {video && (
        <details className="rounded-[10px] border border-[#5a2a20] bg-danger-wash">
          <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-[13px] text-danger-2">보류로 내리기</summary>
          <form action={dropVideo} className="flex flex-col gap-2 px-3.5 pb-3.5">
            <input type="hidden" name="channel" value={channelId} />
            <input type="hidden" name="video" value={video.id} />
            <label htmlFor="ve-reason" className="text-xs text-danger-2">사유 <span className="text-danger">*</span> · 영상은 지우지 않고 진행표에서만 빠집니다</label>
            <div className="flex gap-2">
              <input id="ve-reason" name="reason" required maxLength={200} className={field} />
              <button type="submit" className="h-11 flex-none rounded-[10px] bg-danger px-4 text-[13px] font-medium text-[#160a07]">보류</button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
