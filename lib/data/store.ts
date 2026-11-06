import "server-only";
import { fsStore } from "./store-fs";
import { githubStore } from "./store-github";

// 저장 백엔드 공통 인터페이스. 경로는 저장소 루트 기준 상대 경로(예: "data/videos.json").

export interface Snapshot {
  /** 읽은 시점의 리비전. github = 커밋 sha, fs = "local" */
  rev: string;
  /** 경로 → 내용. 파일이 없으면 null */
  files: Record<string, string | null>;
}

export type CommitResult = { ok: true; rev: string } | { ok: false; reason: "conflict" };

export interface Store {
  readonly kind: "fs" | "github";
  read(paths: string[]): Promise<Snapshot>;
  /** baseRev 위에 changes 를 한 번에 반영. 그 사이 다른 변경이 있으면 conflict */
  commit(baseRev: string, changes: Record<string, string>, message: string): Promise<CommitResult>;
}

export function getStore(): Store {
  return process.env.DATA_STORE === "github" ? githubStore() : fsStore();
}
