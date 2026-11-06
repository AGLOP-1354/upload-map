#!/usr/bin/env node
// data/channels.json + data/<채널id>/*.json 을 읽어 진행 현황을 텍스트로 출력. 파일이 없어도 실패하지 않는다.
// 사용: node summary.mjs [프로젝트 루트] [채널 id]
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2] || process.cwd();
const wanted = process.argv[3]; // 채널 id (생략하면 첫 채널)
const load = async (...parts) => {
  const f = parts.join("/");
  try { return JSON.parse(await readFile(path.join(root, "data", ...parts), "utf8")); }
  catch (e) { return e.code === "ENOENT" ? null : { __error: `${f}: ${e.message}` }; }
};

const channelsFile = await load("channels.json");
if (channelsFile?.__error) console.log(`! 파싱 실패 ${channelsFile.__error}`);
const channels = channelsFile?.channels ?? [];
const channel = channels.find((c) => c.id === wanted) ?? channels[0];
if (!channel) {
  console.log("data/channels.json 에 채널이 없습니다 — 앱의 /channels/new 에서 먼저 등록하세요.");
  process.exit(0);
}
if (channels.length > 1) console.log(`채널 목록: ${channels.map((c) => c.id).join(", ")} (다른 채널: 인자로 id 전달)`);

const [videosFile, plansFile] = await Promise.all([load(channel.id, "videos.json"), load(channel.id, "plans.json")]);

for (const f of [videosFile, plansFile]) if (f?.__error) console.log(`! 파싱 실패 ${f.__error}`);

if (!videosFile || videosFile.__error) {
  console.log(`data/${channel.id}/videos.json 없음 — 아직 데이터가 없습니다.`);
  process.exit(0);
}

const ORDER = ["idea", "research", "scripting", "packaging", "filming", "editing", "ready", "scheduled", "published", "reviewed", "dropped"];
const videos = videosFile.videos ?? [];
const today = new Date().toISOString().slice(0, 10);

console.log(`채널: ${channel.name} (@${channel.handle}) | 영상 ${videos.length}개 | 오늘 ${today}`);
console.log("\n[단계별]");
for (const s of ORDER) {
  const vs = videos.filter((v) => v.status === s);
  if (vs.length) console.log(`- ${s} (${vs.length}): ${vs.map((v) => `${v.id}${v.format === "short" ? "[S]" : ""}`).join(", ")}`);
}

const active = videos.filter((v) => !["published", "reviewed", "dropped", "idea"].includes(v.status));
const overdue = active.filter((v) => v.targetPublishDate && v.targetPublishDate < today);
if (overdue.length) {
  console.log("\n[마감 지남]");
  for (const v of overdue) console.log(`- ${v.id} (${v.status}) 목표 ${v.targetPublishDate}`);
}

const needReview = videos.filter((v) => {
  if (v.status !== "published" || !v.publishedAt) return false;
  const days = (Date.now() - Date.parse(v.publishedAt)) / 864e5;
  const has = (d) => (v.metrics ?? []).some((m) => m.daysSincePublish === d);
  return (days >= 2 && !has(2)) || (days >= 7 && !has(7));
});
if (needReview.length) {
  console.log("\n[지표 기록 필요 (48h/7d)]");
  for (const v of needReview) console.log(`- ${v.id} 게시 ${v.publishedAt.slice(0, 10)}`);
}

const weeks = plansFile?.weeks ?? [];
const cur = weeks.filter((w) => w.weekOf <= today).sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
if (cur) {
  const done = cur.slots.filter((s) => s.done).length;
  console.log(`\n[이번 주 ${cur.weekOf}] ${done}/${cur.slots.length} 완료`);
  for (const s of cur.slots) console.log(`- [${s.done ? "x" : " "}] ${s.role}: ${s.videoId}${s.due ? ` (~${s.due})` : ""}`);
} else {
  console.log("\n[이번 주] 계획 없음");
}
