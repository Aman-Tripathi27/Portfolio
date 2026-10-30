// Scroll-scrubbed PPG cleaning: raw → band-pass → IMU cancellation → beats.
// Real data: WRIST dataset (PhysioNet) s3_run, processed by run_inference.py.

import { animate, fit, trace, palette, clamp, lerp, ease, reducedMotion } from './core.js';
import { load } from './previews.js';

function label(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = '500 10.5px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = color; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

export function mountPpgScrub(section) {
  const canvas = section.querySelector('canvas');
  const stages = [...section.querySelectorAll('[data-stage]')];
  const f1El = section.querySelector('[data-f1]');

  const progress = () => {
    if (reducedMotion) return 1;
    const r = section.getBoundingClientRect();
    const span = section.offsetHeight - innerHeight;
    return span > 0 ? clamp(-r.top / span) : 1;
  };

  load('ppg').then((d) => {
    const n = d.clean.length;
    const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
    let lastStage = -1;

    animate(canvas, (t) => {
      const p = progress();
      const { ctx, w, h } = fit(canvas); const c = palette(canvas);

      const mBand = seg(p, 0.1, 0.32);
      const mAnc = seg(p, 0.36, 0.6);
      const mClean = seg(p, 0.6, 0.72);
      const mBeats = clamp((p - 0.74) / 0.2);
      const showArt = Math.sin(clamp((p - 0.3) / 0.36) * Math.PI);

      const stage = p < 0.1 ? 0 : p < 0.34 ? 1 : p < 0.72 ? 2 : 3;
      if (stage !== lastStage) {
        stages.forEach((li, i) => { li.classList.toggle('on', i <= stage); li.classList.toggle('current', i === stage); });
        lastStage = stage;
      }

      const padX = Math.max(16, Math.min(40, w * 0.04));
      const pw = w - padX * 2;
      const mainY = h * 0.04, mainH = h * 0.6;
      const imuY = h * 0.66, imuH = h * 0.16;
      const beatY = h * 0.86;

      const val = (i) => lerp(lerp(lerp(d.raw[i], d.band[i], mBand), d.anc[i], mAnc), d.clean[i], mClean);

      trace(ctx, d.raw, padX, mainY, pw, mainH, { color: c.raw, width: 1, alpha: mBand * 0.45 });
      trace(ctx, d.artifact, padX, mainY, pw, mainH, { color: c.accent, width: 1.2, alpha: showArt * 0.75, dash: [5, 4] });
      const cleanMix = clamp(mAnc * 0.5 + mClean * 0.5);
      trace(ctx, val, padX, mainY, pw, mainH, { color: c.ink, width: 2, count: n, alpha: 1 - cleanMix });
      trace(ctx, val, padX, mainY, pw, mainH, { color: c.accent, width: 2.2, count: n, alpha: cleanMix });

      const imuActive = clamp(showArt * 1.4);
      trace(ctx, d.imu, padX, imuY, pw, imuH, { color: imuActive > 0.1 ? c.accent : c.ink3, width: 1.1, alpha: 0.45 + imuActive * 0.4, amp: 0.36 });
      label(ctx, 'Wrist accelerometer', padX, imuY - 4, c.ink3);
      label(ctx, 'Wrist PPG', padX, mainY + 10, c.ink3);

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

      if (!reducedMotion) {
        const ph = padX + ((t / 10) % 1) * pw;
        const i = Math.round(((ph - padX) / pw) * (n - 1));
        const y = mainY + mainH / 2 - clamp(val(i), -1.6, 1.6) * mainH * 0.42;
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ph, mainY); ctx.lineTo(ph, beatY + 18); ctx.stroke();
        ctx.fillStyle = cleanMix > 0.5 ? c.accent : c.ink; ctx.beginPath(); ctx.arc(ph, y, 4, 0, Math.PI * 2); ctx.fill();
      }

      if (f1El) f1El.textContent = lerp(d.f1_raw, d.f1_clean, clamp((p - 0.5) / 0.44)).toFixed(2);
    }, { live: true });
  });
}
