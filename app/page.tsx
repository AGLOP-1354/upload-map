import { redirect } from "next/navigation";
import { Suspense } from "react";
import { kstDate, kstNowLabel } from "@/lib/dashboard";
import { getAllChannelData } from "@/lib/data";
import { Board } from "./_board/board";

// 통합 단계 보드: 모든 채널의 영상을 한 화면에서 본다. 필터·선택 상태는 Board 가 주소 쿼리로 들고 있다.
export default function Home() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardData />
    </Suspense>
  );
}

async function BoardData() {
  const { channels, data } = await getAllChannelData();
  if (!channels.length) redirect("/channels/new");
  return <Board channels={channels} data={data} today={kstDate()} now={kstNowLabel()} />;
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="flex flex-col">
      <div className="h-[53px] border-b border-line bg-bar" />
      <div className="flex">
        <div className="hidden h-[calc(100dvh-53px)] w-[232px] border-r border-line bg-bar lg:block" />
        <div className="flex flex-auto gap-2.5 p-5">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-96 flex-1 rounded-[10px] bg-bar" />)}
        </div>
      </div>
    </div>
  );
}
