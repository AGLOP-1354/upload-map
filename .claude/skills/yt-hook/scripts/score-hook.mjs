#!/usr/bin/env node
// 훅 문장 휴리스틱 채점기 (한/영). 결정적 체크만 한다 — 최종 판단은 사람.
// 사용: node score-hook.mjs "훅 문장" ["훅 문장2" ...]   또는 stdin에 줄 단위로.
// 점수: 5개 속성 각 0~100, 종합 = 평균 60% + 최약 속성 40%.
// 등급: STRONG ≥72, WORKABLE ≥55, 그 외 WEAK.
// 아이디어 출처: Jakeschincariol/youtube-agent-skill 의 hookscore (재구현, 가중치 단순화).

import { readFileSync } from "node:fs";

const has = (re, s) => (s.match(re) || []).length;

const RE = {
  number: /\d[\d,.]*\s*(%|퍼센트|원|만|억|천|배|시간|분|초|일|주|개월|년|명|개|kg|km|\$|k\b|x\b)?/gi,
  proper: /\b[A-Z][a-zA-Z]+\b|[「『"'][^"'」』]+["'」』]/g,
  concrete: /(직접|실제로|테스트|해봤|만들었|측정|비교|영수증|결과|before|after|tested|built|measured|spent)/gi,
  address: /(당신|여러분|너는|너도|네가|니가|you|your)/gi,
  stakes: /(손해|실수|망하|망치|날리|잃|버리|위험|경고|후회|낭비|놓치|더 내|비싸|속고|모르고|절대|mistake|los(e|ing|t)|waste|wrong|risk|never|stop|overpay)/gi,
  curiosity: /(\?|하지만|그런데|근데|사실은|의외|아무도|몰랐|진짜 이유|진실|정체|비밀|왜|but|yet|actually|nobody|secret|why|turns out)/gi,
  selfIntro: /^(안녕하세요|안녕|오늘은|이번 영상|제 이름|저는 .*입니다|hi|hey guys|welcome|in this video|today)/i,
  vague: /(정말|진짜 대박|엄청|여러 가지|다양한|최고의|amazing|incredible|lots of|various)/gi,
};

function words(s) {
  return s.trim().split(/\s+/).filter(Boolean);
}

function score(text) {
  const t = text.trim();
  const w = words(t).length;
  const isKo = /[가-힣]/.test(t);
  // 한국어는 어절이 길어서 영어 9~24단어 ≈ 6~16어절로 본다.
  const [lo, hi] = isKo ? [6, 16] : [9, 24];

  const specificity = Math.min(100,
    25 + has(RE.number, t) * 30 + has(RE.proper, t) * 15 + has(RE.concrete, t) * 15 - has(RE.vague, t) * 15);
  const address = Math.min(100, 35 + has(RE.address, t) * 35);
  const stakes = Math.min(100, 40 + has(RE.stakes, t) * 30 + (has(RE.number, t) ? 10 : 0));
  const curiosity = Math.min(100, 40 + has(RE.curiosity, t) * 30);
  let brevity = w >= lo && w <= hi ? 100 : w < lo ? Math.max(0, 100 - (lo - w) * 15) : Math.max(0, 100 - (w - hi) * 10);

  const props = { specificity, address, stakes, curiosity, brevity };
  for (const k in props) props[k] = Math.max(0, Math.round(props[k]));

  const vals = Object.values(props);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const weakest = Math.min(...vals);
  let total = Math.round(mean * 0.6 + weakest * 0.4);

  const flags = [];
  if (RE.selfIntro.test(t)) { flags.push("자기소개/인사로 시작함 — 훅 아님"); total = Math.min(total, 40); }
  if (has(/[.!?。]/g, t.replace(/[.!?。]$/, "")) >= 2) flags.push("한 훅에 문장이 3개 이상 — 아이디어 하나로 줄이기");

  const band = total >= 72 ? "STRONG" : total >= 55 ? "WORKABLE" : "WEAK";
  const weakestKey = Object.entries(props).sort((a, b) => a[1] - b[1])[0][0];
  return { text: t, total, band, words: w, weakest: weakestKey, props, flags };
}

let inputs = process.argv.slice(2);
if (inputs.length === 0) {
  try { inputs = readFileSync(0, "utf8").split("\n").map((s) => s.trim()).filter(Boolean); } catch { /* no stdin */ }
}
if (inputs.length === 0) {
  console.error('usage: node score-hook.mjs "hook text" ...');
  process.exit(1);
}
const results = inputs.map(score).sort((a, b) => b.total - a.total);
console.log(JSON.stringify(results, null, 2));
