// Shared runtime: theme, pause, one animation loop, canvas helpers.

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const state = { paused: reducedMotion };

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

// ---------- colours (read from CSS tokens per element, refreshed on theme change) ----------
export function withAlpha(color, a) {
  if (color.startsWith('#') && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(',').map((x) => x.trim()); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
  return color;
}

// Each canvas can sit inside a card with its own --accent, so colours are read per element.
let palVersion = 0;
const palCache = new WeakMap();
export function palette(el = document.documentElement) {
  const hit = palCache.get(el);
  if (hit && hit.v === palVersion) return hit.p;
  const s = getComputedStyle(el);
  const v = (n) => s.getPropertyValue(n).trim();
  const accent = v('--accent');
  const p = {
    bg: v('--bg'), raised: v('--bg-raised'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'),
    line: v('--line'), raw: v('--raw'), ghost: v('--ghost'), accent, accentSoft: withAlpha(accent, 0.14),
    ok: v('--ok'), warn: v('--warn'), bad: v('--bad'),
  };
  palCache.set(el, { v: palVersion, p });
  return p;
}

// ---------- maths ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- canvas ----------
export function fit(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  return { ctx, w: r.width, h: r.height };
}

// Draw a series with values roughly in [-1, 1] into a lane.
export function trace(ctx, arr, x, y, w, h, o = {}) {
  const { color = '#000', width = 1.5, from = 0, to = 1, amp = 0.42, alpha = 1, dash = null, offset = 0, count = arr.length } = o;
  if (alpha <= 0.001) return;
  const mid = y + h / 2, a = h * amp, n = count;
  const i0 = Math.floor(from * (n - 1)), i1 = Math.ceil(to * (n - 1));
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = i0; i <= i1; i++) {
    const v = typeof arr === 'function' ? arr(i) : arr[(i + offset) % arr.length];
    const px = x + (i / (n - 1)) * w, py = mid - clamp(v, -1.6, 1.6) * a;
    i === i0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------- animation loop ----------
const items = new Map();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const it = items.get(e.target);
    if (!it) continue;
    it.visible = e.isIntersecting;
    if (it.visible) it.dirty = true;
  }
}, { rootMargin: '120px' });

// draw(t, it) is called every frame while visible and not paused.
export function animate(el, draw, opts = {}) {
  const it = { el, draw, t: opts.t0 || 0, visible: false, dirty: true, live: !!opts.live };
  items.set(el, it);
  io.observe(el);
  return it;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  for (const it of items.values()) {
    if (!it.visible) continue;
    const running = !state.paused;
    if (running) it.t += dt;
    if (running || it.dirty || it.live) { it.draw(it.t, it); it.dirty = false; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export function redrawAll() { palVersion++; for (const it of items.values()) it.dirty = true; }
let rz;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(redrawAll, 80); });

// ---------- chrome: nav, theme, pause, reveal ----------
function effectiveTheme() {
  // Paper is the default; Scope only when the visitor picks it
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function initChrome() {
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('solid', scrollY > 30);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const themeBtn = document.getElementById('themeBtn');
  const themeLabel = document.getElementById('themeLabel');
  const syncTheme = () => {
    const t = effectiveTheme();
    if (themeLabel) themeLabel.textContent = t === 'dark' ? 'Scope' : 'Paper';
    if (themeBtn) themeBtn.title = t === 'dark' ? 'Switch to Paper (light)' : 'Switch to Scope (dark)';
  };
  syncTheme();
  themeBtn?.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
    syncTheme();
    redrawAll();
  });

  const pauseBtn = document.getElementById('pauseBtn');
  const syncPause = () => {
    if (!pauseBtn) return;
    pauseBtn.setAttribute('aria-pressed', String(state.paused));
    pauseBtn.title = state.paused ? 'Play signals' : 'Pause signals';
    pauseBtn.querySelector('.sr-only').textContent = pauseBtn.title;
    pauseBtn.querySelector('.i-pause').style.display = state.paused ? 'none' : '';
    pauseBtn.querySelector('.i-play').style.display = state.paused ? '' : 'none';
  };
  if (!reducedMotion && store.get('paused') === '1') state.paused = true;
  syncPause();
  pauseBtn?.addEventListener('click', () => {
    state.paused = !state.paused;
    store.set('paused', state.paused ? '1' : '0');
    syncPause();
  });

  const rio = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => rio.observe(el));
}
