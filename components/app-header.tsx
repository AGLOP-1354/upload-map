import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { LockIcon } from "@/components/icons";

// 보드 밖 화면(채널 등록·설정)의 머리. 보드는 자체 머리와 사이드바를 쓴다.
export function AppHeader({ now, children }: { now: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bar px-4 py-3.5 sm:px-7">
      <Link href="/" className="flex items-center gap-2.5 text-fg no-underline">
        <LockIcon className="size-[22px] text-accent" />
        <span className="font-serif text-lg font-extrabold tracking-tight">업로드맵</span>
      </Link>
      <span aria-hidden className="text-[#4a453a]">/</span>
      <span className="font-medium">{children}</span>

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
