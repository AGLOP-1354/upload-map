import "server-only";
import type { Store } from "./store";

// 배포용. GitHub 브랜치를 원본으로 읽고, 변경 1회를 커밋 1개로 만든다(Git Data API).

const API = "https://api.github.com";

function config() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  // 브랜치는 기본값을 두지 않는다 — Vercel Production 브랜치와 어긋나면 엉뚱한 곳에 커밋된다.
  if (!token || !repo || !branch) throw new Error("GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH 환경 변수가 필요합니다");
  return { token, repo, branch };
}

async function gh(pathname: string, init: RequestInit & { accept?: string } = {}) {
  const { token } = config();
  const { accept, ...rest } = init;
  return fetch(`${API}${pathname}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`GitHub ${what} 실패: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function headSha(): Promise<string> {
  const { repo, branch } = config();
  const ref = await json<{ object: { sha: string } }>(
    await gh(`/repos/${repo}/git/ref/heads/${encodePath(branch)}`),
    "ref 조회",
  );
  return ref.object.sha;
}

/** rev 시점의 파일 원본. 없으면 null */
async function raw(p: string, rev: string): Promise<Response | null> {
  const { repo } = config();
  const res = await gh(`/repos/${repo}/contents/${encodePath(p)}?ref=${rev}`, {
    accept: "application/vnd.github.raw+json",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub 파일 읽기 실패(${p}): ${res.status} ${await res.text()}`);
  return res;
}

export function githubStore(): Store {
  return {
    kind: "github",
    async read(paths) {
      const rev = await headSha();
      const entries = await Promise.all(
        paths.map(async (p) => {
          const res = await raw(p, rev);
          return [p, res && (await res.text())] as const;
        }),
      );
      return { rev, files: Object.fromEntries(entries) };
    },
    async readBytes(p) {
      const res = await raw(p, await headSha());
      return res && new Uint8Array(await res.arrayBuffer());
    },
    async commit(baseRev, changes, message) {
      const { repo, branch } = config();
      const base = await json<{ tree: { sha: string } }>(
        await gh(`/repos/${repo}/git/commits/${baseRev}`),
        "커밋 조회",
      );
      // 텍스트는 tree 에 바로 싣고, 바이너리는 base64 blob 을 먼저 만든다.
      const entries = await Promise.all(
        Object.entries(changes).map(async ([p, content]) => {
          if (typeof content === "string") return { path: p, mode: "100644", type: "blob", content };
          const blob = await json<{ sha: string }>(
            await gh(`/repos/${repo}/git/blobs`, {
              method: "POST",
              body: JSON.stringify({ content: Buffer.from(content).toString("base64"), encoding: "base64" }),
            }),
            "blob 생성",
          );
          return { path: p, mode: "100644", type: "blob", sha: blob.sha };
        }),
      );
      const tree = await json<{ sha: string }>(
        await gh(`/repos/${repo}/git/trees`, {
          method: "POST",
          body: JSON.stringify({ base_tree: base.tree.sha, tree: entries }),
        }),
        "tree 생성",
      );
      const commit = await json<{ sha: string }>(
        await gh(`/repos/${repo}/git/commits`, {
          method: "POST",
          body: JSON.stringify({ message, tree: tree.sha, parents: [baseRev] }),
        }),
        "커밋 생성",
      );
      const res = await gh(`/repos/${repo}/git/refs/heads/${encodePath(branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      // fast-forward 가 아니면 422 — 그 사이 다른 커밋이 들어온 것
      if (res.status === 422) return { ok: false, reason: "conflict" };
      await json(res, "브랜치 갱신");
      return { ok: true, rev: commit.sha };
    },
  };
}
