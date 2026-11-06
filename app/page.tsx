import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listChannels } from "@/lib/data";

// 첫 채널 대시보드로 보낸다. 채널이 없으면 등록 화면으로.
export default function Home() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">불러오는 중…</p>}>
      <GoToChannel />
    </Suspense>
  );
}

async function GoToChannel(): Promise<never> {
  const channels = await listChannels();
  redirect(channels.length ? `/c/${channels[0].id}` : "/channels/new");
}
