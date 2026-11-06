import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { ChannelAvatar } from "@/components/channel-avatar";
import { ChevronDownIcon, LockIcon } from "@/components/icons";
import type { Channel } from "@/lib/types";

export function AppHeader({
  channels,
  current,
  now,
  children,
}: {
  channels: (Channel & { weekText: string })[];
  current?: Channel;
  now: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bar px-4 py-3.5 sm:px-7">
      <Link href="/" className="flex items-center gap-2.5 text-fg no-underline">
        <LockIcon className="size-[22px] text-accent" />
        <span className="font-serif text-lg font-extrabold tracking-tight">업로드맵</span>
      </Link>
      <span aria-hidden className="text-[#4a453a]">/</span>

      {current ? (
        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-line-strong bg-panel px-3 [&::-webkit-details-marker]:hidden">
            <ChannelAvatar channel={current} size={26} />
            <span className="font-medium">{current.name}</span>
            <span className="text-[13px] text-muted">@{current.handle}</span>
            <ChevronDownIcon className="size-3.5 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute top-12 left-0 z-20 w-[300px] rounded-xl border border-line-strong bg-panel p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <div className="px-2.5 pt-2 pb-1 text-[11px] tracking-widest text-muted">채널 전환</div>
            {channels.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.id}`}
                aria-current={c.id === current.id ? "page" : undefined}
                className={`flex min-h-[52px] items-center gap-2.5 rounded-lg px-2.5 text-fg no-underline hover:bg-raised ${c.id === current.id ? "bg-raised" : ""}`}
              >
                <ChannelAvatar channel={c} size={32} />
                <span className="flex flex-col">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted">{c.weekText}</span>
                </span>
              </Link>
            ))}
            <div className="mx-1 my-1.5 h-px bg-line" />
            <Link href="/channels/new" className="flex min-h-11 items-center rounded-lg px-2.5 text-[13px] font-medium text-accent-2 no-underline hover:bg-raised">
              + 새 채널 등록
            </Link>
          </div>
        </details>
      ) : (
        <span className="font-medium">{children}</span>
      )}

      <div className="flex-auto" />
      <span className="font-mono text-[13px] text-muted">{now}</span>
      <form action={logout}>
        <button type="submit" className="h-9 rounded-lg border border-line-strong px-3.5 text-[13px] text-fg hover:bg-raised">
          로그아웃
        </button>
      </form>
    </header>
  );
}
