#!/usr/bin/env node
// PostToolUse(Edit|Write) 훅.
// - data/**/*.json : JSON 파싱 + 최상위 형태 검사. 깨졌으면 exit 2 로 Claude에게 즉시 알림.
// - *.ts / *.tsx   : 해당 파일만 eslint. 에러가 있으면 exit 2.
// 그 외 파일은 아무것도 하지 않는다. 훅 자체 오류로 작업을 막지 않도록 예외는 exit 0.
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";

const fail = (msg) => { process.stderr.write(msg + "\n"); process.exit(2); };

let input;
try {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  input = JSON.parse(raw);
} catch { process.exit(0); }

const file = input?.tool_input?.file_path;
if (!file) process.exit(0);
// 워크트리에서도 맞게 동작하도록 CLAUDE_PROJECT_DIR 대신 stdin의 cwd 기준.
const root = input.cwd || process.cwd();
const rel = path.relative(root, path.resolve(root, file));
if (rel.startsWith("..")) process.exit(0);

if (/^data\/.*\.json$/.test(rel) && !rel.startsWith("data/backup/")) {
  let data;
  try { data = JSON.parse(await readFile(path.join(root, rel), "utf8")); }
  catch (e) { fail(`[data-check] ${rel} 가 유효한 JSON이 아닙니다: ${e.message}\n즉시 고치세요. 스키마: .claude/rules/data-layer.md`); }
  // data/channels.json, data/<채널id>/<이름>.json
  const base = rel === "data/channels.json" ? "channels.json" : (rel.match(/^data\/[a-z0-9-]+\/([a-z]+\.json)$/) ?? [])[1];
  const expect = { "channels.json": "channels", "videos.json": "videos", "plans.json": "weeks", "series.json": "series", "tasks.json": "tasks", "credits.json": "credits" }[base];
  if (expect && (!Array.isArray(data?.[expect]) || typeof data.version !== "number")) {
    fail(`[data-check] ${rel} 는 { "version": number, "${expect}": [...] } 형태여야 합니다.`);
  }
  if (base === "videos.json") {
    const ids = data.videos.map((v) => v.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) fail(`[data-check] videos.json id 중복: ${[...new Set(dup)].join(", ")}`);
    const STAGES = ["idea", "research", "scripting", "packaging", "filming", "editing", "scheduled", "published", "reviewed", "dropped"];
    const bad = data.videos.filter((v) => !STAGES.includes(v.status)).map((v) => `${v.id}:${v.status}`);
    if (bad.length) fail(`[data-check] 알 수 없는 status: ${bad.join(", ")} (허용: ${STAGES.join("|")})`);
  }
  process.exit(0);
}

if (/\.(ts|tsx)$/.test(rel) && !rel.startsWith("node_modules/")) {
  execFile("npx", ["--no-install", "eslint", "--no-warn-ignored", rel], { cwd: root, timeout: 60_000 }, (err, stdout, stderr) => {
    if (err && err.code === 1) fail(`[eslint] ${rel}\n${stdout}${stderr}`.trim());
    process.exit(0); // 통과 또는 eslint 실행 불가(코드 2 등) → 막지 않음
  });
} else {
  process.exit(0);
}
