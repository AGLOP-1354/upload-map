import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { ChannelAvatar } from "@/components/channel-avatar";
import { ChevronLeftIcon } from "@/components/icons";
import { ChannelForm } from "@/app/channels/new/channel-form";
import { kstNowLabel } from "@/lib/dashboard";
import { listChannels } from "@/lib/data";

export const metadata: Metadata = { title: "채널 설정 · 업로드맵" };

export default function ChannelSettingsPage({ params }: PageProps<"/c/[channel]/settings">) {
  return (
    <Suspense fallback={<div className="h-[69px] border-b border-line bg-bar" />}>
      <ChannelSettings params={params} />
    </Suspense>
  );
}

async function ChannelSettings({ params }: { params: PageProps<"/c/[channel]/settings">["params"] }) {
  const { channel: id } = await params;
  const channels = await listChannels();
  const channel = channels.find((c) => c.id === id);
  if (!channel) notFound();
  const others = channels.filter((c) => c.id !== id);
  return (
    <>
      <AppHeader channels={[]} now={kstNowLabel()}>
        채널 설정
      </AppHeader>
      <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-14 sm:px-6">
        <Link href={`/c/${id}`} className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-fg-2 no-underline hover:text-fg">
          <ChevronLeftIcon className="size-4" />
          대시보드로
        </Link>
        <ChannelForm
          initial={channel}
          usedColors={others.map((c) => c.color)}
          existing={
            <>
              {others.map((c) => (
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
