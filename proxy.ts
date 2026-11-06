import { NextResponse, type NextRequest } from "next/server";

// 배포된 웹 UI에 Basic Auth 를 건다. APP_PASSWORD 가 없으면(로컬 개발) 통과.
// /api/mcp 는 자체 Bearer 토큰을 쓰므로 matcher 에서 제외한다.

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given === password) return NextResponse.next();
  }
  return new NextResponse("인증이 필요합니다", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="upload-map", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!api/mcp|\\.well-known|_next/static|_next/image|favicon.ico).*)"],
};
