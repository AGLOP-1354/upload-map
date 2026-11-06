import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");

// 채널 id 는 경로에 들어가므로 여기서 한 번 더 막는다.
export function assertChannelId(id: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error(`잘못된 채널 id: ${id}`);
  return id;
}

export function dataPath(...parts: string[]): string {
  const p = path.join(DATA_DIR, ...parts);
  if (!p.startsWith(DATA_DIR + path.sep)) throw new Error(`data/ 밖 경로: ${p}`);
  return p;
}

// 파일이 없으면 fallback. 파싱 실패는 그대로 던진다(데이터 유실 방지).
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
  return JSON.parse(raw) as T;
}

let queue: Promise<unknown> = Promise.resolve();

// 모든 쓰기(읽기-수정-쓰기 포함)를 한 줄로 세운다.
export function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

// tmp 작성 → rename 으로 원자적 교체. serialize 안에서 호출한다.
export async function writeNow(file: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

export function writeJsonNow(file: string, value: unknown): Promise<void> {
  return writeNow(file, JSON.stringify(value, null, 2) + "\n");
}

// 파일을 읽어 fn 으로 고친 뒤 원자적으로 쓴다. 결과(fn 반환값)를 돌려준다.
export function mutateJson<T, R>(file: string, fallback: T, fn: (data: T) => R): Promise<R> {
  return serialize(async () => {
    const data = await readJson(file, fallback);
    const result = fn(data);
    await writeJsonNow(file, data);
    return result;
  });
}
