import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// 로그인하지 않았으면 /login 으로. 로그인 상태로 /login 에 오면 / 로.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return ok ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!ok) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
