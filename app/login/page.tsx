import type { Metadata } from "next";
import { Suspense } from "react";
import { LockIcon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인 · 업로드맵" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 px-4 py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-13 items-center justify-center rounded-[14px] border border-line-strong bg-panel">
          <LockIcon className="size-6.5 text-accent" />
        </div>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight">업로드맵</h1>
        <p className="text-[13px] text-muted">채널 계획 · 제작 진행 · 업로드 일정</p>
      </div>

      <Suspense fallback={<div className="h-[340px] w-full max-w-[380px] rounded-2xl border border-line bg-panel" />}>
        <LoginForm />
      </Suspense>

      <p className="max-w-[380px] text-center text-xs leading-relaxed text-muted">
        개인용 앱입니다. 계정은 서버 환경변수로만 관리하며 가입·비밀번호 찾기는 없습니다.
      </p>
    </main>
  );
}
