// Finds the best answer in the knowledge base for a visitor's question, entirely in the browser.
// BM25 keyword scoring over each entry's keys, example questions and answer, with light stemming
// and one-letter typo tolerance. No model, no server.

import { KB, EMAIL } from './kb.js';

const STOP = new Set(('a an the is are was were be been being am do does did done has have had he his him hes aman amans tripathi ' +
  'what which who whom whose how why when where can could would should will shall may might must to of in on at by for with ' +
  'about from into and or but if any some me my i im you your it its that this these those there their they them tell please ' +
  'give show let know does anything something thing things kind type much many very really just also ever yet so as than then ' +
  'get got like want experience computer s t').split(' '));

const MORE = /^(tell me )?(more|go on|continue|elaborate|details?|more details?|and\??|explain( more)?|expand|keep going)\W*$/i;
const GREET = /^(hi+|hey+|hello+|yo|hola|namaste|hii+|good (morning|afternoon|evening)|sup|what'?s up)\b[\s!.]*$/i;
const THANKS = /^(thanks?|thank you|thx|ty|great|cool|nice|awesome|ok(ay)?|got it|perfect)\b[\s!.]*$/i;
const TASK = /^(write|generate|create|solve|implement|debug|fix|translate|compose|code|calculate)\b/i;

const stem = (w) => {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

const tokens = (text) => text.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')      // résumé → resume
  .replace(/[^a-z0-9]+/g, ' ').split(' ')
  .filter((w) => w && !STOP.has(w)).map(stem);

// index: keys count three times, example questions twice, the answer once
const docs = KB.map((e) => {
  const tf = new Map();
  const add = (text, weight) => tokens(text).forEach((t) => tf.set(t, (tf.get(t) || 0) + weight));
  add(e.keys, 3); add(e.q.join(' '), 2); add(e.a, 1);
  let len = 0; tf.forEach((n) => { len += n; });
  return { e, tf, len };
});
const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
const df = new Map();
docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
const idf = (t) => Math.log(1 + (docs.length - df.get(t) + 0.5) / (df.get(t) + 0.5));
const vocab = [...df.keys()];

// words not in the index are matched to a known word one edit away ("glucotrac", "pyhton")
function oneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; }   // swapped letters
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
const fix = (t) => (df.has(t) || t.length < 5 ? t : vocab.find((v) => v.length >= 4 && oneEdit(t, v)) || t);

function rank(query) {
  const q = [...new Set(tokens(query).map(fix))].filter((t) => df.has(t));
  return docs.map((d) => {
    let score = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (f) score += idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / avgLen));
    }
    return { e: d.e, score };
  }).sort((x, y) => y.score - x.score);
}

const MIN_SCORE = 1.2;
const fallback = `I don't have an answer for that one. I can tell you about Aman's projects, experience, skills, education and how to reach him. For anything else, email him at [${EMAIL}](mailto:${EMAIL}).`;

let last = null;

// returns { text, stops }
export function answer(question) {
  const q = question.trim();
  if (GREET.test(q)) return { text: "Hi! Ask me anything about Aman's work, for example his projects, experience or skills.", stops: [] };
  if (THANKS.test(q)) return { text: 'Happy to help! Anything else you want to know about Aman?', stops: [] };
  if (MORE.test(q)) {
    if (last?.more) { const text = last.more; last = { ...last, more: null }; return { text, stops: last.stops }; }
    if (last) return { text: `That's the short version. Drive to the stop to see more, or email Aman at [${EMAIL}](mailto:${EMAIL}).`, stops: last.stops };
  }
  if (TASK.test(q) && !/\b(aman|he|his|him)\b/i.test(q)) return { text: fallback, stops: [] };
  if (/\bwhere\b.*\bfrom\b/i.test(q)) return pick(KB.find((e) => e.id === 'remote'));

  const best = rank(q)[0];
  if (!tokens(q).length && /\bexperience\b/i.test(q)) return pick(KB.find((e) => e.id === 'temple'));
  if (!tokens(q).length && /\b(aman|he|him|his|yourself)\b/i.test(q)) return pick(KB.find((e) => e.id === 'about'));
  if (!best || best.score < MIN_SCORE) return { text: fallback, stops: [] };
  return pick(best.e);
}

function pick(e) {
  last = e;
  return { text: e.a + (e.more ? '\n\nWant more? Ask "tell me more".' : ''), stops: e.stops };
}

// exposed for tests
export const _rank = rank;
