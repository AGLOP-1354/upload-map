"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { AlertIcon, PlusIcon, UploadIcon, XIcon } from "@/components/icons";
import { updateChannelSettings } from "@/app/c/[channel]/settings/actions";
import { CHANNEL_COLORS, DEFAULT_GATES, DEFAULT_STEPS, type Channel, type Format } from "@/lib/types";
import { createChannel, type CreateChannelState } from "./actions";

const field =
  "h-11 w-full rounded-[10px] border border-line-strong bg-ink px-3 text-[15px] text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";
const fieldset = "m-0 flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5";
const legend = "px-1.5 text-[15px] font-bold";

// initial 이 있으면 채널 설정(수정), 없으면 새 채널 등록.
export function ChannelForm({ usedColors, existing, initial }: { usedColors: string[]; existing: ReactNode; initial?: Channel }) {
  const [state, action, pending] = useActionState<CreateChannelState, FormData>(initial ? updateChannelSettings : createChannel, {});
  const [name, setName] = useState(initial?.name ?? "");
  const [handle, setHandle] = useState(initial?.handle ?? "");
  // 이미 쓰는 색은 뒤로 미룬다.
  const palette = [...CHANNEL_COLORS].sort((a, b) => Number(usedColors.includes(a.hex)) - Number(usedColors.includes(b.hex)));
  const [color, setColor] = useState(initial?.color ?? palette[0].hex);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const savedLogo = initial?.logo ? `/c/${initial.id}/logo?v=${encodeURIComponent(initial.updatedAt)}` : "";
  const shownLogo = logoUrl || savedLogo;
  const [fmt, setFmt] = useState<Record<Format, { on: boolean; n: number }>>(
    initial
      ? {
          short: { on: initial.cadence.shortsPerWeek > 0 || initial.steps.short.length > 0, n: initial.cadence.shortsPerWeek },
          long: { on: initial.cadence.longPerWeek > 0 || initial.steps.long.length > 0, n: initial.cadence.longPerWeek },
        }
      : { short: { on: true, n: 5 }, long: { on: true, n: 1 } },
  );
  const [steps, setSteps] = useState<Record<Format, string[]>>(
    initial
      ? {
          short: initial.steps.short.length ? initial.steps.short : DEFAULT_STEPS.short,
          long: initial.steps.long.length ? initial.steps.long : DEFAULT_STEPS.long,
        }
      : DEFAULT_STEPS,
  );
  const [newStep, setNewStep] = useState<Record<Format, string>>({ short: "", long: "" });

  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);

  const slug = handle.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "<핸들>";
  const initialChar = name.trim().charAt(0) || "?";
  const cadence = (["short", "long"] as const).filter((f) => fmt[f].on).map((f) => `${f === "short" ? "쇼츠" : "롱폼"} ${fmt[f].n}`);
  const err = (f: CreateChannelState["field"]) => state.field === f;

  const addStep = (f: Format) => {
    const s = newStep[f].trim();
    if (!s || steps[f].includes(s)) return;
    setSteps({ ...steps, [f]: [...steps[f], s] });
    setNewStep({ ...newStep, [f]: "" });
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form action={action} className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        {initial && <input type="hidden" name="channel" value={initial.id} />}
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[28px] font-extrabold tracking-tight">{initial ? "채널 설정" : "새 채널 등록"}</h1>
          <p className="text-[13px] text-muted">
            {initial
              ? "핸들(폴더 이름)은 바꿀 수 없습니다. 채널 삭제는 지원하지 않습니다."
              : "등록하면 이 채널 전용 폴더가 생기고, 시리즈·영상·일정이 채널별로 따로 저장됩니다."}
          </p>
        </div>

        {state.error && (
          <div role="alert" className="flex items-start gap-2 rounded-[10px] bg-danger-wash px-3 py-2.5 text-[13px] text-danger-2">
            <AlertIcon className="mt-0.5 size-4 flex-none" />
            {state.error}
          </div>
        )}

        <fieldset className={fieldset}>
          <legend className={legend}>기본 정보</legend>

          <div className="flex flex-wrap items-center gap-5">
            <div
              className="flex size-24 flex-none items-center justify-center overflow-hidden rounded-full border-[3px] bg-ink"
              style={{ borderColor: color }}
            >
              {shownLogo ? (
                // 업로드 전 로컬 미리보기(blob: URL)라 next/image 를 쓰지 않는다.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownLogo} alt="채널 로고 미리보기" className="size-full object-cover" />
              ) : (
                <span className="font-serif text-4xl font-extrabold" style={{ color }}>{initialChar}</span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[13px] text-fg-2">채널 로고 <span className="text-muted">(선택)</span></span>
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="logo"
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong bg-raised px-3.5 text-[13px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                >
                  <UploadIcon className="size-4" />
                  {shownLogo ? "다른 이미지로 바꾸기" : "이미지 선택"}
                  <input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    aria-invalid={err("logo")}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setLogoUrl(f ? URL.createObjectURL(f) : "");
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    className="h-11 rounded-[10px] px-3.5 text-[13px] text-fg-2 hover:text-fg"
                    onClick={() => {
                      const input = document.getElementById("logo") as HTMLInputElement | null;
                      if (input) input.value = "";
                      setLogoUrl("");
                    }}
                  >
                    지우기
                  </button>
                )}
              </div>
              <span className="text-xs text-muted">
                PNG·JPG·WEBP · 2MB 이하 · 정사각형 권장 · 원형으로 잘려 보입니다
                <br />
                없으면 채널 이름 첫 글자를 대신 씁니다
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cname" className="text-[13px] text-fg-2">채널 이름 <span className="text-danger">*</span></label>
              <input id="cname" name="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={err("name")} className={field} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="chandle" className="text-[13px] text-fg-2">핸들 <span className="text-danger">*</span></label>
              <div className={`flex h-11 items-center rounded-[10px] border bg-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${err("handle") ? "border-danger" : "border-line-strong"}`}>
                <span className="pr-1 pl-3 text-muted">@</span>
                <input
                  id="chandle"
                  name="handle"
                  required
                  readOnly={!!initial}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                  aria-invalid={err("handle")}
                  aria-describedby="chandle-hint"
                  className="h-10 min-w-0 flex-auto bg-transparent font-mono text-[15px] text-fg outline-none"
                />
              </div>
              <span id="chandle-hint" className="text-xs text-muted">
                {initial ? "바꿀 수 없음 · " : "폴더 이름으로도 씀 · "}data/<span className="font-mono">{initial?.id ?? slug}</span>/
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="curl" className="text-[13px] text-fg-2">유튜브 채널 주소 <span className="text-muted">(선택)</span></label>
            <input id="curl" name="url" type="url" defaultValue={initial?.url} placeholder="https://youtube.com/@…" className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cniche" className="text-[13px] text-fg-2">주제 · 장르</label>
            <input id="cniche" name="niche" maxLength={60} defaultValue={initial?.niche} placeholder="예: 공포 썰, 괴담" className={field} />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] text-fg-2">구분 색</legend>
            <div className="flex flex-wrap gap-2">
              {palette.map((c) => (
                <label
                  key={c.hex}
                  className="flex size-11 cursor-pointer items-center justify-center rounded-full border-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                  style={{ borderColor: color === c.hex ? "#eee7d6" : "transparent" }}
                >
                  <input type="radio" name="color" value={c.hex} checked={color === c.hex} onChange={() => setColor(c.hex)} className="sr-only" aria-label={`${c.name}${usedColors.includes(c.hex) ? " (사용 중)" : ""}`} />
                  <span className="size-7 rounded-full" style={{ background: c.hex }} />
                </label>
              ))}
            </div>
            <span className="text-xs text-muted">다른 채널이 쓰는 색은 맨 뒤로 밀립니다</span>
          </fieldset>
        </fieldset>

        <fieldset className={fieldset}>
          <legend className={legend}>형식 · 업로드 주기</legend>
          <p className="text-[13px] text-muted">바쁜 주에도 지킬 수 있는 숫자로 정하세요.</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            {(["short", "long"] as const).map((f) => {
              const label = f === "short" ? "쇼츠" : "롱폼";
              const cur = fmt[f];
              return (
                <div key={f} className={`flex flex-col gap-3 rounded-xl border p-4 ${cur.on ? "border-[#5a5241] bg-bar" : "border-line"}`}>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2.5 font-medium">
                    <input
                      type="checkbox"
                      name={`${f}_on`}
                      checked={cur.on}
                      onChange={() => setFmt({ ...fmt, [f]: { ...cur, on: !cur.on } })}
                      className="size-[18px] accent-accent"
                    />
                    {label} <span className="text-xs font-normal text-muted">{f === "short" ? "9:16" : "16:9"}</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] text-fg-2">주</span>
                    <button type="button" disabled={!cur.on} aria-label={`${label} 주간 편수 줄이기`} onClick={() => setFmt({ ...fmt, [f]: { ...cur, n: Math.max(0, cur.n - 1) } })} className="size-11 rounded-[10px] border border-line-strong bg-ink text-lg disabled:opacity-40">−</button>
                    <output aria-live="polite" className="min-w-7 text-center font-mono text-lg">{cur.on ? cur.n : 0}</output>
                    <input type="hidden" name={`${f}_n`} value={cur.n} />
                    <button type="button" disabled={!cur.on} aria-label={`${label} 주간 편수 늘리기`} onClick={() => setFmt({ ...fmt, [f]: { ...cur, n: Math.min(14, cur.n + 1) } })} className="size-11 rounded-[10px] border border-line-strong bg-ink text-lg disabled:opacity-40">+</button>
                    <span className="text-[13px] text-fg-2">편</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex max-w-60 flex-col gap-1.5">
            <label htmlFor="ctime" className="text-[13px] text-fg-2">기본 업로드 시각 (KST)</label>
            <input id="ctime" name="uploadTime" type="time" defaultValue={initial ? initial.uploadTime : "00:45"} className={`${field} font-mono`} />
          </div>
        </fieldset>

        <fieldset className={fieldset}>
          <legend className={legend}>제작 단계 템플릿</legend>
          <p className="text-[13px] text-muted">
            {initial
              ? "진행표의 열입니다. 단계 이름을 바꾸거나 빼면 그 단계에 기록된 진행 상태는 표에 보이지 않습니다."
              : "진행표의 열이 됩니다. 기본값은 「잠긴 서재」 방식입니다."}
          </p>
          {(["short", "long"] as const).filter((f) => fmt[f].on).map((f) => (
            <div key={f} className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">{f === "short" ? "쇼츠" : "롱폼"}</span>
              <input type="hidden" name={`steps_${f}`} value={JSON.stringify(steps[f])} />
              <div className="flex flex-wrap items-center gap-1.5">
                {steps[f].map((s, i) => (
                  <span key={s} className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-raised pr-1 pl-3 text-[13px]">
                    <span className="font-mono text-[11px] text-muted">{i + 1}</span>
                    {s}
                    <button type="button" aria-label={`${s} 단계 빼기`} onClick={() => setSteps({ ...steps, [f]: steps[f].filter((x) => x !== s) })} className="flex size-7 items-center justify-center rounded-md text-muted hover:text-fg">
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
                <span className="inline-flex h-[34px] items-center rounded-lg border border-dashed border-[#4a453a]">
                  <input
                    aria-label={`${f === "short" ? "쇼츠" : "롱폼"} 단계 추가`}
                    placeholder="단계 이름"
                    maxLength={30}
                    value={newStep[f]}
                    onChange={(e) => setNewStep({ ...newStep, [f]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStep(f); } }}
                    className="h-8 w-24 bg-transparent px-2 text-[13px] outline-none"
                  />
                  <button type="button" aria-label="단계 추가" onClick={() => addStep(f)} className="flex size-8 items-center justify-center text-fg-2 hover:text-fg">
                    <PlusIcon className="size-3.5" />
                  </button>
                </span>
              </div>
            </div>
          ))}
        </fieldset>

        <fieldset className={fieldset}>
          <legend className={legend}>확인 규칙 <span className="text-[13px] font-normal text-muted">(선택)</span></legend>
          <p className="text-[13px] text-muted">켜 둔 항목은 이 채널 작업에서 확인 대기로 다룹니다.</p>
          {DEFAULT_GATES.map((g, i) => (
            <label key={g} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" name="gate" value={g} defaultChecked={initial ? initial.gates.includes(g) : i < 3} className="size-[18px] flex-none accent-accent" />
              {g}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap justify-end gap-2.5">
          <Link href={initial ? `/c/${initial.id}` : "/"} className="inline-flex h-12 items-center rounded-[10px] border border-line-strong px-5 text-fg no-underline">취소</Link>
          <button type="submit" disabled={pending} className="h-12 rounded-[10px] bg-accent px-6 font-bold text-accent-ink hover:bg-accent-2 disabled:opacity-60">
            {initial ? (pending ? "저장 중…" : "저장") : pending ? "등록 중…" : "채널 등록"}
          </button>
        </div>
      </form>

      <aside aria-label="미리보기" className="flex flex-[1_1_300px] flex-col gap-3 lg:sticky lg:top-6">
        <span className="text-xs text-muted">채널 전환 메뉴에 이렇게 보입니다</span>
        <div className="rounded-xl border border-line-strong bg-panel p-1.5">
          {existing}
          <div className="flex min-h-[52px] items-center gap-2.5 rounded-lg border border-dashed border-[#4a453a] bg-raised px-2.5">
            <span className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-full border-2 bg-ink" style={{ borderColor: color }}>
              {shownLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownLogo} alt="" className="size-full object-cover" />
              ) : (
                <span className="font-serif text-sm font-extrabold" style={{ color }}>{initialChar}</span>
              )}
            </span>
            <span className="flex flex-col">
              <span className="font-medium">{name || "[채널 이름]"}</span>
              <span className="text-xs text-muted">@{handle || "핸들"} · {cadence.length ? `주 ${cadence.join(" · ")}` : "형식 미선택"}</span>
            </span>
          </div>
        </div>
        <div hidden={!!initial} className="flex flex-col gap-1.5 rounded-xl border border-line bg-panel p-3.5">
          <span className="text-xs text-muted">만들어지는 파일</span>
          <span className="font-mono text-xs leading-loose whitespace-pre-line text-[#dcd4c1]">
            {`data/channels.json  ← 1줄 추가\n${logoUrl ? `data/${slug}/logo.*\n` : ""}data/${slug}/series.json · videos.json\ndata/${slug}/plans.json · tasks.json · credits.json`}
          </span>
        </div>
      </aside>
    </div>
  );
}
