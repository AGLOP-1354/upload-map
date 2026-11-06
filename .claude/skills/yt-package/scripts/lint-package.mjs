#!/usr/bin/env node
// 제목(+썸네일 문구) 결정적 린터. 감각 판단은 하지 않는다.
// 사용: node lint-package.mjs --thumb "썸네일 문구" "제목1" "제목2" ...
// 규칙 근거: 데스크톱 ~60자, 모바일 피드 ~40자에서 잘림, 100자 하드 리밋.
// 한글은 라틴 문자보다 폭이 넓어 실제 잘림이 더 빠르다 → 한글 1자 = 1.7 폭 단위로 환산해 경고.

const args = process.argv.slice(2);
let thumb;
const titles = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--thumb") thumb = args[++i];
  else titles.push(args[i]);
}
if (titles.length === 0) {
  console.error('usage: node lint-package.mjs [--thumb "문구"] "제목" ...');
  process.exit(1);
}

const hangul = /[가-힣ㄱ-ㅎㅏ-ㅣ]/g;
const emoji = /\p{Extended_Pictographic}/gu;
const width = (s) => {
  const h = (s.match(hangul) || []).length;
  return Math.round(h * 1.7 + (s.length - h));
};
const tokens = (s) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length >= 2);

function lintTitle(t) {
  const issues = [];
  const notes = [];
  const len = [...t].length;
  const w = width(t);
  if (len > 100) issues.push(`100자 초과(${len}) — 업로드 불가`);
  if (w > 60) issues.push(`표시 폭 ${w} > 60 — 데스크톱에서 잘림`);
  else if (w > 40) notes.push(`표시 폭 ${w} > 40 — 모바일 피드에서 뒷부분 잘림. 앞 40폭에 클릭 이유가 있는지 확인`);
  if (len < 20) notes.push(`${len}자 — 너무 짧으면 검색 맥락이 부족할 수 있음`);
  const colon = t.search(/[:|\-–—]/);
  if (colon > 0 && width(t.slice(0, colon)) > 40) notes.push("구분자(: | -) 앞부분이 40폭 초과 — 핵심어를 앞으로");
  const caps = (t.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (caps > 2) issues.push(`대문자 단어 ${caps}개 — 최대 2개`);
  const em = (t.match(emoji) || []).length;
  if (em > 1) issues.push(`이모지 ${em}개 — 최대 1개`);
  if (!/\d/.test(t) && !/[A-Z][a-z]+/.test(t)) notes.push("숫자·고유명사 없음 — 구체성 신호 추가 고려");
  if (/(!{2,}|\?{2,})/.test(t)) issues.push("느낌표/물음표 반복");
  if (/(#|\btag\b)/i.test(t)) notes.push("해시태그는 제목보다 설명란에");
  if (thumb) {
    const tt = new Set(tokens(thumb));
    const overlap = [...new Set(tokens(t).filter((x) => tt.has(x)))];
    const words = overlap.filter((x) => !/^\d+$/.test(x));
    const nums = overlap.filter((x) => /^\d+$/.test(x));
    if (words.length) issues.push(`썸네일 문구와 단어 중복: ${words.join(", ")} — 다른 단어로 같은 약속`);
    if (nums.length) notes.push(`숫자 ${nums.join(", ")} 가 제목·썸네일 양쪽에 있음 — 의도한 강조인지 확인`);
  }
  return { title: t, chars: len, displayWidth: w, pass: issues.length === 0, issues, notes };
}

const out = { titles: titles.map(lintTitle) };
if (thumb) {
  const n = thumb.trim().split(/\s+/).length;
  out.thumbnail = {
    text: thumb,
    words: n,
    issues: n > 3 ? [`썸네일 문구 ${n}어절 — 3어절 이하 권장`] : [],
  };
}
console.log(JSON.stringify(out, null, 2));
