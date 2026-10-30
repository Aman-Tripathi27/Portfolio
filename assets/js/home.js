import { initChrome, animate, fit, trace, palette, clamp, lerp, ease, reducedMotion } from './core.js';
import { load, mountAll } from './previews.js';

initChrome();
mountAll();

// ============================================================ hero: PPG cleans itself on scroll
const hero = document.getElementById('hero');
const heroCanvas = document.getElementById('heroCanvas');
const stages = [...document.querySelectorAll('#stages li')];
const f1El = document.getElementById('heroF1');

function heroProgress() {
  if (reducedMotion) return 1;
  const r = hero.getBoundingClientRect();
  const span = hero.offsetHeight - innerHeight;
  return span > 0 ? clamp(-r.top / span) : 1;
}

load('ppg').then((d) => {
  const n = d.clean.length;
  const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
  let lastStage = -1;

  animate(heroCanvas, (t) => {
    const p = heroProgress();
    const { ctx, w, h } = fit(heroCanvas); const c = palette();

    const mBand = seg(p, 0.1, 0.32);     // raw -> band-pass
    const mAnc = seg(p, 0.36, 0.6);      // band -> IMU cancelled
    const mClean = seg(p, 0.6, 0.72);    // -> final output band
    const mBeats = clamp((p - 0.74) / 0.2);
    const showArt = Math.sin(clamp((p - 0.3) / 0.36) * Math.PI);

    const stage = p < 0.1 ? 0 : p < 0.34 ? 1 : p < 0.72 ? 2 : 3;
    if (stage !== lastStage) { stages.forEach((li, i) => { li.classList.toggle('on', i <= stage); li.classList.toggle('current', i === stage); }); lastStage = stage; }

    const padX = Math.max(16, Math.min(40, w * 0.04));
    const pw = w - padX * 2;
    const mainY = h * 0.04, mainH = h * 0.6;
    const imuY = h * 0.66, imuH = h * 0.16;
    const beatY = h * 0.86;

    const val = (i) => {
      const a = lerp(d.raw[i], d.band[i], mBand);
      const b = lerp(a, d.anc[i], mAnc);
      return lerp(b, d.clean[i], mClean);
    };

    // ghost of the raw signal once cleaning starts
    trace(ctx, d.raw, padX, mainY, pw, mainH, { color: c.raw, width: 1, alpha: mBand * 0.45 });
    // predicted motion artifact (what the IMU says to subtract)
    trace(ctx, d.artifact, padX, mainY, pw, mainH, { color: c.accent, width: 1.2, alpha: showArt * 0.75, dash: [5, 4] });

    // main trace: ink while raw, accent once clean
    const cleanMix = clamp(mAnc * 0.5 + mClean * 0.5);
    trace(ctx, val, padX, mainY, pw, mainH, { color: c.ink, width: 2, count: n, alpha: 1 - cleanMix });
    trace(ctx, val, padX, mainY, pw, mainH, { color: c.accent, width: 2.2, count: n, alpha: cleanMix });

    // IMU lane
    const imuActive = clamp(showArt * 1.4);
    trace(ctx, d.imu, padX, imuY, pw, imuH, { color: imuActive > 0.1 ? c.accent : c.ink3, width: 1.1, alpha: 0.45 + imuActive * 0.4, amp: 0.36 });
    label(ctx, 'Wrist accelerometer', padX, imuY - 4, c.ink3);
    label(ctx, 'Wrist PPG', padX, mainY + 10, c.ink3);

    // beats lane: reference ECG beats always; detected peaks sweep in
    ctx.fillStyle = c.ink3;
    for (const b of d.beats) ctx.fillRect(padX + (b / d.seconds) * pw, beatY, 1.2, 10);
    label(ctx, 'ECG reference beats', padX, beatY - 8, c.ink3);
    if (mBeats > 0) {
      const lim = mBeats * d.seconds;
      for (const pk of d.peaks) {
        if (pk > lim) continue;
        const x = padX + (pk / d.seconds) * pw, i = Math.round(pk * d.fs);
        const y = mainY + mainH / 2 - clamp(val(i), -1.6, 1.6) * mainH * 0.42;
        ctx.strokeStyle = c.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, beatY); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 0.5, beatY + 12, 1.8, 6);
      }
    }

    // live playhead
    if (!reducedMotion) {
      const ph = padX + ((t / 10) % 1) * pw;
      const i = Math.round(((ph - padX) / pw) * (n - 1));
      const y = mainY + mainH / 2 - clamp(val(i), -1.6, 1.6) * mainH * 0.42;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ph, mainY); ctx.lineTo(ph, beatY + 18); ctx.stroke();
      ctx.fillStyle = cleanMix > 0.5 ? c.accent : c.ink; ctx.beginPath(); ctx.arc(ph, y, 4, 0, Math.PI * 2); ctx.fill();
    }

    f1El.textContent = lerp(d.f1_raw, d.f1_clean, clamp((p - 0.5) / 0.44)).toFixed(2);
  }, { live: true });

  // contact: a calm clean pulse across the bottom
  const cc = document.getElementById('contactCanvas');
  animate(cc, (t) => {
    const { ctx, w, h } = fit(cc); const c = palette();
    const off = Math.floor(t * d.fs) % n;
    trace(ctx, d.clean, 0, 0, w, h, { color: c.accent, width: 1.6, count: 384, offset: off, amp: 0.34, alpha: 0.75 });
  });
});

function label(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = '500 10.5px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = color; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

// ============================================================ chat-to-pay scene
const scene = document.getElementById('chatScene');
if (scene) {
  const bubbles = [...scene.querySelectorAll('.bubble')];
  const slip = scene.querySelector('.slip');
  const total = document.getElementById('chatTotal');
  const fmt = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
  animate(scene, (t) => {
    const cyc = reducedMotion ? 99 : t % 11;
    bubbles.forEach((b, i) => b.classList.toggle('show', cyc > 0.3 + i * 0.75 && cyc < 10.4));
    const s = cyc > 4.6 && cyc < 10.4;
    slip.classList.toggle('show', s);
    total.textContent = fmt(1947 * ease(clamp((cyc - 5) / 1.4)));
  });
}

// ============================================================ filters
const filters = [...document.querySelectorAll('.filter')];
const cards = [...document.querySelectorAll('.work .card[data-tags]')];
filters.forEach((btn) => btn.addEventListener('click', () => {
  const f = btn.dataset.filter;
  filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  cards.forEach((card) => {
    const show = f === 'all' || card.dataset.tags.split(' ').includes(f);
    card.classList.toggle('is-hidden', !show);
  });
}));
