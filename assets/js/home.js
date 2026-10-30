// Home page: the four-chapter journey and the work gallery.
// Each .chapter gets --p (0 → 1) from scroll; CSS turns that into tidying, dealing and painting.

import { initChrome, clamp, rng, reducedMotion } from './core.js';
import { mountAll } from './previews.js';

initChrome();
mountAll();

const svgNS = 'http://www.w3.org/2000/svg';
const chapters = [...document.querySelectorAll('.chapter')];
const journey = document.getElementById('journey');
const jmapLinks = [...document.querySelectorAll('#jmap a')];
const mobile = matchMedia('(max-width: 900px)');

// ---------- progress ----------
function chapterProgress(ch) {
  if (reducedMotion) return 1;
  if (!mobile.matches) {
    const span = ch.offsetHeight - innerHeight;
    // finish at 75% of the pinned distance, so the painted state holds before the chapter releases
    return span > 0 ? clamp(-ch.getBoundingClientRect().top / (span * 0.75)) : 1;
  }
  const s = ch.querySelector('.stage').getBoundingClientRect();
  return clamp((innerHeight * 0.92 - s.top) / (s.height * 0.8 + innerHeight * 0.15));
}
const local = (p, d, k) => clamp((p - d) * k);

// ---------- chapter 1: the pulse ribbon gets cleaner ----------
const ribbon = document.getElementById('ribbonPath');
const ribbonNoise = (() => {
  const r = rng(3), out = []; let v = 0;
  for (let i = 0; i <= 150; i++) { v = v * 0.6 + (r() - 0.5) * 2.2; out.push(v + Math.sin(i * 0.33) * 0.9); }
  return out;
})();
function drawRibbon(q) {
  if (!ribbon) return;
  let d = '';
  for (let i = 0; i <= 150; i++) {
    const x = (i / 150) * 300;
    const phase = (i % 25) / 25;
    const pulse = Math.exp(-Math.pow((phase - 0.3) / 0.08, 2)) - 0.35 * Math.exp(-Math.pow((phase - 0.52) / 0.1, 2));
    const y = 34 - pulse * 22 - ribbonNoise[i] * 9 * (1 - q);
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  ribbon.setAttribute('d', d);
}

// ---------- chapter 3: people, dropout curve, counters ----------
const setAttrs = (el, attrs) => Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));

const people = document.getElementById('people');
if (people) {
  for (let i = 0; i < 20; i++) {
    const c = document.createElementNS(svgNS, 'circle');
    setAttrs(c, { cx: 12 + (i % 10) * 19.5, cy: i < 10 ? 16 : 44, r: 6.5 });
    if (i >= 15) c.setAttribute('class', 'held');
    people.appendChild(c);
  }
  const box = document.createElementNS(svgNS, 'rect');
  setAttrs(box, { x: 100, y: 32, width: 104, height: 24, rx: 12, fill: 'none', stroke: 'var(--oc)', 'stroke-dasharray': '3 3' });
  people.appendChild(box);
}
const heldDots = people ? [...people.querySelectorAll('.held')] : [];

const dropout = document.getElementById('dropout');
if (dropout) {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    pts.push([4 + i * 6.2, 36 - Math.sin(i / 3.2) * 10 - Math.exp(-Math.pow((i - 14) / 2.4, 2)) * 16]);
  }
  const path = document.createElementNS(svgNS, 'path');
  setAttrs(path, {
    d: pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y.toFixed(1)).join(''),
    fill: 'none', stroke: 'var(--oc)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', opacity: 0.55,
  });
  dropout.appendChild(path);
  const dropped = new Set([2, 5, 9, 12, 16, 19, 22]); // 7 of 24, about 30%
  pts.forEach(([x, y], i) => {
    const c = document.createElementNS(svgNS, 'circle');
    setAttrs(c, { cx: x, cy: y.toFixed(1), r: 2.6, fill: dropped.has(i) ? 'var(--ink-3)' : 'var(--oc)' });
    if (dropped.has(i)) c.setAttribute('class', 'drop');
    dropout.appendChild(c);
  });
}

// ---------- chapter 4: a night of movement bars on the phone ----------
const bars = document.getElementById('shipBars');
if (bars) {
  const r = rng(9);
  for (let i = 0; i < 30; i++) {
    const b = document.createElement('i');
    const edge = i < 3 || i > 26;
    const hit = !edge && (i === 9 || i === 17 || i === 22);
    b.style.height = (edge ? 50 + r() * 50 : hit ? 45 + r() * 30 : 6 + r() * 10) + '%';
    if (hit) b.className = 'hit';
    bars.appendChild(b);
  }
}

// ---------- the loop: runs only when the page scrolls or resizes ----------
const lastP = new Map();
let ticking = false;

function update() {
  ticking = false;
  const mid = innerHeight * 0.5;
  let active = -1;

  chapters.forEach((ch, i) => {
    const p = chapterProgress(ch);
    if (lastP.get(ch) !== p) {
      lastP.set(ch, p);
      ch.style.setProperty('--p', p.toFixed(3));
      if (ch.id === 'ch-data') drawRibbon(local(p, 0, 2.2));
      if (ch.id === 'ch-eval') {
        const q2 = local(p, 0.17, 3);
        heldDots.forEach((dot, k) => dot.classList.toggle('lit', k !== 3 && q2 > 0.75));
        ch.querySelectorAll('[data-count-from]').forEach((el) => {
          const d = parseFloat(getComputedStyle(el.closest('.ecard')).getPropertyValue('--d')) || 0;
          const q = clamp((local(p, d, 3) - 0.3) / 0.7);
          const a = parseFloat(el.dataset.countFrom), b = parseFloat(el.dataset.countTo);
          el.textContent = (a + (b - a) * q).toFixed(+el.dataset.digits || 0);
        });
      }
    }
    if (ch.getBoundingClientRect().top <= mid) active = i;
  });

  const jr = journey.getBoundingClientRect();
  document.body.classList.toggle('in-journey', jr.top < mid && jr.bottom > mid);
  jmapLinks.forEach((a, i) => { a.classList.toggle('on', i === active); a.classList.toggle('done', i < active); });
}

const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
addEventListener('scroll', request, { passive: true });
addEventListener('resize', request);
mobile.addEventListener('change', request);
update();
