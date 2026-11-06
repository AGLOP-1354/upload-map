import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Store } from "./store";

// 로컬 개발용. 프로젝트 루트의 data/·content/ 를 직접 읽고 쓴다.
// 경로 조립은 파일 추적에서 제외하고(turbopackIgnore), 배포 번들 포함은 next.config.ts 의 outputFileTracingIncludes 가 맡는다.

const ALLOWED = ["data", "content"];

// 경로에 사용자 입력(채널·영상 id)이 들어가므로 data/·content/ 밖으로 못 나가게 한 번 더 막는다.
function resolve(root: string, p: string): string {
  const abs = path.join(/* turbopackIgnore: true */ root, p);
  if (!ALLOWED.some((d) => abs.startsWith(path.join(root, d) + path.sep))) throw new Error(`data/·content/ 밖 경로: ${p}`);
  return abs;
}

async function readOrNull<T>(abs: string, read: (f: string) => Promise<T>): Promise<T | null> {
  try {
    return await read(abs);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export function fsStore(root = process.cwd()): Store {
  return {
    kind: "fs",
    async read(paths) {
      const entries = await Promise.all(
        paths.map(async (p) => [p, await readOrNull(resolve(root, p), (f) => readFile(f, "utf8"))] as const),
      );
      return { rev: "local", files: Object.fromEntries(entries) };
    },
    async readBytes(p) {
      const buf = await readOrNull(resolve(root, p), (f) => readFile(f));
      return buf && new Uint8Array(buf);
    },
    async commit(_baseRev, changes) {
      for (const [p, content] of Object.entries(changes)) {
        const abs = resolve(root, p);
        await mkdir(path.dirname(abs), { recursive: true });
        const tmp = `${abs}.${process.pid}.tmp`;
        await writeFile(tmp, content);
        await rename(tmp, abs);
      }
      return { ok: true, rev: "local" };
    },
  };
}
