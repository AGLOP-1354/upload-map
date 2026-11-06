import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Store } from "./store";

// 로컬 개발용. 프로젝트 루트의 data/·content/ 를 직접 읽고 쓴다.
// 배포에서는 github 저장소를 쓰므로 파일 추적에서 제외한다(turbopackIgnore).

export function fsStore(root = process.cwd()): Store {
  return {
    kind: "fs",
    async read(paths) {
      const entries = await Promise.all(
        paths.map(async (p) => {
          try {
            return [p, await readFile(path.join(/* turbopackIgnore: true */ root, p), "utf8")] as const;
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") return [p, null] as const;
            throw e;
          }
        }),
      );
      return { rev: "local", files: Object.fromEntries(entries) };
    },
    async commit(_baseRev, changes) {
      for (const [p, content] of Object.entries(changes)) {
        const abs = path.join(/* turbopackIgnore: true */ root, p);
        await mkdir(path.dirname(abs), { recursive: true });
        const tmp = `${abs}.tmp`;
        await writeFile(tmp, content, "utf8");
        await rename(tmp, abs);
      }
      return { ok: true, rev: "local" };
    },
  };
}
