// js/core.js - Utility di base, costanti, animazioni e disegnatori condivisi
document.documentElement.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => {
  x = clamp((x - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const hexv = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => {
  const A = hexv(a), B = hexv(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
};
const ramp = (st, t) => {
  for (let i = 0; i < st.length - 1; i++) {
    if (t <= st[i + 1][0]) {
      return mix(st[i][1], st[i + 1][1], clamp((t - st[i][0]) / (st[i + 1][0] - st[i][0])));
    }
  }
  return mix(st.at(-1)[1], st.at(-1)[1], 0);
};
const rnd = (a, b) => a + Math.random() * (b - a);
const FONT = () => getComputedStyle(document.body).fontFamily;

// Registro scene canvas
const scenes = {};

// Helper makeScene per gestione Canvas HiDPI e ciclo di rendering
function makeScene(canvas, draw, opt = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = 0, run = false, last = 0;
  const S = { ctx, get w() { return w; }, get h() { return h; }, time: 0 };

  function size() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (opt.onSize) opt.onSize(w, h);
    if (!run) frame(performance.now(), true);
  }

  function frame(now, once) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (run) S.time += dt * (opt.speed || 1);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h, S.time, dt, S);
    if (run && !once) raf = requestAnimationFrame(frame);
  }

  S.start = () => {
    if (run) return;
    run = true;
    S.time = 0;
    last = performance.now();
    size();
    raf = requestAnimationFrame(frame);
  };
  S.stop = () => {
    run = false;
    cancelAnimationFrame(raf);
  };
  S.redraw = () => frame(performance.now(), true);
  S.size = size;

  new ResizeObserver(() => {
    if (canvas.offsetParent !== null || run) size();
  }).observe(canvas);

  return S;
}

// Stelle di sfondo per le scene cosmiche
const BGS = Array.from({ length: 240 }, () => ({
  x: Math.random(),
  y: Math.random(),
  s: Math.random() < 0.08 ? 2.6 : rnd(0.8, 1.6),
  p: rnd(0, TAU),
  f: rnd(0.5, 1.8),
  z: rnd(0.25, 1)
}));

function bgStars(ctx, w, h, t, ox = 0, oy = 0, a = 0.8) {
  ctx.fillStyle = '#ece6d6';
  BGS.forEach(s => {
    ctx.globalAlpha = a * (0.2 + 0.8 * Math.abs(Math.sin(t * s.f + s.p))) * s.z;
    ctx.fillRect(
      ((s.x * w + ox * s.z * 60) % w + w) % w,
      ((s.y * h + oy * s.z * 40) % h + h) % h,
      s.s,
      s.s
    );
  });
  ctx.globalAlpha = 1;
}

// Puntatore / Pointer globale
const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', e => {
  ptr.x = e.clientX / window.innerWidth - 0.5;
  ptr.y = e.clientY / window.innerHeight - 0.5;
});

// Dati dei pianeti
const PL = [
  { n: 'mercurio', f: 0.14, r: 4.5, c: '#b9b1a6', fam: 'pianeta roccioso (terrestre)', t: 'Il più piccolo e vicino al Sole: zero atmosfera, superficie piena di crateri.' },
  { n: 'venere', f: 0.21, r: 7.5, c: '#e8c07a', fam: 'pianeta roccioso (terrestre)', t: 'Il più caldo (460 °C) per l’effetto serra di CO₂; ruota da Est a Ovest.' },
  { n: 'terra', f: 0.285, r: 8, c: '#4a93e0', fam: 'pianeta roccioso (terrestre)', t: '71% acqua liquida, atmosfera con ossigeno e vita. Ha 1 satellite (la Luna).' },
  { n: 'marte', f: 0.36, r: 6, c: '#e0583a', fam: 'pianeta roccioso (terrestre)', t: 'Il pianeta rosso (ossidi di ferro), con calotte di ghiaccio e 2 piccole lune.' },
  { n: 'giove', f: 0.52, r: 19, c: '#dba878', fam: 'gigante gassoso (gioviano)', t: 'Il più grande del Sistema Solare: fatto di idrogeno ed elio, con decine di lune.' },
  { n: 'saturno', f: 0.65, r: 15, c: '#ecd592', fam: 'gigante gassoso (gioviano)', ring: 1, t: 'Famoso per i grandi anelli di ghiaccio, polveri e roccia in orbita.' },
  { n: 'urano', f: 0.77, r: 11, c: '#8fd8e4', fam: 'gigante ghiacciato (gioviano)', t: 'Azzurro per il metano; ruota "sdraiato" con l’asse inclinato di 98°.' },
  { n: 'nettuno', f: 0.89, r: 11, c: '#4f78e0', fam: 'gigante ghiacciato (gioviano)', t: 'Il più lontano dal Sole: azzurro intenso e venti fino a 2 100 km/h.' }
];
PL.forEach((p, i) => { p.ph = i * 2.1 + 0.7; });

const belt = Array.from({ length: 150 }, () => ({
  a: Math.random() * TAU,
  r: 0.425 + (Math.random() - 0.5) * 0.05,
  s: Math.random() * 1.6 + 0.6
}));
const kuiper = Array.from({ length: 120 }, () => ({
  a: Math.random() * TAU,
  r: 0.965 + Math.random() * 0.05,
  s: Math.random() * 1.6 + 0.6
}));

function drawSystem(ctx, cx, cy, R, time, o = {}) {
  const pos = [], A0 = ctx.globalAlpha;
  const cols = ['#0e2740', '#0b1f33'];
  [1.02, ...PL.map(p => p.f + 0.045)].reverse().forEach((f, i) => {
    ctx.fillStyle = cols[i % 2];
    ctx.beginPath();
    ctx.arc(cx, cy, R * f, 0, TAU);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(236,230,214,.55)';
  belt.forEach(b => {
    const a = b.a + time * 0.05;
    ctx.fillRect(cx + Math.cos(a) * R * b.r, cy + Math.sin(a) * R * b.r, b.s, b.s);
  });

  ctx.fillStyle = 'rgba(236,230,214,.3)';
  kuiper.forEach(b => {
    const a = b.a + time * 0.01;
    ctx.fillRect(cx + Math.cos(a) * R * b.r, cy + Math.sin(a) * R * b.r, b.s, b.s);
  });

  // Sole
  const sr = R * 0.07, sc = o.sun || '#f0a81a';
  [[2.6, 0.1], [2.0, 0.16], [1.45, 0.28]].forEach(([k, a]) => {
    ctx.globalAlpha = A0 * a;
    ctx.fillStyle = sc;
    ctx.beginPath();
    ctx.arc(cx, cy, sr * k, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = A0;
  ctx.fillStyle = sc;
  ctx.beginPath();
  ctx.arc(cx, cy, sr, 0, TAU);
  ctx.fill();

  const k = (o.speed || 1) * 0.9, sz = o.sz || 1;
  PL.forEach((p, i) => {
    const r = R * p.f, a = p.ph + time * k * Math.pow(0.14 / p.f, 1.5);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const pr = Math.max(3, p.r * sz * (R / 420));
    const sel = o.sel === i;

    if (sel) {
      ctx.fillStyle = p.c;
      ctx.globalAlpha = A0 * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, pr * 2.8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = A0 * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, pr * 1.9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = A0;
    }

    if (p.ring) {
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = A0 * 0.8;
      ctx.lineWidth = pr * 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, pr * 2, pr * 0.8, -0.4, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = A0;
    }

    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, TAU);
    ctx.fill();

    if (o.labels) {
      ctx.fillStyle = `rgba(236,230,214,${o.labels * A0})`;
      ctx.font = '600 15px ' + FONT();
      ctx.textAlign = 'left';
      ctx.fillText(p.n, x + pr + 8, y + 5);
    }
    pos[i] = { x, y, r: pr };
  });

  ctx.globalAlpha = A0;
  return pos;
}

// Globo puntinato
const LAND = [
  [[-168,66],[-141,70],[-120,70],[-95,72],[-80,73],[-62,60],[-56,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,25],[-84,30],[-90,29],[-97,26],[-97,20],[-90,21],[-87,21],[-83,15],[-78,9],[-80,8],[-86,11],[-92,15],[-105,20],[-110,24],[-112,30],[-117,32],[-124,40],[-124,48],[-135,58],[-150,60],[-165,60]],
  [[-55,60],[-45,60],[-20,70],[-20,82],[-60,82],[-70,76]],
  [[-80,9],[-72,12],[-62,10],[-52,5],[-50,0],[-35,-6],[-39,-14],[-41,-22],[-48,-26],[-58,-35],[-65,-41],[-68,-52],[-72,-54],[-74,-46],[-72,-30],[-71,-18],[-76,-14],[-81,-6],[-80,0]],
  [[-10,36],[-9,43],[-2,44],[-5,48],[2,51],[8,54],[10,58],[5,62],[15,69],[28,71],[45,68],[60,70],[80,73],[100,77],[115,74],[140,72],[160,70],[180,68],[180,65],[170,60],[160,55],[156,51],[142,53],[140,48],[135,43],[128,38],[126,34],[121,31],[120,24],[110,20],[106,10],[104,1],[100,13],[98,16],[93,20],[88,22],[80,15],[77,8],[73,18],[69,22],[62,25],[57,26],[59,22],[52,16],[43,13],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[23,38],[19,40],[16,38],[12,42],[8,44],[3,43],[-2,37]],
  [[-17,21],[-10,30],[-6,36],[10,37],[11,33],[20,31],[32,31],[35,28],[43,12],[51,12],[40,-3],[40,-15],[35,-24],[32,-29],[20,-35],[18,-32],[12,-17],[9,-1],[9,4],[-8,4],[-17,14]],
  [[114,-22],[122,-18],[131,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-34],[115,-34]],
  [[-180,-70],[-120,-74],[-60,-65],[0,-70],[60,-67],[120,-66],[180,-70],[180,-90],[-180,-90]],
  [[-5,50],[1,51],[-2,58],[-6,56]],[[130,32],[141,41],[144,44],[140,36]],[[44,-25],[50,-15],[49,-12],[44,-17]],[[109,1],[117,7],[119,1],[116,-4],[110,-3]],[[95,5],[106,-6],[104,-6],[98,0]]
];

function inPoly(x, y, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const DOTS = [];
for (let lat = -87; lat <= 87; lat += 3) {
  const n = Math.max(1, Math.round(120 * Math.cos(lat * Math.PI / 180)));
  for (let i = 0; i < n; i++) {
    const lon = -180 + (i + 0.5) * (360 / n);
    if (LAND.some(p => inPoly(lon, lat, p))) {
      DOTS.push([lat * Math.PI / 180, lon * Math.PI / 180]);
    }
  }
}

function drawGlobe(ctx, cx, cy, r, lon0, tilt, o = {}) {
  const base = ctx.globalAlpha, ocean = o.ocean || '#1d5c9e', land = o.land || '#ece6d6', la = o.landAlpha ?? 1;
  if (o.rim !== false) {
    [[0.075, 0.05], [0.045, 0.09], [0.02, 0.16]].forEach(([k, a]) => {
      ctx.globalAlpha = base * a * (o.rimA ?? 1);
      ctx.fillStyle = '#7fc0ff';
      ctx.beginPath();
      ctx.arc(cx, cy, r * (1 + k), 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = base;
  }
  ctx.fillStyle = ocean;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();

  const ca = Math.cos(-tilt), sa = Math.sin(-tilt);
  const dr = Math.min(r * 0.024, o.maxDot || 9);
  ctx.globalAlpha = base * la;
  for (const [phi, lam0] of DOTS) {
    const lam = lam0 - lon0, cp = Math.cos(phi);
    const x = cp * Math.sin(lam), y = Math.sin(phi), z = cp * Math.cos(lam);
    if (z <= 0.02) continue;
    const X = x * ca - y * sa, Y = x * sa + y * ca;
    const k = clamp((X + 0.5) / 1.1);
    ctx.fillStyle = mix('#4d6f93', land, k);
    ctx.beginPath();
    ctx.arc(cx + X * r, cy - Y * r, dr * (0.35 + 0.65 * z), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = base;
  if (o.night !== false) {
    ctx.fillStyle = 'rgba(4,10,20,.24)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
  }
}
