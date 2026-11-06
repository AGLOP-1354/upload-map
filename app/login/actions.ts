"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LONG_SESSION_MS,
  SESSION_COOKIE,
  SHORT_SESSION_MS,
  createSessionToken,
  safeEqual,
} from "@/lib/session";

export type LoginState = { error?: string; tries?: number; id?: string };

const MAX_TRIES = 5;
const LOCK_MS = 60_000;
// 1인용 앱이라 시도 횟수는 프로세스 메모리 하나로 센다(서버 재시작 시 초기화).
const attempts = { count: 0, lockedUntil: 0 };

function safeNext(raw: FormDataEntryValue | null): string {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const now = Date.now();
  if (attempts.lockedUntil > now) {
    const sec = Math.ceil((attempts.lockedUntil - now) / 1000);
    return { error: `로그인 시도가 너무 많습니다. ${sec}초 뒤에 다시 시도하세요.`, tries: MAX_TRIES };
  }

  const adminId = process.env.ADMIN_ID;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminId || !adminPw || !process.env.SESSION_SECRET) {
    return { error: "서버에 ADMIN_ID / ADMIN_PASSWORD / SESSION_SECRET 이 설정되지 않았습니다 (.env.local)." };
  }

  const id = String(formData.get("id") ?? "");
  const pw = String(formData.get("password") ?? "");
  const idOk = safeEqual(id, adminId);
  const pwOk = safeEqual(pw, adminPw);
  if (!(idOk && pwOk)) {
    attempts.count += 1;
    if (attempts.count >= MAX_TRIES) {
      attempts.count = 0;
      attempts.lockedUntil = now + LOCK_MS;
      return { error: "5회 틀려 1분 동안 잠겼습니다.", tries: MAX_TRIES, id };
    }
    return { error: "아이디 또는 비밀번호가 맞지 않습니다.", tries: attempts.count, id };
  }

  attempts.count = 0;
  const remember = formData.get("remember") === "on";
  const { token, expires } = await createSessionToken(remember ? LONG_SESSION_MS : SHORT_SESSION_MS);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 유지하지 않으면 브라우저 세션 쿠키(토큰 자체는 12시간 뒤 만료)
    ...(remember ? { expires } : {}),
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
