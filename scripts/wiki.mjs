#!/usr/bin/env node
// LLM Wiki 도구 (Karpathy "LLM Wiki" 패턴, 현재 상태 전용 — 히스토리/로그 없음)
//
//   node scripts/wiki.mjs gen              코드에서 기계적으로 추출 가능한 페이지(wiki/generated/*, wiki/index.md) 재생성
//   node scripts/wiki.mjs check            린트: 서술 페이지의 근거(sources) 해시, 인용 경로/라인, 커버리지 검증
//   node scripts/wiki.mjs stamp <page...>  서술 페이지를 코드와 대조·수정한 뒤 verified 해시 갱신 (--all 가능)
//   node scripts/wiki.mjs hook-post|hook-stop|hook-start   Claude Code 훅 진입점
//
// 외부 의존성 없음. 규칙 정의는 AGENTS.md 의 "LLM Wiki" 섹션 참고.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIKI = "wiki";
const GEN = `${WIKI}/generated`;

// 커버리지/해시 대상에서 제외하는 파일. 런타임 데이터(data/**)는 자주 바뀌므로 근거가 아니다 — 스키마를 정의한 코드가 근거다.
const NON_SOURCE = [
  `${WIKI}/**`,
  "**/*.md",
  "package-lock.json",
  ".gitignore",
  "data/**",
  "public/**",
  "**/*.ico",
  "**/*.svg",
  "**/*.png",
  "**/*.jpg",
  "**/*.webp",
];
const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|mts|cts)$/;

// ---------- 유틸 ----------
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const globRe = (g) =>
  new RegExp(
    "^" +
      g
        .split("**/")
        .map((part) =>
          part
            .split("**")
            .map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]"))
            .join(".*"),
        )
        .join("(?:.*/)?") +
      "$",
  );
const matchAny = (p, globs) => globs.some((g) => globRe(g).test(p));

function listFiles() {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return [...new Set(out.split("\0").filter(Boolean))].filter((f) => existsSync(join(ROOT, f))).sort();
}

function isText(p) {
  const buf = readFileSync(join(ROOT, p));
  return !buf.subarray(0, 8000).includes(0);
}

// ---------- frontmatter (최소 YAML 부분집합) ----------
function parsePage(path) {
  const text = read(path);
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = { sources: [] };
  if (!m) return { meta, body: text, hasFm: false, text };
  let key = null;
  for (const line of m[1].split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) {
      meta[key].push(item[1].trim());
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const v = kv[2].trim();
    if (v === "" || v === "[]") meta[key] = [];
    else meta[key] = v;
  }
  if (!Array.isArray(meta.sources)) meta.sources = [];
  return { meta, body: text.slice(m[0].length), hasFm: true, text };
}

function resolveSources(globs, files) {
  const set = new Set();
  const missing = [];
  for (const g of globs) {
    const hit = files.filter((f) => f === g || (/[*?]/.test(g) && globRe(g).test(f)));
    if (hit.length === 0) missing.push(g);
    hit.forEach((f) => set.add(f));
  }
  return { resolved: [...set].sort(), missing };
}

function sourcesHash(resolved) {
  const h = createHash("sha256");
  for (const f of resolved) h.update(f + "\0" + read(f) + "\0");
  return h.digest("hex").slice(0, 16);
}

function narrativePages() {
  const dir = join(ROOT, WIKI);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "index.md")
    .map((f) => `${WIKI}/${f}`)
    .sort();
}

// ---------- 생성 페이지 ----------
const HEADER = (src) =>
  `<!-- 자동 생성 파일: \`node scripts/wiki.mjs gen\`. 직접 수정 금지. 근거: ${src} -->\n\n`;

function codeFacts(file) {
  const lines = read(file).split("\n");
  const exports = [];
  let directive = "";
  const first = lines.find((l) => l.trim() !== "" && !l.trim().startsWith("//"));
  const d = first?.match(/^\s*["'](use client|use server|use cache)["']/);
  if (d) directive = d[1];
  lines.forEach((l, i) => {
    let m = l.match(/^export\s+(default\s+)?(?:async\s+)?(function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/);
    if (m) return exports.push({ name: (m[1] ? "default " : "") + m[3], kind: m[2], line: i + 1 });
    m = l.match(/^export\s+default\s+([A-Za-z_$][\w$]*)/);
    if (m) return exports.push({ name: "default " + m[1], kind: "value", line: i + 1 });
    m = l.match(/^export\s+(?:type\s+)?\{([^}]*)\}/);
    if (m) return exports.push({ name: `{${m[1].trim()}}`, kind: "re-export", line: i + 1 });
  });
  return { lines: lines.length - (lines.at(-1) === "" ? 1 : 0), exports, directive };
}

function genFiles(files) {
  const src = files.filter((f) => !matchAny(f, NON_SOURCE) && isText(f));
  let md = HEADER("git 추적 파일 + 미추적(비-ignore) 파일") + "# 파일 맵\n\n";
  md += "위키 근거 대상 파일 전체 목록. 코드 파일은 export 심볼과 라인을 함께 표시한다.\n\n";
  md += "| 파일 | 라인 | 지시어 | export |\n|---|---:|---|---|\n";
  for (const f of src) {
    const href = `../../${f}`;
    if (CODE_EXT.test(f)) {
      const { lines, exports, directive } = codeFacts(f);
      const ex = exports.map((e) => `[\`${e.name}\`](${href}#L${e.line}) (${e.kind})`).join("<br>") || "-";
      md += `| [${f}](${href}) | ${lines} | ${directive || "-"} | ${ex} |\n`;
    } else {
      md += `| [${f}](${href}) | ${read(f).split("\n").length} | - | - |\n`;
    }
  }
  const excluded = files.filter((f) => matchAny(f, NON_SOURCE) && !f.startsWith(WIKI + "/"));
  md += `\n## 근거 대상 제외 파일\n\n규칙(\`NON_SOURCE\` in [scripts/wiki.mjs](../../scripts/wiki.mjs))에 의해 제외: ${
    excluded.map((f) => `\`${f}\``).join(", ") || "없음"
  }\n`;
  return md;
}

const ROUTE_FILE = /^app\/(.*\/)?(page|layout|route|loading|error|global-error|not-found|template|default)\.(tsx?|jsx?)$/;
function genRoutes(files) {
  const rows = [];
  for (const f of files) {
    const m = f.match(ROUTE_FILE);
    if (!m) continue;
    const segs = (m[1] || "").split("/").filter(Boolean);
    if (segs.some((s) => s.startsWith("_"))) continue; // private folder
    const url = "/" + segs.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@")).join("/");
    let extra = "";
    if (m[2] === "route") {
      const methods = [...read(f).matchAll(/export\s+(?:async\s+function|const|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((x) => x[1]);
      extra = methods.join(", ");
    }
    rows.push({ url, kind: m[2], f, extra });
  }
  rows.sort((a, b) => a.url.localeCompare(b.url) || a.kind.localeCompare(b.kind));
  let md = HEADER("app/ 디렉터리의 Next.js 파일 컨벤션") + "# 라우트\n\n";
  if (rows.length === 0) return md + "라우트 파일 없음.\n";
  md += "| URL | 종류 | 파일 | HTTP 메서드 |\n|---|---|---|---|\n";
  for (const r of rows) md += `| \`${r.url}\` | ${r.kind} | [${r.f}](../../${r.f}) | ${r.extra || "-"} |\n`;
  return md;
}

function genPackage() {
  const pkg = JSON.parse(read("package.json"));
  let lock = {};
  try {
    lock = JSON.parse(read("package-lock.json")).packages || {};
  } catch {}
  const ver = (n) => lock[`node_modules/${n}`]?.version || "-";
  let md = HEADER("package.json, package-lock.json") + "# 패키지\n\n";
  md += `- 이름: \`${pkg.name}\` / 버전: \`${pkg.version}\` / private: \`${!!pkg.private}\`\n\n`;
  md += "## 스크립트\n\n| 이름 | 명령 |\n|---|---|\n";
  for (const [k, v] of Object.entries(pkg.scripts || {})) md += `| \`${k}\` | \`${v}\` |\n`;
  for (const [title, deps] of [["dependencies", pkg.dependencies], ["devDependencies", pkg.devDependencies]]) {
    md += `\n## ${title}\n\n| 패키지 | 선언 | lock 버전 |\n|---|---|---|\n`;
    for (const [k, v] of Object.entries(deps || {})) md += `| \`${k}\` | \`${v}\` | \`${ver(k)}\` |\n`;
  }
  return md;
}

function genIndex(generated) {
  let md = HEADER("wiki/*.md frontmatter") + "# Wiki 인덱스\n\n";
  md += "이 위키는 코드의 **현재 상태**만 기술한다. 규칙은 [AGENTS.md](../AGENTS.md)의 \"LLM Wiki\" 섹션. 질문에 답할 때 이 파일에서 시작한다.\n\n";
  md += "## 서술 페이지 (LLM 유지)\n\n| 페이지 | 요약 |\n|---|---|\n";
  for (const p of narrativePages()) {
    const { meta } = parsePage(p);
    md += `| [${meta.title || p}](${p.slice(WIKI.length + 1)}) | ${meta.summary || "-"} |\n`;
  }
  md += "\n## 생성 페이지 (스크립트 유지)\n\n";
  for (const [name, title] of generated) md += `- [${title}](generated/${name})\n`;
  return md;
}

function buildGenerated() {
  const files = listFiles();
  const gen = [
    ["files.md", "파일 맵 — 파일·라인 수·export 심볼", genFiles(files)],
    ["routes.md", "라우트 — app/ 파일 컨벤션 기반 URL", genRoutes(files)],
    ["package.md", "패키지 — 스크립트·의존성·lock 버전", genPackage()],
  ];
  const out = new Map(gen.map(([n, , c]) => [`${GEN}/${n}`, c]));
  out.set(`${WIKI}/index.md`, genIndex(gen.map(([n, t]) => [n, t])));
  return out;
}

function gen() {
  mkdirSync(join(ROOT, GEN), { recursive: true });
  const changed = [];
  for (const [p, c] of buildGenerated()) {
    const abs = join(ROOT, p);
    if (!existsSync(abs) || readFileSync(abs, "utf8") !== c) {
      writeFileSync(abs, c);
      changed.push(p);
    }
  }
  return changed;
}

// ---------- 린트 ----------
function check() {
  const files = listFiles();
  const fileSet = new Set(files);
  const issues = [];
  const covered = new Set();

  for (const [p, c] of buildGenerated()) {
    if (!existsSync(join(ROOT, p)) || read(p) !== c) issues.push(`[generated] ${p} 가 코드와 다름 → \`node scripts/wiki.mjs gen\``);
  }

  for (const page of narrativePages()) {
    const { meta, body, hasFm } = parsePage(page);
    if (!hasFm) {
      issues.push(`[frontmatter] ${page}: frontmatter(title/summary/sources/verified) 없음`);
      continue;
    }
    for (const k of ["title", "summary"]) if (!meta[k]) issues.push(`[frontmatter] ${page}: \`${k}\` 없음`);
    const { resolved, missing } = resolveSources(meta.sources, files);
    missing.forEach((s) => issues.push(`[sources] ${page}: 근거 \`${s}\` 가 존재하지 않음 (삭제/이동 반영 필요)`));
    resolved.forEach((f) => covered.add(f));
    const h = resolved.length ? sourcesHash(resolved) : "none";
    if (meta.verified !== h)
      issues.push(`[stale] ${page}: 근거 코드가 변경됨 (${resolved.join(", ") || "근거 없음"}) → 코드 재확인·수정 후 \`node scripts/wiki.mjs stamp ${page}\``);

    // 인용 검증: [텍스트](상대경로#Lx-Ly)
    for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const href = m[1];
      if (/^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
      const [pathPart, frag] = href.split("#");
      const target = posix.normalize(posix.join(posix.dirname(page), pathPart));
      const abs = join(ROOT, target);
      if (!existsSync(abs)) {
        issues.push(`[ref] ${page}: 존재하지 않는 경로 \`${href}\``);
        continue;
      }
      if (fileSet.has(target) && !target.startsWith(WIKI + "/") && !resolved.includes(target) && !matchAny(target, NON_SOURCE))
        issues.push(`[ref] ${page}: \`${target}\` 를 인용하지만 sources 에 없음 (변경 감지 불가)`);
      const lm = frag?.match(/^L(\d+)(?:-L(\d+))?$/);
      if (lm) {
        const n = read(target).split("\n").length;
        const hi = Number(lm[2] || lm[1]);
        if (Number(lm[1]) < 1 || hi > n || hi < Number(lm[1])) issues.push(`[ref] ${page}: \`${href}\` 라인 범위가 파일(${n}줄) 밖`);
      }
    }
  }

  for (const f of files) {
    if (matchAny(f, NON_SOURCE) || !isText(f)) continue;
    if (!covered.has(f)) issues.push(`[coverage] \`${f}\` 를 근거로 삼는 서술 페이지 없음 → 기존 페이지 sources 에 추가하거나 새 페이지 작성`);
  }
  return issues;
}

function stamp(args) {
  const files = listFiles();
  const pages = args.includes("--all") ? narrativePages() : args;
  for (const page of pages) {
    const { meta, hasFm, text } = parsePage(page);
    if (!hasFm) throw new Error(`${page}: frontmatter 없음`);
    const { resolved, missing } = resolveSources(meta.sources, files);
    if (missing.length) throw new Error(`${page}: 존재하지 않는 sources ${missing.join(", ")}`);
    const h = resolved.length ? sourcesHash(resolved) : "none";
    const next = meta.verified !== undefined
      ? text.replace(/^(---\n[\s\S]*?\n)verified:.*\n/, `$1verified: ${h}\n`)
      : text.replace(/^---\n([\s\S]*?)\n---/, `---\n$1\nverified: ${h}\n---`);
    writeFileSync(join(ROOT, page), next);
    console.log(`stamped ${page} → ${h}`);
  }
  gen();
}

// ---------- 훅 ----------
function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

const REPORT = (issues) =>
  `LLM Wiki 가 코드 현재 상태와 맞지 않습니다 (${issues.length}건):\n` +
  issues.map((i) => `- ${i}`).join("\n") +
  `\n\n처리 방법: AGENTS.md 의 "LLM Wiki" 규칙에 따라 해당 코드를 직접 읽고 서술 페이지를 현재 상태로 고친 뒤 stamp 하세요. 히스토리는 쓰지 않습니다.`;

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "gen": {
    const c = gen();
    console.log(c.length ? `updated: ${c.join(", ")}` : "up to date");
    break;
  }
  case "check": {
    gen();
    const issues = check();
    if (issues.length) {
      console.error(REPORT(issues));
      process.exit(1);
    }
    console.log("wiki OK");
    break;
  }
  case "stamp":
    stamp(args);
    break;
  case "hook-post": {
    const input = readStdin();
    const fp = input.tool_input?.file_path || input.tool_response?.filePath || "";
    const rel = fp ? relative(ROOT, resolve(fp)) : "";
    if (rel && (rel.startsWith("..") || rel.startsWith(GEN) || rel === `${WIKI}/index.md`)) break;
    gen();
    break;
  }
  case "hook-stop": {
    const input = readStdin();
    gen();
    const issues = check();
    if (issues.length === 0) break;
    if (input.stop_hook_active) {
      // 한 번 막았는데도 해결되지 않음: 무한 루프 방지를 위해 통과시키고 사용자에게만 알린다.
      console.log(JSON.stringify({ systemMessage: `LLM Wiki 미해결 ${issues.length}건 — \`npm run wiki:check\` 로 확인` }));
      break;
    }
    console.error(REPORT(issues));
    process.exit(2);
    break;
  }
  case "hook-start": {
    gen();
    const issues = check();
    if (issues.length) console.log(REPORT(issues));
    break;
  }
  default:
    console.error("usage: wiki.mjs gen | check | stamp <page...>|--all | hook-post | hook-stop | hook-start");
    process.exit(1);
}
