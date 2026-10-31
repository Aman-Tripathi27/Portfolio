// Sound for the drive, synthesised with the Web Audio API (no audio files):
// an engine hum that revs with speed, road noise, a chime at each stop, button clicks and the odd bird.
// Nothing plays until the visitor turns sound on, which also satisfies the browser's click-to-play rule.

const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66]; // C major pentatonic-ish, for chimes

export function createSound() {
  let ctx = null;
  let master, engineGain, engineFilter, oscA, oscB, noiseGain;
  let on = false;
  let birdIn = 4;

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // engine: two detuned oscillators through a resonant low-pass
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineFilter.Q.value = 3;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    oscA = ctx.createOscillator(); oscA.type = 'sawtooth'; oscA.frequency.value = 46;
    oscB = ctx.createOscillator(); oscB.type = 'square'; oscB.frequency.value = 23.3;
    const bGain = ctx.createGain(); bGain.gain.value = 0.45;
    oscA.connect(engineFilter);
    oscB.connect(bGain).connect(engineFilter);
    engineFilter.connect(engineGain).connect(master);
    oscA.start(); oscB.start();

    // road noise: looped brown noise
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
    noise.connect(lp).connect(noiseGain).connect(master);
    noise.start();

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
    });
    return true;
  }

  // one decaying sine note
  function note(freq, start, dur, vol, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(master);
    o.start(start); o.stop(start + dur + 0.05);
    return o;
  }

  function chirp() {
    const t = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 900;
    for (let k = 0; k < n; k++) {
      const s = t + k * 0.13, o = note(base, s, 0.09, 0.025);
      o.frequency.setValueAtTime(base, s);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, s + 0.08);
    }
  }

  return {
    get on() { return on; },
    get running() { return !!ctx && ctx.state === 'running'; },

    async setOn(value) {
      if (value && !ctx && !init()) return false;
      on = value;
      if (!ctx) return on;
      if (on) await ctx.resume();
      master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.12);
      if (!on) setTimeout(() => { if (!on) ctx.suspend(); }, 400);
      return on;
    },

    // called every frame with the car's speed in world units per second
    update(speed, dt) {
      if (!ctx || !on) return;
      const s = Math.min(1, Math.abs(speed) / 26), t = ctx.currentTime;
      oscA.frequency.setTargetAtTime(46 + s * 74, t, 0.12);
      oscB.frequency.setTargetAtTime(23.3 + s * 37, t, 0.12);
      engineFilter.frequency.setTargetAtTime(300 + s * 1000, t, 0.12);
      engineGain.gain.setTargetAtTime(0.045 + s * 0.12, t, 0.15);
      noiseGain.gain.setTargetAtTime(s * 0.16, t, 0.2);
      birdIn -= dt;
      if (birdIn <= 0) { birdIn = 6 + Math.random() * 10; chirp(); }
    },

    // arriving at stop i: two bell notes, a different pair per stop
    chime(i) {
      if (!ctx || !on) return;
      const t = ctx.currentTime, f = SCALE[i % SCALE.length];
      note(f, t, 1.3, 0.12);
      note(f * 1.5, t + 0.11, 1.5, 0.09);
      note(f * 2, t + 0.11, 0.6, 0.02, 'triangle');
    },

    click() {
      if (!ctx || !on) return;
      note(1250, ctx.currentTime, 0.05, 0.05, 'triangle');
    },
  };
}
