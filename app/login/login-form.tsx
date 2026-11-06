"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertIcon, EyeIcon } from "@/components/icons";
import { login, type LoginState } from "./actions";

const input =
  "h-[46px] w-full rounded-[10px] border bg-ink px-3.5 text-[15px] text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPw, setShowPw] = useState(false);
  const hasError = Boolean(state.error);

  return (
    <form
      action={action}
      className="flex w-full max-w-[380px] flex-col gap-[18px] rounded-2xl border border-line bg-panel p-7"
    >
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="uid" className="text-[13px] text-fg-2">아이디</label>
        <input id="uid" name="id" type="text" autoComplete="username" required key={state.id ?? ""} defaultValue={state.id} className={`${input} border-line-strong`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="upw" className="text-[13px] text-fg-2">비밀번호</label>
        <div className="relative">
          <input
            id="upw"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={hasError}
            aria-describedby={hasError ? "login-error" : undefined}
            className={`${input} pr-13 ${hasError ? "border-danger" : "border-line-strong"}`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={showPw}
            className="absolute top-px right-0.5 flex size-11 items-center justify-center text-muted hover:text-fg"
          >
            <EyeIcon className="size-[18px]" />
          </button>
        </div>
      </div>

      {hasError && (
        <div id="login-error" role="alert" className="flex items-start gap-2 rounded-[10px] bg-danger-wash px-3 py-2.5 text-[13px] text-danger-2">
          <AlertIcon className="mt-0.5 size-4 flex-none" />
          <span>
            {state.error}
            {state.tries && state.tries < 5 ? ` (${state.tries}/5 · 5회 틀리면 1분 잠금)` : ""}
          </span>
        </div>
      )}

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-fg-2">
        <input type="checkbox" name="remember" defaultChecked className="size-[18px] accent-accent" />
        이 기기에서 30일 동안 로그인 유지
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-[10px] bg-accent text-[15px] font-bold text-accent-ink hover:bg-accent-2 disabled:opacity-60"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
