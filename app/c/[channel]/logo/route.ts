import { readChannelLogo } from "@/lib/data";

// 채널 로고 이미지. proxy 가 로그인 여부를 먼저 확인한다.
export async function GET(_req: Request, ctx: RouteContext<"/c/[channel]/logo">) {
  const { channel } = await ctx.params;
  const logo = await readChannelLogo(channel);
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.bytes), {
    headers: { "content-type": logo.type, "cache-control": "private, max-age=300" },
  });
}
