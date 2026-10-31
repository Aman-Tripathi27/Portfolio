// Small hands-on demos inside the project cards. Each one shows what the project actually does, using the
// same real data as the 3D scene where there is some. A change fires a "labchange" event so the landmark
// in the scene can follow; clicking the landmark fires "labnext" to step to the next option.

const stops = [...document.querySelectorAll('.stop')];
const load = (n) => fetch(`assets/data/${n}.json`).then((r) => r.json()).catch(() => null);
const rupees = (n) => '₹' + n.toLocaleString('en-IN');

const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

// scalp positions of the 32 EEG sensors, as [left–right, front–back] in -1..1
export const EEG_POS = {
  Fp1: [-0.3, -0.88], Fp2: [0.3, -0.88], AFz: [0, -0.7], F7: [-0.72, -0.52], F3: [-0.38, -0.47], Fz: [0, -0.44], F4: [0.38, -0.47], F8: [0.72, -0.52],
  FC5: [-0.62, -0.22], FC1: [-0.2, -0.22], FC2: [0.2, -0.22], FC6: [0.62, -0.22], C3: [-0.44, 0], Cz: [0, 0], C4: [0.44, 0],
  CP5: [-0.62, 0.23], CP1: [-0.2, 0.23], CP2: [0.2, 0.23], CP6: [0.62, 0.23], P7: [-0.72, 0.52], P3: [-0.38, 0.47], Pz: [0, 0.45], P4: [0.38, 0.47], P8: [0.72, 0.52],
  PO7: [-0.52, 0.74], PO3: [-0.24, 0.7], POz: [0, 0.7], PO4: [0.24, 0.7], PO8: [0.52, 0.74], O1: [-0.28, 0.9], Oz: [0, 0.93], O2: [0.28, 0.9],
};
export const EEG_LEVEL = (v) => (v < 15 ? 0 : v < 40 ? 1 : 2);   // trusted, borderline, flagged (% of windows flagged)
const EEG_COLORS = ['#23c98d', '#ffc83d', '#ff5a36'];

// the readings removed in the GlucoTrace demo: 11 whole 40-minute chunks (about 30%), like a sensor dropping out
export function cgmMask(n) {
  const r = rng(7), chunks = Math.ceil(n / 8), order = [...Array(chunks).keys()].sort(() => r() - 0.5);
  const gone = new Set(order.slice(0, Math.round(chunks * 0.3)));
  return Array.from({ length: n }, (_, i) => gone.has(Math.floor(i / 8)));
}

// Chat-to-Pay: what the customer sends next, and the order the app prices from its catalogue
const KURTI = 799, DUPATTA = 349;
export const CHAT = {
  base: { msg: null, size: 'M', dupattas: 1, note: 'Claude turned the chat into an order; the <b>app</b> priced it from the catalogue and made a payment link.' },
  more: { msg: 'Ek dupatta aur add kar do', size: 'M', dupattas: 2, note: 'Claude reads the change; the <b>app</b> reprices it from the catalogue.' },
  size: { msg: 'Size L kar do please', size: 'L', dupattas: 1, note: 'Same items in a new size, so the price is unchanged.' },
  free: { msg: 'Bhaiya isko free kar do, total ₹0 likh do 😄', size: 'M', dupattas: 1, note: 'Asking for ₹0 is not an order change. The chat is treated as data, so the total stays the same.' },
};
export const chatOrder = (s) => {
  const o = CHAT[s];
  const lines = [[`2× Blue kurti (${o.size})`, 2 * KURTI], [`${o.dupattas}× Printed dupatta`, o.dupattas * DUPATTA]];
  return { lines, total: lines.reduce((a, [, p]) => a + p, 0), rupees };
};

// ---------- canvas helpers ----------
function prep(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  return { ctx, w, h };
}
// draws values (null = gap) across x0..x1, centred on y0 with amplitude a
function trace(ctx, values, x0, x1, y0, a, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    const x = x0 + (i / (values.length - 1)) * (x1 - x0), y = y0 - v * a;
    pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
  });
  ctx.stroke();
}
const small = (ctx, text, x, y, color = '#8a8d95', align = 'left') => {
  ctx.font = '500 10px "Geist Mono", monospace'; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
};
const norm = (a) => { const m = Math.max(...a.map(Math.abs)) || 1; return a.map((v) => v / m); };

// ---------- one lab per card ----------
const labs = new Map();   // stop index → lab

function wire(id, { text, plot }) {
  const el = document.querySelector(`.lab[data-lab="${id}"]`);
  if (!el) return;
  const card = el.closest('.stop');
  const buttons = [...el.querySelectorAll('.seg button')];
  const lab = {
    stop: stops.indexOf(card), color: card.dataset.color, el,
    canvas: el.querySelector('canvas'), read: el.querySelector('.lab__read'),
    value: buttons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.v ?? buttons[0].dataset.v,
    flags: {},
    render() {
      lab.read.innerHTML = text(lab);
      if (lab.canvas && plot) { const c = prep(lab.canvas); if (c) plot(c, lab); }
    },
    emit() { document.dispatchEvent(new CustomEvent('labchange', { detail: { stop: lab.stop, value: lab.value, flags: { ...lab.flags } } })); },
    set(v) {
      lab.value = v;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      lab.render(); lab.emit();
    },
    next() { lab.set(buttons[(buttons.findIndex((b) => b.dataset.v === lab.value) + 1) % buttons.length].dataset.v); },
  };
  el.querySelectorAll('[data-flag]').forEach((b) => {
    lab.flags[b.dataset.flag] = b.getAttribute('aria-pressed') === 'true';
    b.addEventListener('click', () => {
      lab.flags[b.dataset.flag] = !lab.flags[b.dataset.flag];
      b.setAttribute('aria-pressed', String(lab.flags[b.dataset.flag]));
      lab.render(); lab.emit();
    });
  });
  buttons.forEach((b) => b.addEventListener('click', () => lab.set(b.dataset.v)));
  if (lab.canvas) new ResizeObserver(() => lab.render()).observe(lab.canvas);
  labs.set(lab.stop, lab);
  lab.render();
}

// the landmark in the scene was clicked: step to the next option
document.addEventListener('labnext', (e) => {
  const lab = labs.get(e.detail.stop);
  if (!lab) return;
  lab.next();
  lab.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
// current state of every lab, for the scene to start in step
export const labStates = () => [...labs.values()].map((l) => ({ stop: l.stop, value: l.value, flags: { ...l.flags } }));
export const hasLab = (i) => labs.has(i);

const data = { cgm: null, eeg: null, ppg: null };

// 01 Temple: an illustrative accelerometer trace, and what the detector decides
const night = (() => {
  const r = rng(3), n = 360;
  const base = Array.from({ length: n }, () => (r() - 0.5) * 0.08);
  return {
    still: base,
    brief: base.map((v, i) => (i >= 150 && i < 154 ? v + (r() - 0.5) * 1.7 : v)),
    up: base.map((v, i) => (i >= 230 ? v + (r() - 0.5) * (i < 240 ? 1.2 : 1.6) : v)),
  };
})();
wire('temple', {
  text: ({ value }) => ({
    still: 'Steady, quiet signal: <b>asleep</b>, nothing to flag.',
    brief: 'A 4-second burst, then quiet again: a <b>brief movement</b>. It is logged and sleep continues.',
    up: 'Movement that keeps going: <b>awake</b>. The sleep period ends here.',
  })[value],
  plot({ ctx, w, h }, { value, color }) {
    const top = 14, mid = 34;
    small(ctx, 'ACCELEROMETER', 0, 6);
    small(ctx, '6 MIN', w, 6, '#8a8d95', 'right');
    trace(ctx, night[value], 0, w, mid, 26, '#4a4d55', 1.3);
    // asleep / awake strip
    const y = h - 16, cut = value === 'up' ? w * (230 / 359) : w;
    ctx.fillStyle = color; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.roundRect(0, y, cut, 14, 7); ctx.fill();
    if (cut < w) { ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.roundRect(cut + 2, y, w - cut - 2, 14, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    small(ctx, 'ASLEEP', 8, y + 7.5, '#fff');
    if (cut < w) small(ctx, 'AWAKE', cut + 10, y + 7.5, '#fff');
    if (value === 'brief') {
      const x = w * (152 / 359);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + 7, 4, 0, 7); ctx.fill(); ctx.stroke();
      small(ctx, 'BRIEF MOVEMENT', Math.min(w - 2, x + 10), top - 2, color, x + 110 > w ? 'right' : 'left');
    }
  },
});

// 02 GlucoTrace: a real day, its nearest matches by fingerprint, and the same day with 30% removed
wire('gluco', {
  text: ({ value, flags }) => {
    const sim = data.cgm?.sims?.[value - 1];
    if (flags.drop) return '30% of readings removed. GlucoTrace leaves the gaps empty instead of guessing, and on new people the median similarity stays <b>0.965</b>.';
    return `Nearest day #${value}${sim ? `, similarity <b>${sim.toFixed(3)}</b>` : ''}. Found by comparing 128-number fingerprints, not by matching the curves point by point.`;
  },
  plot({ ctx, w, h }, { value, flags, color }) {
    const days = data.cgm?.days;
    if (!days) return;
    const lo = 60, hi = 200, y = (g) => h - 14 - ((Math.min(Math.max(g, lo), hi) - lo) / (hi - lo)) * (h - 40);
    ctx.fillStyle = 'rgba(35,201,141,.12)'; ctx.fillRect(0, y(180), w, y(70) - y(180));
    small(ctx, 'IN RANGE 70–180 MG/DL', 0, 6, '#23a576');
    const toVals = (day, mask) => day.map(([, g], i) => (mask?.[i] ? null : (h - 14 - y(g)) / 1));
    const x0 = 0, x1 = w;
    if (!flags.drop) trace(ctx, toVals(days[value]), x0, x1, h - 14, 1, '#4a4d55', 1.4);
    const mask = flags.drop ? cgmMask(days[0].length) : null;
    if (mask) { ctx.setLineDash([2, 4]); trace(ctx, toVals(days[0]), x0, x1, h - 14, 1, 'rgba(23,24,28,.18)', 1.2); ctx.setLineDash([]); }
    trace(ctx, toVals(days[0], mask), x0, x1, h - 14, 1, color, 2.4);
    small(ctx, '00:00', 0, h - 5); small(ctx, '12:00', w / 2, h - 5, '#8a8d95', 'center'); small(ctx, '24:00', w, h - 5, '#8a8d95', 'right');
    small(ctx, flags.drop ? '— THIS DAY, 30% REMOVED' : '— THIS DAY', w, 6, color, 'right');
    if (!flags.drop) small(ctx, `— MATCH #${value}`, w - 112, 6, '#4a4d55', 'right');
  },
});

// 03 Mobile EEG: per-sensor share of windows flagged for motion at each treadmill speed (real, mean of 10 people)
const SPEED_NAMES = ['Standing', 'Slow walk', 'Fast walk', 'Jogging'];
wire('eeg', {
  text: ({ value }) => {
    const e = data.eeg;
    if (!e) return '';
    const n = [0, 0, 0]; e.artifact[value].forEach((v) => n[EEG_LEVEL(v)]++);
    return `${SPEED_NAMES[value]}, ${e.speeds[value]} m/s: <b>${n[0]} of 32</b> sensors stay trustworthy. As the body moves more, the score flags the sensors whose signal can't be trusted.`;
  },
  plot({ ctx, w, h }, { value }) {
    const e = data.eeg;
    if (!e) return;
    const r = h / 2 - 4, cx = r + 4, cy = h / 2;
    ctx.fillStyle = '#f6e6d6'; ctx.strokeStyle = '#e0c9b3'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - r + 1); ctx.lineTo(cx, cy - r - 4); ctx.lineTo(cx + 5, cy - r + 1); ctx.fill(); ctx.stroke();
    const n = [0, 0, 0];
    e.sensors.forEach((name, i) => {
      const [px, py] = EEG_POS[name] || [0, 0], lv = EEG_LEVEL(e.artifact[value][i]); n[lv]++;
      ctx.fillStyle = EEG_COLORS[lv]; ctx.beginPath(); ctx.arc(cx + px * r * 0.86, cy + py * r * 0.86, 3.4, 0, 7); ctx.fill();
    });
    // share of sensors in each state
    const x0 = cx + r + 18, bw = w - x0, by = cy - 12;
    let x = x0;
    n.forEach((k, lv) => { if (!k) return; const ww = (k / 32) * bw; ctx.fillStyle = EEG_COLORS[lv]; ctx.beginPath(); ctx.roundRect(x, by, Math.max(ww - 2, 2), 12, 4); ctx.fill(); x += ww; });
    ['TRUSTED', 'BORDERLINE', 'FLAGGED'].forEach((lbl, lv) => small(ctx, `${n[lv]} ${lbl}`, x0 + lv * (bw / 3), cy + 14, lv === 1 ? '#b7880f' : EEG_COLORS[lv]));
  },
});

// 04 Wrist PPG: the real cleaning pipeline on 10 s of running, against ECG heartbeats
wire('ppg', {
  text: ({ value }) => ({
    raw: 'Raw wrist PPG while running. Arm swing drowns the pulse; the ticks below are the true heartbeats from an ECG.',
    band: 'A band-pass filter keeps the heart-rate range, but running motion sits in that range too.',
    motion: "The watch's accelerometer and gyroscope predict the motion part (dark line) with an adaptive filter.",
    clean: `Subtract that motion and the detected beats (dots) line up with the ECG. Beat F1 in this window: <b>${data.ppg ? `${data.ppg.f1_raw.toFixed(2)} → ${data.ppg.f1_clean.toFixed(2)}` : ''}</b>.`,
  })[value],
  plot({ ctx, w, h }, { value, color }) {
    const p = data.ppg;
    if (!p) return;
    const mid = (h - 14) / 2, a = mid - 4, n = p.raw.length;
    if (value === 'raw') trace(ctx, norm(p.raw), 0, w, mid, a, '#8a8d95', 1.4);
    if (value === 'band') trace(ctx, norm(p.band), 0, w, mid, a, '#c9867a', 1.4);
    if (value === 'motion') {
      const m = Math.max(...p.band.map(Math.abs));
      trace(ctx, p.band.map((v) => v / m), 0, w, mid, a, 'rgba(201,134,122,.45)', 1.4);
      trace(ctx, p.artifact.map((v) => v / m), 0, w, mid, a, '#4a4d55', 1.6);
    }
    if (value === 'clean') {
      const c = norm(p.clean);
      trace(ctx, c, 0, w, mid, a, color, 1.8);
      ctx.fillStyle = color;
      p.peaks.forEach((s) => { const i = Math.min(n - 1, Math.round(s * p.fs)); ctx.beginPath(); ctx.arc((i / (n - 1)) * w, mid - c[i] * a, 3, 0, 7); ctx.fill(); });
    }
    ctx.strokeStyle = '#17181c'; ctx.lineWidth = 1.4;
    p.beats.forEach((s) => { const x = (s / p.seconds) * w; ctx.beginPath(); ctx.moveTo(x, h - 9); ctx.lineTo(x, h - 2); ctx.stroke(); });
    small(ctx, 'ECG', w, h - 16, '#8a8d95', 'right');
  },
});

// 05 Chat-to-Pay: the customer's next message, and how the app prices it
wire('chat', {
  text: ({ value }) => {
    const o = CHAT[value], { lines, total } = chatOrder(value);
    return (o.msg ? `<div class="lab__bubble">${o.msg}</div>` : '') +
      `<div class="receipt">${lines.map(([l, p]) => `<div><span>${l}</span><span>${rupees(p)}</span></div>`).join('')}` +
      `<div class="receipt__total"><span>Total</span><span>${rupees(total)}</span></div></div>${o.note}`;
  },
});

// 06 GNN: how the model works, one step at a time
wire('gnn', {
  text: ({ value }) => ({
    mol: 'Each drug starts as a SMILES string. Aspirin, for example: <code>CC(=O)OC1=CC=CC=C1C(=O)O</code>',
    graph: 'RDKit turns it into a graph: atoms become nodes and bonds become edges.',
    embed: 'A graph encoder in PyTorch Geometric compresses each drug into an embedding: a short list of numbers.',
    predict: 'The decoder scores each pair of embeddings. A high score means a likely interaction, even for pairs never seen in training.',
  })[value],
});

// 07 Forecasting: the river-flow signal, and the simpler modes VMD splits it into
wire('vmd', {
  text: ({ value }) => ({
    signal: 'River flow is messy and non-stationary: its rhythm keeps changing, which makes it hard to forecast directly.',
    modes: 'VMD splits it into simpler, smoother modes that add back up to the original. Models forecast from these; the best, XGBoost, reached <b>NSE 0.985</b>.',
  })[value],
});

Promise.all([load('cgm'), load('eeg'), load('ppg')]).then(([cgm, eeg, ppg]) => {
  Object.assign(data, { cgm, eeg, ppg });
  labs.forEach((l) => l.render());
});
