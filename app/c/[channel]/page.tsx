import { redirect } from "next/navigation";
import { Suspense } from "react";

// 채널 주소(등록·설정 뒤 이동 포함)는 그 채널만 거른 통합 보드로 보낸다.
export default function ChannelPage({ params }: PageProps<"/c/[channel]">) {
  return (
    <Suspense>
      <ToBoard params={params} />
    </Suspense>
  );
}

async function ToBoard({ params }: { params: PageProps<"/c/[channel]">["params"] }): Promise<never> {
  const { channel } = await params;
  redirect(`/?ch=${encodeURIComponent(channel)}`);
}
