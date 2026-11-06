import "server-only";
import { fsStore } from "./store-fs";
import { githubStore } from "./store-github";

// 저장 백엔드 공통 인터페이스. 경로는 저장소 루트 기준 상대 경로(예: "data/channels.json").

export interface Snapshot {
  /** 읽은 시점의 리비전. github = 커밋 sha, fs = "local" */
  rev: string;
  /** 경로 → 내용(UTF-8 텍스트). 파일이 없으면 null */
  files: Record<string, string | null>;
}

export type CommitResult = { ok: true; rev: string } | { ok: false; reason: "conflict" };

/** 텍스트는 string, 이미지 같은 바이너리는 Uint8Array */
export type FileContent = string | Uint8Array;

export interface Store {
  readonly kind: "fs" | "github";
  read(paths: string[]): Promise<Snapshot>;
  /** 바이너리 파일 하나. 없으면 null */
  readBytes(path: string): Promise<Uint8Array | null>;
  /** baseRev 위에 changes 를 한 번에 반영. 그 사이 다른 변경이 있으면 conflict */
  commit(baseRev: string, changes: Record<string, FileContent>, message: string): Promise<CommitResult>;
}

export function getStore(): Store {
  return process.env.DATA_STORE === "github" ? githubStore() : fsStore();
}
