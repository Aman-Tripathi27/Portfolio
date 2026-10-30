// Live previews for each kind of signal. Real data where the project has it,
// clearly illustrative drawings where it doesn't (Temple sleep, molecules, VMD).

import { animate, fit, trace, palette, clamp, lerp, ease, easeOut, rng } from './core.js';

const dataUrl = (f) => new URL(`../data/${f}`, import.meta.url);
const cache = {};
export function load(name) {
  cache[name] ||= fetch(dataUrl(`${name}.json`)).then((r) => r.json());
  return cache[name];
}

function withAlpha(color, a) {
  // works for #rrggbb and rgba()/rgb()
  if (color.startsWith('#') && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(',').map((s) => s.trim()); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
  return color;
}

function label(ctx, text, x, y, color, align = 'left', size = 10.5) {
  ctx.save();
  ctx.font = `500 ${size}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

// ============================================================ PPG (real: WRIST s3_run)
export async function ppgCard(canvas, hud) {
  const d = await load('ppg');
  const n = d.clean.length;
  animate(canvas, (t) => {
    const { ctx, w, h } = fit(canvas); const c = palette();
    const cyc = t % 7;                                   // 0-3 raw, 3-4 morph, 4-6.4 clean, 6.4-7 back
    let m = cyc < 3 ? 0 : cyc < 4 ? ease(cyc - 3) : cyc < 6.4 ? 1 : 1 - ease((cyc - 6.4) / 0.6);
    if (hud) hud.textContent = m > 0.5 ? 'Cleaned' : 'Raw';
    const pad = 16, laneY = h * 0.2, laneH = h * 0.56;
    trace(ctx, d.raw, pad, laneY, w - pad * 2, laneH, { color: c.raw, width: 1, alpha: m * 0.6 });
    const mix = (i) => lerp(d.raw[i], d.clean[i], m);
    trace(ctx, mix, pad, laneY, w - pad * 2, laneH, { color: m > 0.5 ? c.accent : c.ink, width: 1.6, count: n });
    // reference beats (ECG) as ticks, detected peaks as dots when clean
    const by = h - 22;
    ctx.fillStyle = c.ink3;
    for (const b of d.beats) ctx.fillRect(pad + (b / d.seconds) * (w - pad * 2), by, 1, 8);
    label(ctx, 'ECG beats', pad, by - 9, c.ink3);
    if (m > 0.6) {
      ctx.fillStyle = c.accent; ctx.globalAlpha = (m - 0.6) / 0.4;
      for (const p of d.peaks) {
        const i = Math.round(p * d.fs), x = pad + (p / d.seconds) * (w - pad * 2);
        const y = laneY + laneH / 2 - clamp(d.clean[i], -1.6, 1.6) * laneH * 0.42;
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  });
}

// ============================================================ CGM (real: GlucoTrace report)
export async function cgmCard(canvas, hud) {
  const d = await load('cgm');
  const [query, ...nbrs] = d.days;
  animate(canvas, (t) => {
    const { ctx, w, h } = fit(canvas); const c = palette();
    const cyc = t % 11;
    const padL = 40, padR = 18, top = 44, bot = 30, pw = w - padL - padR, ph = h - top - bot;
    const lo = 60, hi = 220;
    const X = (hr) => padL + (hr / 24) * pw, Y = (g) => top + (1 - (g - lo) / (hi - lo)) * ph;
    // target range band 70-180
    ctx.fillStyle = c.accentSoft; ctx.fillRect(padL, Y(180), pw, Y(70) - Y(180));
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    for (const g of [70, 180]) { ctx.beginPath(); ctx.moveTo(padL, Y(g)); ctx.lineTo(padL + pw, Y(g)); ctx.stroke(); label(ctx, String(g), padL - 8, Y(g), c.ink3, 'right'); }
    for (const hr of [0, 6, 12, 18, 24]) label(ctx, `+${hr}h`, X(hr), h - 14, c.ink3, 'center');
    const fade = cyc > 10.2 ? 1 - (cyc - 10.2) / 0.8 : 1;
    // neighbours
    nbrs.forEach((day, k) => {
      const start = 3 + k * 0.7, a = clamp((cyc - start) / 0.6) * fade;
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a * (0.85 - k * 0.12); ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); day.forEach(([hr, g], i) => (i ? ctx.lineTo(X(hr), Y(g)) : ctx.moveTo(X(hr), Y(g)))); ctx.stroke(); ctx.restore();
    });
    // query draws in
    const p = easeOut(clamp(cyc / 2.6));
    const upto = Math.max(2, Math.floor(p * query.length));
    ctx.save(); ctx.globalAlpha = fade; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i < upto; i++) { const [hr, g] = query[i]; i ? ctx.lineTo(X(hr), Y(g)) : ctx.moveTo(X(hr), Y(g)); } ctx.stroke();
    const [hx, hg] = query[upto - 1]; ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(X(hx), Y(hg), 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (hud) {
      const k = Math.floor((cyc - 3) / 0.7);
      hud.textContent = cyc < 3 ? 'Encoding · 128 numbers' : k < 5 ? `Match ${k + 1} · cos ${d.sims[k].toFixed(3)}` : '5 nearest days';
    }
  });
}

// ============================================================ EEG (real: per-sensor artifact %)
const POS = {
  Fp1: [-0.3, -0.88], Fp2: [0.3, -0.88], AFz: [0, -0.7], F7: [-0.72, -0.52], F3: [-0.38, -0.47], Fz: [0, -0.44], F4: [0.38, -0.47], F8: [0.72, -0.52],
  FC5: [-0.62, -0.22], FC1: [-0.2, -0.22], FC2: [0.2, -0.22], FC6: [0.62, -0.22], C3: [-0.44, 0], Cz: [0, 0], C4: [0.44, 0],
  CP5: [-0.62, 0.23], CP1: [-0.2, 0.23], CP2: [0.2, 0.23], CP6: [0.62, 0.23], P7: [-0.72, 0.52], P3: [-0.38, 0.47], Pz: [0, 0.45], P4: [0.38, 0.47], P8: [0.72, 0.52],
  PO7: [-0.52, 0.74], PO3: [-0.24, 0.7], POz: [0, 0.7], PO4: [0.24, 0.7], PO8: [0.52, 0.74], O1: [-0.28, 0.9], Oz: [0, 0.93], O2: [0.28, 0.9],
};
export async function eegCard(canvas, hud) {
  const d = await load('eeg');
  const per = 2.6;
  animate(canvas, (t) => {
    const { ctx, w, h } = fit(canvas); const c = palette();
    const k = Math.floor(t / per) % 4, f = clamp(((t % per) - 0) / 0.7);
    const prev = (k + 3) % 4;
    if (hud) hud.textContent = `${d.speeds[k]} m/s · ${['stand', 'slow walk', 'fast walk', 'jog'][k]}`;
    const speed = parseFloat(d.speeds[k]);
    const bob = Math.sin(t * Math.PI * 2 * (1 + speed)) * speed * 1.6;
    const R = Math.min(w * 0.3, h * 0.36), cx = w * 0.5, cy = h * 0.54 + bob;
    // head
    ctx.strokeStyle = c.ink3; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R * 0.12, cy - R * 0.99); ctx.lineTo(cx, cy - R * 1.13); ctx.lineTo(cx + R * 0.12, cy - R * 0.99); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * R * 1.03, cy, R * 0.06, R * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); }
    let mean = 0;
    d.sensors.forEach((name, i) => {
      const [px, py] = POS[name] || [0, 0];
      const v = lerp(d.artifact[prev][i], d.artifact[k][i], ease(f));
      mean += v / d.sensors.length;
      const col = v < 15 ? c.ok : v < 40 ? c.warn : c.bad;
      const x = cx + px * R * 0.92, y = cy + py * R * 0.92;
      ctx.fillStyle = withAlpha(col, 0.18); ctx.beginPath(); ctx.arc(x, y, 6 + v / 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
    });
    if (w > 420) label(ctx, `${mean.toFixed(0)}% windows flagged`, 14, h - 16, c.ink3);
    // legend
    const lg = [['ok', c.ok], ['watch', c.warn], ['motion', c.bad]];
    lg.forEach(([t2, col], j) => {
      const sx = w - 14 - (3 - j) * 64;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx + 4, h - 16, 3, 0, 7); ctx.fill();
      label(ctx, t2, sx + 11, h - 16, c.ink3);
    });
  });
}

// ============================================================ Sleep night (illustrative)
function makeNight(seed) {
  const r = rng(seed), N = 240, act = [], hr = [], brief = [];
  const onset = 0.11, offset = 0.92;
  for (let i = 0; i < N; i++) {
    const x = i / N;
    let a;
    if (x < onset) a = 0.35 + r() * 0.6;
    else if (x > offset) a = 0.4 + r() * 0.6;
    else a = r() < 0.035 ? 0.35 + r() * 0.5 : r() * 0.06;
    if (x > onset && x < offset && a > 0.3) brief.push(i);
    act.push(a);
    const sleepDepth = x < onset || x > offset ? 0 : Math.sin(((x - onset) / (offset - onset)) * Math.PI) * 0.8 + 0.2 * Math.sin(x * 40);
    hr.push(0.55 - sleepDepth * 0.5 + (r() - 0.5) * 0.06);
  }
  return { N, act, hr, brief, onset, offset };
}
export function sleepCard(canvas, opts = {}) {
  const night = makeNight(opts.seed || 7);
  animate(canvas, (t) => {
    const { ctx, w, h } = fit(canvas); const c = palette();
    const cyc = t % 9;
    const reveal = easeOut(clamp(cyc / 4));
    const fade = cyc > 8.3 ? 1 - (cyc - 8.3) / 0.7 : 1;
    const pad = 18, top = 58, bot = 30, pw = w - pad * 2, ph = h - top - bot;
    const X = (i) => pad + (i / night.N) * pw;
    ctx.globalAlpha = fade;
    // time axis
    ['23:00', '01:00', '03:00', '05:00', '07:00'].forEach((s, j) => label(ctx, s, pad + (j / 4) * pw, h - 14, c.ink3, j === 0 ? 'left' : j === 4 ? 'right' : 'center'));
    // heart rate line (top half)
    const hrTop = top, hrH = ph * 0.42;
    ctx.strokeStyle = c.ink2; ctx.lineWidth = 1.3; ctx.beginPath();
    const upto = Math.floor(reveal * (night.N - 1));
    for (let i = 0; i <= upto; i++) { const y = hrTop + (1 - night.hr[i]) * hrH; i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); }
    ctx.stroke();
    label(ctx, 'HR from PPG', pad + 70, hrTop - 10, c.ink3);
    // accelerometer activity bars (bottom)
    const aBase = top + ph, aH = ph * 0.42, bw = Math.max(1, pw / night.N - 0.8);
    for (let i = 0; i <= upto; i++) {
      const isBrief = night.brief.includes(i);
      ctx.fillStyle = isBrief ? c.accent : c.raw;
      const bh = night.act[i] * aH;
      ctx.fillRect(X(i), aBase - bh, bw, bh);
    }
    label(ctx, 'Accelerometer activity', pad, aBase - aH - 8, c.ink3);
    // onset/offset markers snap in
    const mk = (frac, text, at) => {
      const a = clamp((cyc - at) / 0.5); if (a <= 0) return;
      const x = pad + frac * pw;
      ctx.save(); ctx.globalAlpha = a * fade; ctx.strokeStyle = c.accent; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, top - 4 - (1 - easeOut(a)) * 10); ctx.lineTo(x, aBase); ctx.stroke(); ctx.restore();
      ctx.globalAlpha = a * fade;
      label(ctx, text, x + (frac > 0.5 ? -6 : 6), top - 10, c.accent, frac > 0.5 ? 'right' : 'left');
      ctx.globalAlpha = fade;
    };
    if (reveal > night.onset) mk(night.onset, 'Onset', 1.2);
    if (reveal > night.offset) mk(night.offset, 'Offset', 4.2);
    // brief-movement rings
    const ringA = clamp((cyc - 4.6) / 0.6);
    if (ringA > 0) {
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2; ctx.globalAlpha = ringA * fade;
      for (const i of night.brief) { const y = aBase - night.act[i] * aH - 7; ctx.beginPath(); ctx.arc(X(i) + bw / 2, y, 4 + (1 - ringA) * 6, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  });
}

// ============================================================ Molecules (illustrative)
function ring(cx, cy, r, n, rot = 0) {
  return Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * Math.PI * 2) * r, cy + Math.sin(rot + (i / n) * Math.PI * 2) * r]);
}
function molecule(cx, cy, s, variant) {
  const nodes = ring(cx, cy, s, 6, Math.PI / 6), edges = [];
  for (let i = 0; i < 6; i++) edges.push([i, (i + 1) % 6]);
  const add = (from, dx, dy) => { nodes.push([nodes[from][0] + dx * s, nodes[from][1] + dy * s]); edges.push([from, nodes.length - 1]); return nodes.length - 1; };
  if (variant === 0) { const a = add(0, 0.9, 0.5); add(a, 0.9, -0.5); add(3, -0.9, -0.5); const b = add(4, 0, -1); add(b, 0.8, -0.5); }
  else { const r2 = ring(cx + s * 1.73, cy, s, 6, Math.PI / 6); const base = nodes.length; r2.forEach((p) => nodes.push(p)); for (let i = 0; i < 6; i++) edges.push([base + i, base + ((i + 1) % 6)]); edges.push([0, base + 2]); add(3, -0.9, 0.5); add(base + 1, 0, -1); }
  return { nodes, edges };
}
export function molCard(canvas) {
  animate(canvas, (t) => {
    const { ctx, w, h } = fit(canvas); const c = palette();
    const s = Math.min(w, h) * 0.085;
    const wob = (k) => Math.sin(t * 0.8 + k) * 3;
    const A = molecule(w * 0.24, h * 0.56 + wob(0), s, 0), B = molecule(w * 0.62, h * 0.52 + wob(2), s, 1);
    const draw = (m, hot) => {
      ctx.strokeStyle = c.ink3; ctx.lineWidth = 1.4;
      for (const [i, j] of m.edges) { ctx.beginPath(); ctx.moveTo(...m.nodes[i]); ctx.lineTo(...m.nodes[j]); ctx.stroke(); }
      m.nodes.forEach((p, i) => { ctx.fillStyle = i === hot ? c.accent : c.ink2; ctx.beginPath(); ctx.arc(p[0], p[1], i === hot ? 4.5 : 3.2, 0, Math.PI * 2); ctx.fill(); });
    };
    const ha = 1, hb = 4;
    draw(A, ha); draw(B, hb);
    // predicted link: dashed arc with travelling pulse
    const p0 = A.nodes[ha], p1 = B.nodes[hb];
    const mx = (p0[0] + p1[0]) / 2, my = Math.min(p0[1], p1[1]) - h * 0.28;
    const strength = 0.5 + 0.5 * Math.sin(t * 1.6);
    ctx.save(); ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 20; ctx.globalAlpha = 0.5 + strength * 0.5;
    ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(mx, my, ...p1); ctx.stroke(); ctx.restore();
    const u = (t * 0.45) % 1, q = (a, b, cc) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * cc;
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(q(p0[0], mx, p1[0]), q(p0[1], my, p1[1]), 4, 0, Math.PI * 2); ctx.fill();
    label(ctx, 'Drug A', w * 0.24, h - 18, c.ink3, 'center'); label(ctx, 'Drug B', w * 0.68, h - 18, c.ink3, 'center');
    label(ctx, 'Predicted interaction', mx, my - 2, c.accent, 'center');
  });
}

// ============================================================ VMD (illustrative decomposition)
export function vmdCard(canvas) {
  const N = 220;
  const modes = [
    (i) => Math.sin(i / N * Math.PI * 1.2) * 0.9,            // trend
    (i) => Math.sin(i / N * Math.PI * 2 * 4) * 0.8,           // seasonal
    (i) => Math.sin(i / N * Math.PI * 2 * 13 + 1) * 0.6,      // fast
    (i) => Math.sin(i / N * Math.PI * 2 * 29 + 2) * Math.sin(i / N * 9) * 0.5,
  ];
  const sum = (i) => (modes[0](i) + modes[1](i) * 0.5 + modes[2](i) * 0.35 + modes[3](i) * 0.3) * 0.75;
  animate(canvas, (t) => {
    const { ctx, w, h } = fit(canvas); const c = palette();
    const cyc = t % 8, split = ease(clamp((cyc - 1) / 2.2)), back = cyc > 7.2 ? ease((cyc - 7.2) / 0.8) : 0;
    const k = split * (1 - back);
    const pad = 16, top = 38, usable = h - top - 12, laneH = usable / 5;
    trace(ctx, sum, pad, top, w - pad * 2, laneH * 1.2, { color: c.ink, width: 1.6, count: N, amp: 0.45 });
    label(ctx, 'signal', w - pad, top + 6, c.ink3, 'right');
    modes.forEach((m, j) => {
      const y = lerp(top, top + laneH * (j + 1), k);
      trace(ctx, m, pad, y, w - pad * 2, laneH, { color: j === 1 ? c.accent : c.ink2, width: 1.2, count: N, amp: 0.38, alpha: k });
      if (k > 0.5) { ctx.globalAlpha = (k - 0.5) * 2; label(ctx, `IMF ${j + 1}`, w - pad, y + 8, c.ink3, 'right'); ctx.globalAlpha = 1; }
    });
  });
}

// ============================================================ small strip traces
export async function stripSignal(canvas, kind) {
  if (kind === 'ppg' || kind === 'imu') {
    const d = await load('ppg');
    const src = kind === 'ppg' ? d.clean : d.imu;
    const win = 256;
    animate(canvas, (t) => {
      const { ctx, w, h } = fit(canvas); const c = palette();
      const off = Math.floor(t * d.fs) % src.length;
      trace(ctx, src, 0, 0, w, h, { color: kind === 'ppg' ? c.accent : c.ink2, width: 1.5, count: win, offset: off, amp: kind === 'imu' ? 0.32 : 0.42 });
    });
  } else if (kind === 'eeg') {
    const r = rng(11), N = 2048, ch = [0, 1, 2, 3].map((k) => {
      const out = []; let s = 0;
      for (let i = 0; i < N; i++) { s = s * 0.7 + (r() - 0.5) * 0.9; out.push(Math.sin(i * 0.31 + k) * 0.35 * (0.6 + 0.4 * Math.sin(i * 0.012 + k)) + s * 0.5); }
      return out;
    });
    animate(canvas, (t) => {
      const { ctx, w, h } = fit(canvas); const c = palette();
      const off = Math.floor(t * 60) % N;
      ch.forEach((a, k) => trace(ctx, a, 0, (k * h) / 4, w, h / 4, { color: k === 1 ? c.accent : c.ink2, width: 1, count: 300, offset: off, amp: 0.5 }));
    });
  } else if (kind === 'cgm') {
    const d = await load('cgm');
    const q = d.days[0];
    animate(canvas, (t) => {
      const { ctx, w, h } = fit(canvas); const c = palette();
      const lo = 70, hi = 200, X = (hr) => (hr / 24) * w, Y = (g) => h - 4 - ((g - lo) / (hi - lo)) * (h - 8);
      const p = clamp((t % 6) / 4.5), upto = Math.max(2, Math.floor(p * q.length));
      ctx.fillStyle = c.accentSoft; ctx.beginPath(); ctx.moveTo(X(q[0][0]), h);
      for (let i = 0; i < upto; i++) ctx.lineTo(X(q[i][0]), Y(q[i][1]));
      ctx.lineTo(X(q[upto - 1][0]), h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < upto; i++) i ? ctx.lineTo(X(q[i][0]), Y(q[i][1])) : ctx.moveTo(X(q[i][0]), Y(q[i][1]));
      ctx.stroke();
    });
  } else if (kind === 'mol') {
    animate(canvas, (t) => {
      const { ctx, w, h } = fit(canvas); const c = palette();
      const s = h * 0.24;
      const m = molecule(w * 0.36, h * 0.5, s, 1);
      ctx.strokeStyle = c.ink3; ctx.lineWidth = 1.2;
      m.edges.forEach(([i, j]) => { ctx.beginPath(); ctx.moveTo(...m.nodes[i]); ctx.lineTo(...m.nodes[j]); ctx.stroke(); });
      const hot = Math.floor(t * 1.5) % m.nodes.length;
      m.nodes.forEach((p, i) => { ctx.fillStyle = i === hot ? c.accent : c.ink2; ctx.beginPath(); ctx.arc(p[0], p[1], i === hot ? 4 : 2.6, 0, Math.PI * 2); ctx.fill(); });
    });
  } else if (kind === 'text') {
    const r = rng(5), rows = [0, 1, 2].map(() => { const out = []; let x = 0; while (x < 2000) { const wd = 20 + r() * 50; out.push([x, wd, r()]); x += wd + 6; } return out; });
    animate(canvas, (t) => {
      const { ctx, w, h } = fit(canvas); const c = palette();
      const rh = h / 3;
      rows.forEach((row, k) => {
        const off = (t * (24 + k * 9)) % 1000;
        for (const [x0, wd, cls] of row) {
          const x = x0 - off; if (x > w || x + wd < 0) continue;
          ctx.fillStyle = cls < 0.22 ? c.bad : cls > 0.8 ? c.ok : c.ghost;
          ctx.globalAlpha = cls < 0.22 || cls > 0.8 ? 0.85 : 1;
          const y = k * rh + rh * 0.25, bh = rh * 0.5, rr = bh / 2;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, wd, bh, rr) : ctx.rect(x, y, wd, bh); ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    });
  }
}

// ============================================================ mount by attribute
export function mountAll(root = document) {
  root.querySelectorAll('canvas[data-signal]').forEach((cv) => stripSignal(cv, cv.dataset.signal));
  root.querySelectorAll('canvas[data-preview]').forEach((cv) => {
    const kind = cv.dataset.preview, hud = cv.parentElement.querySelector('.card__hud .on');
    if (kind === 'cgm') cgmCard(cv, hud);
    else if (kind === 'eeg') eegCard(cv, hud);
    else if (kind === 'ppg') ppgCard(cv, cv.parentElement.querySelector('.card__hud span'));
    else if (kind === 'sleep') sleepCard(cv, { seed: 7 });
    else if (kind === 'sleep-xp') sleepCard(cv, { seed: 21 });
    else if (kind === 'mol') molCard(cv);
    else if (kind === 'vmd') vmdCard(cv);
  });
}
