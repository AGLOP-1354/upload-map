// 세션 토큰 서명·검증. proxy.ts 와 Server Action 이 함께 쓴다(Web Crypto 만 사용).
// 토큰 = "<만료ms>.<HMAC-SHA256(SESSION_SECRET, ADMIN_ID + '.' + 만료ms)>"

export const SESSION_COOKIE = "um_session";
export const LONG_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET 이 없거나 32자 미만입니다 (.env.local)");
  return s;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

// 길이가 같을 때 모든 글자를 비교(조기 종료로 시간 차가 생기지 않게).
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export async function createSessionToken(ttlMs: number): Promise<{ token: string; expires: Date }> {
  const exp = Date.now() + ttlMs;
  const sig = await sign(`${process.env.ADMIN_ID}.${exp}`);
  return { token: `${exp}.${sig}`, expires: new Date(exp) };
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.ADMIN_ID) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(sig, await sign(`${process.env.ADMIN_ID}.${exp}`));
}
