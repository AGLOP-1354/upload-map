import { Suspense } from "react";
import { Dashboard } from "./dashboard";

export default function ChannelPage({ params, searchParams }: PageProps<"/c/[channel]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="flex flex-col">
      <div className="h-[69px] border-b border-line bg-bar" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-7 sm:px-8">
        <div className="h-16 rounded-xl bg-panel" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          <div className="h-44 rounded-2xl bg-panel" />
          <div className="h-44 rounded-2xl bg-panel" />
          <div className="h-44 rounded-2xl bg-panel" />
        </div>
        <div className="h-80 rounded-2xl bg-panel" />
      </div>
    </div>
  );
}
