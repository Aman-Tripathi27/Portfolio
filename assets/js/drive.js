// A drive through the work: a car on a fixed road, one landmark per stop.
// Scroll, swipe, arrow keys or the stop dots move the car; it always stays on the road.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const body = document.body;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stopEls = [...document.querySelectorAll('.stop')];
const viewToggle = document.getElementById('viewToggle');
stopEls.forEach((el) => el.style.setProperty('--c', el.dataset.color));

// Stops sit at evenly spaced points along the road (fraction of its length).
const U = stopEls.map((_, i) => 0.035 + i * (0.93 / (stopEls.length - 1)));
const LAST = U.length - 1;

let world = null;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

// ---------------------------------------------------------------- list view / drive view
function setListMode(on) {
  body.classList.toggle('list-mode', on);
  viewToggle.textContent = on ? 'Drive view' : 'List view';
  if (on) {
    body.classList.remove('is-3d');
    world?.pause();
    scrollTo(0, 0);
  } else if (world) {
    body.classList.add('is-3d');
    world.resume();
  } else {
    startWorld();
  }
}
viewToggle.addEventListener('click', () => setListMode(!body.classList.contains('list-mode')));

if (!hasWebGL()) {
  body.classList.remove('booting');
  viewToggle.hidden = true;
} else if (reduced) {
  // reduced motion: start as a calm list; the drive is one click away
  body.classList.remove('booting');
  body.classList.add('list-mode');
  viewToggle.textContent = 'Drive view';
} else {
  startWorld();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-next], [data-prev], [data-goto]');
  if (!el) return;
  if (!world || !body.classList.contains('is-3d')) {
    if (el.matches('[data-next]') && el.closest('.stop--intro')) { e.preventDefault(); setListMode(false); }
    return;
  }
  e.preventDefault();
  if (el.matches('[data-next]')) world.step(1);
  else if (el.matches('[data-prev]')) world.step(-1);
  else world.goTo(el.dataset.goto === 'last' ? LAST : +el.dataset.goto);
});

async function startWorld() {
  body.classList.add('booting');
  const load = (n) => fetch(`assets/data/${n}.json`).then((r) => r.json()).catch(() => null);
  const [ppg, cgm, eeg] = await Promise.all([load('ppg'), load('cgm'), load('eeg')]);
  await Promise.all([
    document.fonts.load('400 64px "Instrument Serif"'),
    document.fonts.load('600 40px "Geist"'),
    document.fonts.load('500 30px "Geist Mono"'),
  ]).catch(() => {});
  try {
    world = buildWorld({ ppg, cgm, eeg });
  } catch (err) {
    console.error(err);
    body.classList.remove('booting');
    body.classList.add('list-mode');
    viewToggle.hidden = true;
    return;
  }
  body.classList.add('is-3d');
  body.classList.remove('list-mode');
  world.resume();
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('ready')));
  setTimeout(() => body.classList.remove('booting'), 900);
}

// ================================================================ the world
function buildWorld(data) {
  const canvas = document.getElementById('world');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#cfe9f3');
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 80, 230);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 420);

  scene.add(new THREE.HemisphereLight('#eef8ff', '#b9cf9a', 1.25));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // ---------- helpers ----------
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = color + JSON.stringify(o);
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, flatShading: true, ...o }));
    return mats.get(key);
  };
  const mesh = (geo, material, shadow = true) => {
    const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  };
  const rbox = (w, h, d, r = 0.2) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) * 0.45));
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.userData = { ctx, w, h };
    return t;
  };
  const wrap = (ctx, text, maxW) => {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  };

  // ---------- the road ----------
  const ctrl = [
    [0, 0], [0, -28], [18, -52], [48, -58], [74, -76], [80, -108], [60, -134], [28, -142],
    [8, -168], [14, -202], [42, -222], [74, -220], [100, -240], [106, -274], [92, -302],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.5);
  const LEN = curve.getLength();
  const normalAt = (u) => { const t = curve.getTangentAt(u); return new THREE.Vector3(-t.z, 0, t.x).normalize(); };

  const ribbon = (out, width, y, u0, u1, segs) => {
    const base = out.pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const u = u0 + (u1 - u0) * (i / segs), p = curve.getPointAt(u), n = normalAt(u);
      out.pos.push(p.x + n.x * width / 2, y, p.z + n.z * width / 2, p.x - n.x * width / 2, y, p.z - n.z * width / 2);
    }
    for (let i = 0; i < segs; i++) { const a = base + i * 2; out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  };
  const ribbonMesh = (out, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
    g.setIndex(out.idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    m.receiveShadow = true;
    return m;
  };
  const curb = { pos: [], idx: [] }; ribbon(curb, 9.6, 0.02, 0, 1, 900);
  const road = { pos: [], idx: [] }; ribbon(road, 8, 0.04, 0, 1, 900);
  const dash = { pos: [], idx: [] };
  for (let s = 3; s < LEN - 3; s += 4.6) ribbon(dash, 0.32, 0.06, s / LEN, (s + 2.3) / LEN, 3);
  scene.add(ribbonMesh(curb, '#f4ecd8'), ribbonMesh(road, '#4b505b'), ribbonMesh(dash, '#fff4cf'));

  const ground = mesh(new THREE.CircleGeometry(520, 64), mat('#bfe3b4', { flatShading: false }), false);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(55, 0, -150);
  scene.add(ground);

  const roadSamples = curve.getSpacedPoints(500);
  const distToRoad = (x, z) => { let d = Infinity; for (const p of roadSamples) d = Math.min(d, Math.hypot(p.x - x, p.z - z)); return d; };

  // ---------- labels that always face the camera ----------
  const label = (num, title, color) => {
    const tex = canvasTex(640, 150, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.beginPath(); ctx.roundRect(6, 10, w - 12, h - 26, 64); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(70, h / 2 - 8, 40, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '500 34px "Geist Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(num, 70, h / 2 - 7);
      ctx.fillStyle = '#17181c'; ctx.textAlign = 'left'; ctx.font = '400 64px "Instrument Serif"';
      ctx.fillText(title, 130, h / 2 - 4);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    s.scale.set(10.5, 2.46, 1);
    return s;
  };

  // ---------- place a landmark beside a stop ----------
  const landmarks = [];
  const place = (i, group, height, side) => {
    const u = U[i], p = curve.getPointAt(u), n = normalAt(u);
    group.position.set(p.x + n.x * side * 16, 0, p.z + n.z * side * 16);
    group.lookAt(p.x, 0, p.z);
    scene.add(group);
    const el = stopEls[i];
    const tag = label(String(i).padStart(2, '0'), el.dataset.title, el.dataset.color);
    tag.position.set(group.position.x, height + 2.6, group.position.z);
    scene.add(tag);
    landmarks[i] = { group, height, pos: group.position.clone() };
  };
  const pedestal = (w, d, color = '#f7f1e3') => { const m = mesh(rbox(w, 0.7, d, 0.3), color); m.position.y = 0.35; return m; };

  const animators = [];

  // 01 Temple: a bed under a crescent moon
  {
    const g = new THREE.Group();
    g.add(pedestal(12, 8, '#e8ebff'));
    const frame = mesh(rbox(6.6, 1.1, 3.8, 0.3), '#3346a6'); frame.position.y = 1.25; g.add(frame);
    const mattress = mesh(rbox(6.3, 0.6, 3.5, 0.25), '#ffffff'); mattress.position.y = 2.05; g.add(mattress);
    const blanket = mesh(rbox(4.1, 0.4, 3.62, 0.18), '#8c9cff'); blanket.position.set(1, 2.42, 0); g.add(blanket);
    const pillow = mesh(rbox(1.5, 0.6, 1.5, 0.28), '#fdfcff'); pillow.position.set(-2.2, 2.5, 0); g.add(pillow);
    const head = mesh(rbox(0.45, 2.8, 3.8, 0.2), '#3346a6'); head.position.set(-3.3, 2.3, 0); g.add(head);
    const moon = mesh(new THREE.TorusGeometry(2.1, 0.72, 14, 48, Math.PI * 1.22), mat('#ffd76a', { emissive: '#ffc93c', emissiveIntensity: 0.35 }));
    moon.position.set(1.2, 9, 0); moon.rotation.z = -0.35; g.add(moon);
    const stars = [];
    const r = rng(4);
    for (let k = 0; k < 6; k++) {
      const s = mesh(new THREE.OctahedronGeometry(0.34), mat('#ffe58f', { emissive: '#ffd34d', emissiveIntensity: 0.6 }), false);
      s.position.set(-5 + r() * 10, 6 + r() * 6, -1 + r() * 2); g.add(s); stars.push(s);
    }
    animators.push((t) => { moon.position.y = 9 + Math.sin(t * 0.8) * 0.35; stars.forEach((s, k) => s.scale.setScalar(0.7 + 0.4 * Math.abs(Math.sin(t * 1.6 + k)))); });
    place(1, g, 11.5, 1);
  }

  // 02 GlucoTrace: a real glucose day as a sculpture, plus a pip package
  {
    const g = new THREE.Group();
    g.add(pedestal(15, 4.5));
    const days = data.cgm?.days || [Array.from({ length: 96 }, (_, i) => [i / 4, 110 + Math.sin(i / 8) * 30])];
    const toPts = (day, z) => day.filter((_, i) => i % 3 === 0).map(([hr, gl]) => new THREE.Vector3((hr / 24) * 12.5 - 6.25, 1.2 + ((Math.min(Math.max(gl, 60), 200) - 60) / 140) * 7.5, z));
    const band = mesh(new THREE.BoxGeometry(12.5, (110 / 140) * 7.5, 0.08), mat('#cdeed3', { transparent: true, opacity: 0.7 }), false);
    band.position.set(0, 1.2 + ((70 - 60) / 140) * 7.5 + (110 / 140) * 7.5 / 2, -1.3); g.add(band);
    days.slice(1, 4).forEach((day, k) => {
      const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(toPts(day, -0.4 - k * 0.3)), 180, 0.08, 6), mat('#f5c26b', { transparent: true, opacity: 0.6 }), false);
      g.add(tube);
    });
    const main = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(toPts(days[0], 0.2)), 260, 0.22, 10), mat('#e8921a', { emissive: '#e8921a', emissiveIntensity: 0.15 }));
    g.add(main);
    const box = mesh(rbox(2.6, 2.6, 2.6, 0.18), '#f2c27a'); box.position.set(9.2, 2, 0.4); box.rotation.y = -0.4; g.add(box);
    const tape = mesh(new THREE.BoxGeometry(2.64, 0.5, 2.64), '#e0a54f'); tape.position.copy(box.position); tape.position.y = 3.1; tape.rotation.y = -0.4; g.add(tape);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(440, 180, (ctx, w, h) => {
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#17181c'; ctx.font = '500 38px "Geist Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('pip install', w / 2, 62); ctx.fillStyle = '#c4700a'; ctx.fillText('glucotrace', w / 2, 120);
    }) }));
    lbl.position.set(0, -0.3, 1.31); box.add(lbl);
    animators.push((t) => { box.position.y = 2 + Math.abs(Math.sin(t * 2)) * 0.25; });
    place(2, g, 9.5, -1);
  }

  // 03 Mobile EEG: a head with 32 sensors coloured by real artifact rates per treadmill speed
  {
    const g = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(5.4, 5.8, 0.8, 32), '#efe9ff'); base.position.y = 0.4; g.add(base);
    const neck = mesh(new THREE.CylinderGeometry(1.5, 1.9, 1.8, 16), '#f0dccb'); neck.position.y = 1.6; g.add(neck);
    const R = 4.3;
    const head = mesh(new THREE.SphereGeometry(R, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat('#f6e6d6', { flatShading: false }));
    head.position.y = 2.4; g.add(head);
    const rim = mesh(new THREE.CylinderGeometry(R, R, 0.5, 32), '#f0dccb'); rim.position.y = 2.15; g.add(rim);
    const nose = mesh(new THREE.ConeGeometry(0.7, 1.4, 8), '#f0dccb'); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.6, R + 0.4); g.add(nose);
    [-1, 1].forEach((s) => { const ear = mesh(new THREE.SphereGeometry(0.8, 12, 8), '#f0dccb'); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * R, 2.7, 0); g.add(ear); });
    const POS = {
      Fp1: [-0.3, -0.88], Fp2: [0.3, -0.88], AFz: [0, -0.7], F7: [-0.72, -0.52], F3: [-0.38, -0.47], Fz: [0, -0.44], F4: [0.38, -0.47], F8: [0.72, -0.52],
      FC5: [-0.62, -0.22], FC1: [-0.2, -0.22], FC2: [0.2, -0.22], FC6: [0.62, -0.22], C3: [-0.44, 0], Cz: [0, 0], C4: [0.44, 0],
      CP5: [-0.62, 0.23], CP1: [-0.2, 0.23], CP2: [0.2, 0.23], CP6: [0.62, 0.23], P7: [-0.72, 0.52], P3: [-0.38, 0.47], Pz: [0, 0.45], P4: [0.38, 0.47], P8: [0.72, 0.52],
      PO7: [-0.52, 0.74], PO3: [-0.24, 0.7], POz: [0, 0.7], PO4: [0.24, 0.7], PO8: [0.52, 0.74], O1: [-0.28, 0.9], Oz: [0, 0.93], O2: [0.28, 0.9],
    };
    const eeg = data.eeg || { sensors: Object.keys(POS), speeds: ['0.0', '0.8', '1.6', '2.0'], artifact: [0, 1, 2, 3].map((k) => Object.keys(POS).map(() => k * 18)) };
    const sensors = eeg.sensors.map((name) => {
      const [px, py] = POS[name] || [0, 0];
      const x = px * R * 0.86, z = -py * R * 0.86, y = Math.sqrt(Math.max(0.2, R * R - x * x - z * z));
      const s = mesh(new THREE.SphereGeometry(0.36, 12, 8), new THREE.MeshStandardMaterial({ color: '#23c98d', roughness: 0.4, emissive: '#000000' }), false);
      s.position.set(x, 2.4 + y, z); g.add(s);
      return s;
    });
    const OK = new THREE.Color('#23c98d'), WATCH = new THREE.Color('#ffc83d'), BAD = new THREE.Color('#ff5a36');
    const speedTex = canvasTex(620, 120, () => {});
    const speedSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: speedTex, depthWrite: false }));
    speedSign.scale.set(7.6, 1.47, 1); speedSign.position.set(0, 0.6, 0);
    const drawSpeed = (k) => {
      const { ctx, w, h } = speedTex.userData; ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#7b5ce0'; ctx.beginPath(); ctx.roundRect(4, 14, w - 8, h - 28, 46); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '500 38px "Geist Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${['standing', 'slow walk', 'fast walk', 'jogging'][k]} · ${eeg.speeds[k]} m/s`, w / 2, h / 2 + 2);
      speedTex.needsUpdate = true;
    };
    let lastK = -1;
    animators.push((t) => {
      const k = Math.floor(t / 2.6) % 4;
      if (k !== lastK) { drawSpeed(k); lastK = k; }
      const prev = (k + 3) % 4, f = Math.min(1, (t % 2.6) / 0.8);
      sensors.forEach((s, i) => {
        const v = eeg.artifact[prev][i] + (eeg.artifact[k][i] - eeg.artifact[prev][i]) * f;
        s.material.color.copy(v < 15 ? OK : v < 40 ? WATCH : BAD);
        s.material.emissive.copy(s.material.color).multiplyScalar(0.25);
      });
      head.position.y = 2.4 + Math.sin(t * Math.PI * 2 * (1 + k * 0.5)) * 0.04 * k;
    });
    place(3, g, 9.5, 1);
    g.updateMatrixWorld();
    speedSign.position.copy(g.localToWorld(new THREE.Vector3(0, 1.6, 7)));
    scene.add(speedSign);
  }

  // 04 Wrist PPG: a giant watch showing the real cleaned pulse
  {
    const g = new THREE.Group();
    g.add(pedestal(8, 5, '#ffe7e2'));
    const strapLo = mesh(rbox(2.6, 4.4, 0.7, 0.3), '#ef5b45'); strapLo.position.y = 2.6; g.add(strapLo);
    const strapHi = mesh(rbox(2.6, 4.4, 0.7, 0.3), '#ef5b45'); strapHi.position.y = 11.4; g.add(strapHi);
    [3.4, 4.4, 10.2, 11.2].forEach((y) => { const hole = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.76, 8), '#c9432f', false); hole.rotation.x = Math.PI / 2; hole.position.set(0, y, 0); g.add(hole); });
    const caseM = mesh(new THREE.CylinderGeometry(3.1, 3.1, 1.1, 48), mat('#26282f', { metalness: 0.35, roughness: 0.4, flatShading: false }));
    caseM.rotation.x = Math.PI / 2; caseM.position.y = 7; g.add(caseM);
    const bezel = mesh(new THREE.TorusGeometry(3.05, 0.2, 10, 48), mat('#c9ced6', { metalness: 0.6, roughness: 0.3, flatShading: false }));
    bezel.position.set(0, 7, 0.55); g.add(bezel);
    const crown = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.6, 12), '#c9ced6'); crown.rotation.z = Math.PI / 2; crown.position.set(3.35, 7, 0); g.add(crown);
    const clean = data.ppg?.clean || Array.from({ length: 640 }, (_, i) => Math.sin(i / 10));
    const fs = data.ppg?.fs || 64;
    const beats = data.ppg?.beats || [];
    const bpm = beats.length > 2 ? Math.round(60 / ((beats[beats.length - 1] - beats[0]) / (beats.length - 1))) : 150;
    const screenTex = canvasTex(512, 512, () => {});
    const drawScreen = (off) => {
      const { ctx, w, h } = screenTex.userData;
      ctx.fillStyle = '#0d0f13'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
      for (let y = 160; y <= 400; y += 40) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(452, y); ctx.stroke(); }
      ctx.fillStyle = '#ff6b55'; ctx.font = '600 54px "Geist"'; ctx.textAlign = 'center';
      ctx.fillText(`♥ ${bpm}`, w / 2, 130);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '500 22px "Geist Mono"';
      ctx.fillText('BPM · RUNNING · CLEANED', w / 2, 442);
      ctx.save(); ctx.shadowColor = '#ff6b55'; ctx.shadowBlur = 14; ctx.strokeStyle = '#ff7a64'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
      ctx.beginPath();
      const n = 150;
      for (let i = 0; i < n; i++) {
        const v = clean[(off + i) % clean.length];
        const x = 60 + (i / (n - 1)) * 392, y = 280 - Math.max(-1.4, Math.min(1.4, v)) * 90;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.restore();
      screenTex.needsUpdate = true;
    };
    drawScreen(0);
    const screen = new THREE.Mesh(new THREE.CircleGeometry(2.75, 48), new THREE.MeshBasicMaterial({ map: screenTex }));
    screen.position.set(0, 7, 0.57); g.add(screen);
    let acc = 0, off = 0;
    animators.push((t, dt) => { acc += dt; if (acc > 1 / 24) { off = (off + Math.round(fs * acc)) % clean.length; acc = 0; drawScreen(off); } });
    place(4, g, 13.6, -1);
  }

  // 05 Chat-to-Pay: a phone with a Hinglish order and a spinning rupee coin
  {
    const g = new THREE.Group();
    g.add(pedestal(11, 5, '#e2f6ea'));
    const phone = mesh(rbox(5, 10, 0.75, 0.7), '#1d1f25'); phone.position.y = 5.9; g.add(phone);
    const chatTex = canvasTex(512, 1024, (ctx, w, h) => {
      ctx.fillStyle = '#f2efe8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, 120);
      ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(w / 2, 52, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '600 24px "Geist"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NV', w / 2, 53);
      ctx.fillStyle = '#17181c'; ctx.font = '500 22px "Geist"'; ctx.fillText('Neha Verma', w / 2, 102);
      let y = 150;
      const bubble = (text, me) => {
        ctx.font = '400 27px "Geist"'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        const lines = wrap(ctx, text, 300), bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 36, bh = lines.length * 34 + 22;
        const x = me ? w - bw - 26 : 26;
        ctx.fillStyle = me ? '#1f7aec' : '#ffffff'; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 24); ctx.fill();
        ctx.fillStyle = me ? '#fff' : '#17181c'; lines.forEach((l, k) => ctx.fillText(l, x + 18, y + 12 + k * 34));
        y += bh + 16;
      };
      bubble('Hi di, ye blue wali kurti available hai?', false);
      bubble('Haan ji available hai 😊', true);
      bubble('M size me 2 chahiye. Aur printed dupatta bhi 1', false);
      bubble('Kothrud, Pune 411038. COD hai kya?', false);
      y += 10;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(26, y, w - 52, 300, 28); ctx.fill();
      ctx.fillStyle = '#8a8d95'; ctx.font = '500 21px "Geist Mono"'; ctx.fillText('ORDER 0046 · HINGLISH', 50, y + 24);
      ctx.fillStyle = '#4a4d55'; ctx.font = '400 26px "Geist"';
      ctx.fillText('2× Blue kurti (M)', 50, y + 70); ctx.textAlign = 'right'; ctx.fillText('₹1,598', w - 50, y + 70);
      ctx.textAlign = 'left'; ctx.fillText('1× Printed dupatta', 50, y + 112); ctx.textAlign = 'right'; ctx.fillText('₹349', w - 50, y + 112);
      ctx.textAlign = 'left'; ctx.fillStyle = '#17181c'; ctx.font = '600 30px "Geist"'; ctx.fillText('Total', 50, y + 168);
      ctx.textAlign = 'right'; ctx.font = '600 44px "Geist"'; ctx.fillText('₹1,947', w - 50, y + 160);
      ctx.fillStyle = '#dff5e8'; ctx.beginPath(); ctx.roundRect(50, y + 222, w - 100, 54, 27); ctx.fill();
      ctx.fillStyle = '#128a4f'; ctx.textAlign = 'center'; ctx.font = '600 25px "Geist"'; ctx.fillText('✓ Payment link ready', w / 2, y + 236);
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 9), new THREE.MeshBasicMaterial({ map: chatTex }));
    screen.position.set(0, 5.9, 0.39); g.add(screen);
    const coinFace = canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e8a60f'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(w / 2, h / 2, 100, 0, 7); ctx.stroke();
      ctx.fillStyle = '#9a6a00'; ctx.font = '700 130px "Geist"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₹', w / 2, h / 2 + 6);
    });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 40), [
      mat('#f0b52a', { metalness: 0.4, roughness: 0.35 }),
      new THREE.MeshStandardMaterial({ map: coinFace, metalness: 0.3, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: coinFace, metalness: 0.3, roughness: 0.4 }),
    ]);
    coin.castShadow = true; coin.rotation.x = Math.PI / 2; coin.position.set(4.6, 9.2, 0.8);
    const coinPivot = new THREE.Group(); coinPivot.position.copy(coin.position); coin.position.set(0, 0, 0); coinPivot.add(coin); g.add(coinPivot);
    animators.push((t) => { coinPivot.rotation.y = t * 1.6; coinPivot.position.y = 9.2 + Math.sin(t * 1.4) * 0.4; });
    place(5, g, 11.5, 1);
  }

  // 06 GNN-DDI: two molecules and a predicted interaction between them
  {
    const g = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(4.6, 5, 0.8, 24), '#dff4f4'); base.position.y = 0.4; g.add(base);
    const post = mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), '#c4d6d6'); post.position.y = 2.6; g.add(post);
    const mol = new THREE.Group(); mol.position.y = 7.2; g.add(mol);
    const atoms = [];
    const ring = (cx, cy, r) => Array.from({ length: 6 }, (_, k) => new THREE.Vector3(cx + Math.cos(Math.PI / 6 + (k / 6) * Math.PI * 2) * r, cy + Math.sin(Math.PI / 6 + (k / 6) * Math.PI * 2) * r, 0));
    const bond = (a, b) => {
      const d = b.clone().sub(a), len = d.length();
      const c = mesh(new THREE.CylinderGeometry(0.13, 0.13, len, 8), '#d8e0e6', false);
      c.position.copy(a).add(b).multiplyScalar(0.5);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      mol.add(c);
    };
    const A = ring(-3, 0, 1.6), B = ring(3, 0.3, 1.6);
    [A, B].forEach((rg) => rg.forEach((p, k) => { bond(p, rg[(k + 1) % 6]); atoms.push(p); }));
    const extra = [[A[2], new THREE.Vector3(-4.8, 2.6, 0)], [A[4], new THREE.Vector3(-4.8, -2.6, 0)], [B[5], new THREE.Vector3(4.6, -2.4, 0)], [B[1], new THREE.Vector3(4.6, 2.8, 0)]];
    extra.forEach(([a, b]) => { bond(a, b); atoms.push(b); });
    atoms.forEach((p, k) => { const s = mesh(new THREE.SphereGeometry(k % 3 === 0 ? 0.62 : 0.5, 16, 12), k % 3 === 0 ? '#0e9c9c' : '#2b3340'); s.position.copy(p); mol.add(s); });
    const link = new THREE.QuadraticBezierCurve3(A[0], new THREE.Vector3(0, 4.6, 0), B[2]);
    const linkM = mesh(new THREE.TubeGeometry(link, 40, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#ff5a36', emissive: '#ff5a36', emissiveIntensity: 0.5 }), false);
    mol.add(linkM);
    const spark = mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd76a' }), false); mol.add(spark);
    animators.push((t) => {
      mol.rotation.y = Math.sin(t * 0.5) * 0.45;
      linkM.material.emissiveIntensity = 0.35 + 0.35 * Math.sin(t * 3);
      spark.position.copy(link.getPoint((t * 0.45) % 1));
    });
    place(6, g, 11.6, -1);
  }

  // 07 Forecasting: one signal split into four modes
  {
    const g = new THREE.Group();
    g.add(pedestal(14, 4, '#e3efff'));
    const waves = [
      { y: 2.4, f: 0.25, a: 0.9, c: '#1d4f99' }, { y: 4.4, f: 0.7, a: 0.7, c: '#2c7dd6' },
      { y: 6.2, f: 1.5, a: 0.5, c: '#5aa2ec' }, { y: 7.8, f: 2.6, a: 0.35, c: '#9cc8f5' },
    ];
    const wave = (fn) => { const pts = []; for (let x = -6.5; x <= 6.5; x += 0.2) pts.push(new THREE.Vector3(x, fn(x), 0)); return new THREE.CatmullRomCurve3(pts); };
    waves.forEach((w) => g.add(mesh(new THREE.TubeGeometry(wave((x) => w.y + Math.sin(x * w.f) * w.a), 160, 0.15, 8), w.c)));
    const sum = (x) => 10.4 + waves.reduce((s, w) => s + Math.sin(x * w.f) * w.a * 0.6, 0);
    g.add(mesh(new THREE.TubeGeometry(wave(sum), 220, 0.22, 8), '#17181c'));
    [-6.8, 6.8].forEach((x) => { const p = mesh(new THREE.CylinderGeometry(0.16, 0.16, 11, 8), '#c9d7e8'); p.position.set(x, 6, -0.4); g.add(p); });
    animators.push((t) => { g.children.slice(1, 6).forEach((m, k) => { m.position.y = Math.sin(t * 1.2 + k) * 0.12; }); });
    place(7, g, 11.8, 1);
  }

  // 08 Papers: a giant paper and three pull-request cards
  {
    const g = new THREE.Group();
    g.add(pedestal(12, 5, '#fbeceb'));
    const paperTex = canvasTex(512, 690, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#8a8d95'; ctx.font = '500 18px "Geist Mono"'; ctx.textAlign = 'center';
      ctx.fillText('IEEE · CIEES 2025 · RUSE, BULGARIA', w / 2, 52);
      ctx.fillStyle = '#17181c'; ctx.font = '400 40px "Instrument Serif"';
      wrap(ctx, 'Benchmarking Machine Learning Techniques in Under-Resourced Contexts', 420).forEach((l, k) => ctx.fillText(l, w / 2, 120 + k * 46));
      ctx.fillStyle = '#e6e6e6';
      for (let k = 0; k < 9; k++) { ctx.fillRect(52, 320 + k * 26, (k % 3 === 2 ? 150 : 190), 10); ctx.fillRect(270, 320 + k * 26, (k % 4 === 3 ? 120 : 190), 10); }
      ctx.fillStyle = '#d23c3c'; ctx.font = '500 20px "Geist Mono"'; ctx.fillText('PEER-REVIEWED', w / 2, 600);
    });
    const paper = mesh(rbox(6.4, 8.6, 0.16, 0.06), '#ffffff'); paper.position.set(-1.8, 5.4, 0); paper.rotation.x = -0.12; g.add(paper);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 8.4), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 }));
    face.position.z = 0.09; paper.add(face);
    ['#1205  HRV tuple fix', '#1206  RQA tests', '#1207  RQA docs'].forEach((txt, k) => {
      const card = mesh(rbox(3.6, 1.5, 0.16, 0.1), '#7b5ce0'); card.position.set(4.2, 1.8 + k * 1.9, 0.4); card.rotation.z = (k - 1) * 0.06; g.add(card);
      const t = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.2), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(440, 160, (ctx, w, h) => {
        ctx.fillStyle = '#fff'; ctx.font = '500 38px "Geist Mono"'; ctx.textBaseline = 'middle'; ctx.fillText('⎇ ' + txt, 18, h / 2);
      }) }));
      t.position.z = 0.09; card.add(t);
    });
    animators.push((t) => { paper.rotation.y = Math.sin(t * 0.6) * 0.12; });
    place(8, g, 10.6, -1);
  }

  // 09 Contact: a mailbox with its flag up
  {
    const g = new THREE.Group();
    g.add(pedestal(7, 5, '#ffe9e1'));
    const post = mesh(new THREE.BoxGeometry(0.6, 4.4, 0.6), '#8a5a3c'); post.position.y = 2.9; g.add(post);
    const boxM = mesh(rbox(2.6, 2.2, 4, 1), '#ff5a36'); boxM.position.y = 6; g.add(boxM);
    const door = mesh(new THREE.CircleGeometry(1.05, 24), '#e8492a'); door.position.set(0, 6, 2.02); g.add(door);
    const flagPole = mesh(new THREE.BoxGeometry(0.16, 2, 0.16), '#c9ced6'); flagPole.position.set(1.4, 7.2, 0.6); g.add(flagPole);
    const flag = mesh(new THREE.BoxGeometry(0.1, 0.7, 1.1), '#ffc83d'); flag.position.set(1.4, 7.9, 1.1); g.add(flag);
    const letter = mesh(rbox(1.6, 0.06, 1.1, 0.03), '#ffffff'); letter.position.set(0, 7.5, 2.6); g.add(letter);
    animators.push((t) => { letter.position.y = 7.4 + Math.sin(t * 2) * 0.5; letter.rotation.z = Math.sin(t * 1.3) * 0.3; flag.rotation.x = Math.sin(t * 3) * 0.12; });
    place(9, g, 9.4, 1);
  }

  // ---------- gates at the start and the finish ----------
  const gate = (u, text, color) => {
    const p = curve.getPointAt(u), t = curve.getTangentAt(u), n = normalAt(u);
    const g = new THREE.Group();
    g.position.copy(p); g.lookAt(p.clone().add(t));
    [-1, 1].forEach((s) => { const post = mesh(rbox(0.7, 7.6, 0.7, 0.2), '#ffffff'); post.position.set(s * 6.2, 3.8, 0); g.add(post); });
    const tex = canvasTex(1024, 180, (ctx, w, h) => {
      for (let x = 0; x < w; x += 30) for (let y = 0; y < 2; y++) { ctx.fillStyle = (x / 30 + y) % 2 ? '#17181c' : '#ffffff'; ctx.fillRect(x, y * 15, 30, 15); ctx.fillRect(x, h - 30 + y * 15, 30, 15); }
      ctx.fillStyle = color; ctx.fillRect(0, 30, w, h - 60);
      ctx.fillStyle = '#ffffff'; ctx.font = '600 66px "Geist"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2 + 2);
    });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 2.2), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
    banner.position.y = 6.6; banner.rotation.y = Math.PI; banner.castShadow = true; g.add(banner);
    scene.add(g);
    void n;
  };
  gate(U[0] + 0.022, 'DRIVE THROUGH MY WORK', '#ff5a36');
  gate(U[LAST] + 0.004, "LET'S TALK", '#17181c');

  // ---------- scenery: trees, rocks, hills, clouds ----------
  {
    const r = rng(11);
    const avoid = (x, z, d) => distToRoad(x, z) < d || landmarks.some((l) => l && Math.hypot(l.pos.x - x, l.pos.z - z) < 11);
    const N = 420;
    const foliage = new THREE.InstancedMesh(new THREE.ConeGeometry(1.7, 4, 7), mat('#ffffff'), N);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.36, 1.4, 6), mat('#9a6b4a'), N);
    foliage.castShadow = trunks.castShadow = true;
    const greens = ['#4fb07a', '#3d9a6a', '#7cc48a', '#2f8a63'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    let placed = 0, tries = 0;
    while (placed < N && tries++ < 8000) {
      const x = -70 + r() * 250, z = 40 - r() * 390;
      if (avoid(x, z, 11)) continue;
      const s = 0.7 + r() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
      m4.compose(pos.set(x, 0.7 * s, z), q, sc.set(s, s, s)); trunks.setMatrixAt(placed, m4);
      m4.compose(pos.set(x, (1.4 + 2) * s, z), q, sc.set(s, s * (0.9 + r() * 0.4), s)); foliage.setMatrixAt(placed, m4);
      foliage.setColorAt(placed, greens[Math.floor(r() * greens.length)]);
      placed++;
    }
    foliage.count = trunks.count = placed;
    scene.add(foliage, trunks);

    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#c9c4b8'), 60);
    rocks.castShadow = true;
    for (let k = 0; k < 60; k++) {
      let x, z; do { x = -50 + r() * 210; z = 30 - r() * 360; } while (avoid(x, z, 7));
      const s = 0.4 + r() * 1.1;
      m4.compose(pos.set(x, s * 0.4, z), q.setFromEuler(new THREE.Euler(r(), r(), r())), sc.set(s, s * 0.7, s)); rocks.setMatrixAt(k, m4);
    }
    scene.add(rocks);

    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2, d = 230 + r() * 60;
      const hill = mesh(new THREE.SphereGeometry(40 + r() * 40, 10, 6), mat(r() > 0.5 ? '#8fcf8c' : '#a6d99a'), false);
      hill.scale.y = 0.35 + r() * 0.3;
      hill.position.set(55 + Math.cos(a) * d, -6, -150 + Math.sin(a) * d);
      scene.add(hill);
    }
  }
  const clouds = [];
  {
    const r = rng(23);
    for (let k = 0; k < 12; k++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = mesh(new THREE.IcosahedronGeometry(2.4 + r() * 2.2, 1), mat('#ffffff', { roughness: 1 }), false);
        puff.position.set(j * 3 - 4.5, r() * 1.4, r() * 2); c.add(puff);
      }
      c.position.set(-60 + r() * 240, 34 + r() * 14, 20 - r() * 360);
      clouds.push(c); scene.add(c);
    }
  }

  // ---------- the car ----------
  const car = new THREE.Group();
  const chassis = new THREE.Group(); car.add(chassis);
  {
    const shell = mesh(rbox(2.5, 1, 4.4, 0.42), mat('#ff5a36', { flatShading: false, roughness: 0.45 })); shell.position.y = 1.05; chassis.add(shell);
    const cabin = mesh(rbox(2.1, 0.95, 2.3, 0.4), mat('#fff6ea', { flatShading: false, roughness: 0.5 })); cabin.position.set(0, 1.95, -0.25); chassis.add(cabin);
    const glass = mesh(rbox(2.14, 0.5, 2.16, 0.18), mat('#2d3644', { flatShading: false, roughness: 0.2, metalness: 0.2 }), false); glass.position.set(0, 2.02, -0.25); chassis.add(glass);
    const stripe = mesh(new THREE.BoxGeometry(0.5, 0.04, 2), mat('#ffffff'), false); stripe.position.set(0, 1.56, 1.1); chassis.add(stripe);
    const bumper = mesh(rbox(2.6, 0.35, 0.4, 0.15), '#2b2d33'); bumper.position.set(0, 0.62, 2.2); chassis.add(bumper);
    const bumperB = bumper.clone(); bumperB.position.z = -2.2; chassis.add(bumperB);
    [-0.8, 0.8].forEach((x) => {
      const hl = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#ffe680', emissiveIntensity: 0.9 }), false);
      hl.rotation.x = Math.PI / 2; hl.position.set(x, 1.05, 2.22); chassis.add(hl);
      const tl = mesh(new THREE.BoxGeometry(0.5, 0.2, 0.08), new THREE.MeshStandardMaterial({ color: '#ff2b2b', emissive: '#ff2b2b', emissiveIntensity: 0.7 }), false);
      tl.position.set(x, 1.1, -2.22); chassis.add(tl);
    });
    const antenna = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), '#2b2d33', false); antenna.position.set(0.7, 2.9, -1); chassis.add(antenna);
    const ball = mesh(new THREE.SphereGeometry(0.16, 10, 8), '#ffc83d', false); ball.position.set(0.7, 3.48, -1); chassis.add(ball);
  }
  const wheels = [];
  [[-1.2, 1.4], [1.2, 1.4], [-1.2, -1.4], [1.2, -1.4]].forEach(([x, z]) => {
    const w = new THREE.Group(); w.position.set(x, 0.52, z);
    const tyre = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.46, 18), '#22242a'); tyre.rotation.z = Math.PI / 2; w.add(tyre);
    const hub = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.48, 10), '#e9e4da', false); hub.rotation.z = Math.PI / 2; w.add(hub);
    car.add(w); wheels.push(w);
  });
  scene.add(car);

  // dust puffs behind the wheels
  const puffs = Array.from({ length: 28 }, () => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: '#f6f0e4', transparent: true, opacity: 0, depthWrite: false }));
    m.userData.life = 0; scene.add(m); return m;
  });
  let puffIdx = 0;

  // ================================================================ driving
  let p = U[0], target = U[0], t = 0, running = false, raf = 0, lastInput = 0;
  let smoothedLook = new THREE.Vector3(), first = true, active = -2;
  const clock = new THREE.Clock();
  const track = document.getElementById('track');
  const hint = document.getElementById('hint');

  const fill = document.createElement('div'); fill.className = 'fill'; track.appendChild(fill);
  const span = U[LAST] - U[0];
  const dots = stopEls.map((el, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.style.left = ((U[i] - U[0]) / span) * 100 + '%'; b.style.setProperty('--c', el.dataset.color);
    b.innerHTML = `<span>${i === 0 ? 'Start' : el.dataset.title}</span>`;
    b.addEventListener('click', () => goTo(i));
    track.appendChild(b); return b;
  });
  const marker = document.createElement('i'); marker.className = 'car'; track.appendChild(marker);

  const clampU = (u) => Math.min(U[LAST], Math.max(U[0], u));
  function goTo(i) { target = U[Math.max(0, Math.min(LAST, i))]; lastInput = performance.now() + 4000; }
  function step(dir) {
    const cur = target;
    const i = dir > 0 ? U.findIndex((u) => u > cur + 0.002) : U.length - 1 - [...U].reverse().findIndex((u) => u < cur - 0.002);
    if (i >= 0 && i <= LAST) goTo(i);
  }
  const nudge = (d) => { target = clampU(target + d); lastInput = performance.now(); };

  // input: wheel / trackpad
  addEventListener('wheel', (e) => {
    if (!running) return;
    const card = e.target.closest?.('.stop');
    if (card && card.scrollHeight > card.clientHeight + 4) return;
    e.preventDefault();
    let d = e.deltaY + e.deltaX;
    if (e.deltaMode === 1) d *= 18; else if (e.deltaMode === 2) d *= innerHeight;
    nudge(Math.max(-120, Math.min(120, d)) * 0.00007);
  }, { passive: false });

  // input: touch swipes
  let tx = 0, ty = 0, touching = false;
  addEventListener('touchstart', (e) => {
    if (!running || e.target.closest('.stop, .hud, .track, .stepper')) { touching = false; return; }
    touching = true; tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (!touching) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    nudge(((ty - y) + (tx - x)) * 0.00032); tx = x; ty = y;
  }, { passive: true });
  addEventListener('touchend', () => { touching = false; });

  // input: keys jump stop to stop
  addEventListener('keydown', (e) => {
    if (!running || e.target.closest?.('input, textarea')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); step(1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
    if (e.key === 'Home') goTo(0);
    if (e.key === 'End') goTo(LAST);
  });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : 42;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const tmp = new THREE.Vector3(), desired = new THREE.Vector3(), look = new THREE.Vector3();

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    // settle onto the nearest stop once the reader stops scrolling
    if (performance.now() - lastInput > 420) {
      let best = 0; U.forEach((u, i) => { if (Math.abs(u - target) < Math.abs(U[best] - target)) best = i; });
      if (Math.abs(U[best] - target) < 0.05) target += (U[best] - target) * Math.min(1, dt * 4);
    }

    // move along the road with an eased, speed-limited approach
    const diff = target - p;
    let dp = diff * (1 - Math.exp(-dt * 2.3));
    const maxDp = dt * 0.055;
    dp = Math.max(-maxDp, Math.min(maxDp, dp));
    p += dp;
    if (Math.abs(target - p) < 0.00005) p = target;
    const speed = dp / Math.max(dt, 1e-4) * LEN;

    const pos = curve.getPointAt(p), tan = curve.getTangentAt(p), n = normalAt(p);
    car.position.copy(pos);
    car.lookAt(tmp.copy(pos).add(tan));
    wheels.forEach((w) => { w.rotation.x += (dp * LEN) / 0.52; });
    const ahead = curve.getTangentAt(Math.min(1, p + 0.006));
    const turn = tan.x * ahead.z - tan.z * ahead.x;
    chassis.rotation.z += (Math.max(-0.1, Math.min(0.1, turn * speed * 0.9)) - chassis.rotation.z) * Math.min(1, dt * 5);
    chassis.rotation.x += (Math.max(-0.05, Math.min(0.05, -dp * 3)) - chassis.rotation.x) * Math.min(1, dt * 4);
    chassis.position.y = Math.abs(speed) > 1 ? Math.sin(t * 22) * 0.025 : 0;

    // dust
    if (Math.abs(speed) > 6 && Math.random() < Math.min(0.5, Math.abs(speed) / 70)) {
      const m = puffs[puffIdx++ % puffs.length];
      m.position.copy(pos).addScaledVector(tan, -2.2 * Math.sign(speed)).addScaledVector(n, (Math.random() - 0.5) * 2.4); m.position.y = 0.3;
      m.userData.life = 1; m.scale.setScalar(0.6);
    }
    puffs.forEach((m) => {
      if (m.userData.life <= 0) return;
      m.userData.life -= dt * 1.3; m.position.y += dt * 0.9; m.scale.multiplyScalar(1 + dt * 1.4);
      m.material.opacity = Math.max(0, m.userData.life) * 0.45;
    });

    // which stop are we at?
    let near = -1, closeness = 0;
    U.forEach((u, i) => { const c = 1 - Math.abs(p - u) / 0.032; if (c > closeness) { closeness = c; near = i; } });
    const showing = closeness > 0.35 ? near : -1;
    if (showing !== active) {
      active = showing;
      stopEls.forEach((el, i) => el.classList.toggle('active', i === active));
      dots.forEach((d, i) => d.classList.toggle('on', i === active));
      hint.classList.toggle('hide', active !== -1);
    }

    // chase camera between stops; at a stop it steps back across the road and frames the
    // landmark on the side of the screen away from the card (right on desktop, top on phones)
    const narrow = camera.aspect < 0.8;
    const lm = landmarks[near];
    const w = lm ? Math.max(0, Math.min(1, closeness * 1.3)) ** 2 : 0;
    desired.copy(pos)
      .addScaledVector(tan, narrow ? -20 : -16)
      .addScaledVector(n, narrow ? 0 : 3)
      .add(tmp.set(0, narrow ? 13 : 10, 0));
    look.copy(pos).addScaledVector(tan, 7).add(tmp.set(0, 1.5, 0));
    if (lm) {
      const rp = curve.getPointAt(U[near]);
      const toLm = new THREE.Vector3(lm.pos.x - rp.x, 0, lm.pos.z - rp.z).normalize();
      const right = new THREE.Vector3().crossVectors(toLm, new THREE.Vector3(0, 1, 0)).normalize();
      const centre = new THREE.Vector3(lm.pos.x, lm.height * 0.48, lm.pos.z);
      const view = rp.clone().addScaledVector(toLm, narrow ? -20 : -15).addScaledVector(curve.getTangentAt(U[near]), -6)
        .add(new THREE.Vector3(0, narrow ? 10 : 9, 0));
      // shift the aim left on wide screens so the landmark sits clear of the card
      const shift = narrow ? 0 : Math.max(0, Math.min(8, (camera.aspect - 0.85) * 9));
      const aim = centre.clone().addScaledVector(right, -shift).add(new THREE.Vector3(0, narrow ? -5.5 : 0, 0));
      desired.lerp(view, w);
      look.lerp(aim, w);
    }
    if (first) { camera.position.copy(desired); smoothedLook.copy(look); first = false; }
    camera.position.lerp(desired, 1 - Math.exp(-dt * 3));
    smoothedLook.lerp(look, 1 - Math.exp(-dt * 4));
    camera.lookAt(smoothedLook);

    sun.position.copy(pos).add(tmp.set(30, 48, 22));
    sun.target.position.copy(pos);

    animators.forEach((fn) => fn(t, dt));
    clouds.forEach((c, k) => { c.position.x += dt * (0.6 + (k % 3) * 0.3); if (c.position.x > 200) c.position.x = -80; });

    // the little progress track
    const f = ((p - U[0]) / span) * 100;
    marker.style.left = f + '%'; fill.style.width = f + '%';

    renderer.render(scene, camera);
  }

  return {
    goTo, step,
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (running) return; running = true; clock.getDelta(); resize(); frame(); },
  };
}
