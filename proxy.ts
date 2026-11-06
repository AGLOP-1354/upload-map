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

// /api/mcp 는 자체 Bearer 토큰(MCP_TOKEN)으로 인증하므로 제외한다.
// .well-known 은 MCP 클라이언트의 OAuth 탐색 요청이 /login 리다이렉트 대신 404 를 받게 제외한다.
export const config = {
  matcher: ["/((?!api/mcp|\\.well-known|_next/static|_next/image|favicon.ico).*)"],
};
