import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { ChannelAvatar } from "@/components/channel-avatar";
import { ChevronLeftIcon } from "@/components/icons";
import { kstNowLabel } from "@/lib/dashboard";
import { listChannels } from "@/lib/data";
import { ChannelForm } from "./channel-form";

export const metadata: Metadata = { title: "새 채널 등록 · 업로드맵" };

export default function NewChannelPage() {
  return (
    <Suspense fallback={<div className="h-[69px] border-b border-line bg-bar" />}>
      <NewChannel />
    </Suspense>
  );
}

async function NewChannel() {
  const channels = await listChannels();
  const used = channels.map((c) => c.color);
  return (
    <>
      <AppHeader channels={[]} now={kstNowLabel()}>
        새 채널 등록
      </AppHeader>
      <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-14 sm:px-6">
        {channels.length > 0 && (
          <Link href="/" className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-fg-2 no-underline hover:text-fg">
            <ChevronLeftIcon className="size-4" />
            대시보드로
          </Link>
        )}
        <ChannelForm
          usedColors={used}
          existing={
            <>
              {channels.map((c) => (
                <div key={c.id} className="flex min-h-[52px] items-center gap-2.5 rounded-lg px-2.5">
                  <ChannelAvatar channel={c} size={32} />
                  <span className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted">@{c.handle}</span>
                  </span>
                </div>
              ))}
            </>
          }
        />
      </div>
    </>
  );
}
