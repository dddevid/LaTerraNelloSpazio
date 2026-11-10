// js/space.js - Scene astronomiche: Cover, Sole, Stelle (Colore = Temperatura), Pianeti, Globo, Stagioni, Luna

// 1. Cover
scenes.cover = c => makeScene(c, (ctx, w, h, t) => {
  ptr.sx += (ptr.x - ptr.sx) * 0.06;
  ptr.sy += (ptr.y - ptr.sy) * 0.06;
  bgStars(ctx, w, h, t, -ptr.sx, -ptr.sy, 0.85);
  const R = Math.min(h * 0.52, w * 0.3);
  drawSystem(ctx, w * 0.8 - ptr.sx * 46, h * 0.42 - ptr.sy * 30, R, t, { speed: 0.7, sz: 1.1 });
});

// 2. Sole: Strati interattivi sia da elenco testo che direttamente toccando l'SVG
(function() {
  const wrap = $('#sunwrap');
  if (!wrap) return;
  const btns = $$('.layer'), ly = $$('.ly', wrap);
  let i = 2, timer = null;

  function on(k) {
    btns.forEach(b => b.classList.toggle('on', b.dataset.k === k));
    ly.forEach(l => l.classList.toggle('on', l.dataset.k === k));
    wrap.classList.add('has-on');
  }

  btns.forEach((b, j) => {
    const pick = () => {
      clearInterval(timer);
      i = j;
      on(b.dataset.k);
    };
    b.addEventListener('pointerdown', pick);
    b.addEventListener('click', pick);
    b.addEventListener('focus', pick);
  });

  ly.forEach(l => {
    const pick = e => {
      e.stopPropagation();
      clearInterval(timer);
      const k = l.dataset.k;
      const idx = btns.findIndex(b => b.dataset.k === k);
      if (idx >= 0) i = idx;
      on(k);
    };
    l.addEventListener('pointerdown', pick);
    l.addEventListener('click', pick);
  });

  window.sunStart = () => {
    clearInterval(timer);
    if (btns[i]) on(btns[i].dataset.k);
    timer = setInterval(() => {
      i = (i + 1) % btns.length;
      if (btns[i]) on(btns[i].dataset.k);
    }, 4200);
  };
  window.sunStop = () => clearInterval(timer);
})();

// 3. Stelle: Esploratore interattivo Colore ↔ Temperatura Superficiale
const STAR_DATA = [
  {
    cls: 'Classe M · Rossa',
    temp: '2 500 – 3 500 K (~2 700 °C)',
    tNum: 3000,
    col: '#ff4d2e',
    core: '#ff9678',
    glow: 'rgba(255,77,46,',
    rad: 0.58,
    title: 'Stella Rossa · 3 000 K',
    desc: 'La più fredda · brucia piano e vive centinaia di miliardi di anni.',
    ex: 'Es: Proxima Centauri, Betelgeuse.'
  },
  {
    cls: 'Classe K · Arancione',
    temp: '3 500 – 5 000 K (~4 000 °C)',
    tNum: 4200,
    col: '#ff9636',
    core: '#ffd296',
    glow: 'rgba(255,150,54,',
    rad: 0.72,
    title: 'Stella Arancione · 4 200 K',
    desc: 'Più fredda del Sole · stabile e molto longeva.',
    ex: 'Es: Aldebaran (Toro), Arturo (Boote).'
  },
  {
    cls: 'Classe G · Il Sole',
    temp: '5 000 – 6 000 K (~5 500 °C)',
    tNum: 5800,
    col: '#ffd859',
    core: '#fff7d6',
    glow: 'rgba(255,216,89,',
    rad: 0.86,
    title: 'Stella Gialla · 5 800 K',
    desc: 'Come il Sole (~5 500 °C) · stabile per 10 miliardi di anni.',
    ex: 'Es: Sole, Alfa Centauri A, Capella.'
  },
  {
    cls: 'Classe A · Bianca',
    temp: '7 500 – 10 000 K (~9 200 °C)',
    tNum: 9500,
    col: '#f2f5ff',
    core: '#ffffff',
    glow: 'rgba(220,232,255,',
    rad: 1.05,
    title: 'Stella Bianca · 9 500 K',
    desc: 'Caldissima e brillante · emette tutti i colori visibili.',
    ex: 'Es: Sirio, Vega, Altair.'
  },
  {
    cls: 'Classe O / B · Blu',
    temp: '20 000 – 40 000 K (~35 000 °C)',
    tNum: 35000,
    col: '#6eb2ff',
    core: '#e3f1ff',
    glow: 'rgba(110,178,255,',
    rad: 1.28,
    title: 'Stella Blu · 35 000 K',
    desc: 'Super-massiccia · vive pochi milioni di anni → supernova.',
    ex: 'Es: Rigel (Orione), Spica, Pleiadi.'
  }
];

let selStar = 2; // Default: Gialla (Il Sole)
let starScene = null;

function pickStar(i) {
  selStar = clamp(i, 0, STAR_DATA.length - 1);
  const d = STAR_DATA[selStar];
  $$('.st-btn').forEach((b, idx) => {
    b.classList.toggle('on', idx === selStar);
    b.setAttribute('aria-pressed', idx === selStar);
  });
  const card = $('#st-card');
  if (card) {
    card.style.setProperty('--sc', d.col);
    const h3 = $('#st-title'), cl = $('#st-cls'), desc = $('#st-desc'), ex = $('#st-ex');
    if (h3) h3.textContent = d.title;
    if (cl) cl.textContent = d.cls;
    if (desc) desc.textContent = d.desc;
    if (ex) ex.textContent = d.ex;
  }
  if (starScene) starScene.redraw();
}

(function initStarsUI() {
  $$('.st-btn').forEach((b, idx) => {
    const go = () => pickStar(idx);
    b.addEventListener('click', go);
    b.addEventListener('pointerdown', go);
  });
  pickStar(2);
})();

scenes.stelle = c => {
  let dragging = false;
  function handleBarTouch(clientX, clientY) {
    const r = c.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    // Se tocca nella fascia bassa (barra termometro) o una delle 5 posizioni
    const ratio = clamp((x - r.width * 0.1) / (r.width * 0.8), 0, 0.999);
    const idx = Math.floor(ratio * STAR_DATA.length);
    pickStar(idx);
  }

  c.addEventListener('pointerdown', e => {
    dragging = true;
    c.setPointerCapture(e.pointerId);
    handleBarTouch(e.clientX, e.clientY);
  });
  c.addEventListener('pointermove', e => {
    if (dragging) handleBarTouch(e.clientX, e.clientY);
  });
  c.addEventListener('pointerup', () => { dragging = false; });
  c.addEventListener('pointercancel', () => { dragging = false; });

  starScene = makeScene(c, (ctx, w, h, t) => {
    bgStars(ctx, w, h, t, 0, 0, 0.65);
    const d = STAR_DATA[selStar];
    const cx = w * 0.52, cy = h * 0.42;
    const baseR = Math.min(w, h) * 0.22;
    const R = baseR * d.rad * (1 + 0.018 * Math.sin(t * 2.6));

    // Aloni luminosi (corona)
    [[2.4, 0.09], [1.75, 0.18], [1.3, 0.34]].forEach(([k, a]) => {
      ctx.fillStyle = d.glow + a + ')';
      ctx.beginPath();
      ctx.arc(cx, cy, R * k, 0, TAU);
      ctx.fill();
    });

    // Raggi / protuberanze animate
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.15);
    ctx.strokeStyle = d.glow + '0.35)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * TAU;
      const len = R * (1.15 + 0.14 * Math.sin(t * 3 + i * 1.7));
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * R * 0.95, Math.sin(ang) * R * 0.95);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();

    // Corpo della stella con gradiente radiale
    const grad = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
    grad.addColorStop(0, d.core);
    grad.addColorStop(0.65, d.col);
    grad.addColorStop(1, mix(d.col, '#08101a', 0.35));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();

    // Confronto tratteggiato con la dimensione del Sole (se non è selezionato il Sole)
    const sunR = baseR * STAR_DATA[2].rad;
    if (selStar !== 2) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255,216,89,.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffd859';
      ctx.font = '600 13px ' + FONT();
      ctx.textAlign = 'center';
      ctx.fillText('dimensione Sole (5 800 K)', cx, cy + sunR + 18);
    }

    // Etichetta temperatura al centro in alto
    const fam = FONT();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(Math.min(w, h) * 0.068) + 'px ' + fam;
    ctx.fillText(d.tNum.toLocaleString('it-IT') + ' K', cx, h * 0.09);
    ctx.font = '600 14px ' + fam;
    ctx.fillStyle = d.col;
    ctx.fillText(d.cls, cx, h * 0.14);

    // Barra termometro spettrale interattiva in basso nel canvas
    const bx = w * 0.08, bw = w * 0.84, by = h * 0.83, bh = 18;
    const barGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    barGrad.addColorStop(0, '#ff4d2e');
    barGrad.addColorStop(0.25, '#ff9636');
    barGrad.addColorStop(0.5, '#ffd859');
    barGrad.addColorStop(0.75, '#f2f5ff');
    barGrad.addColorStop(1, '#6eb2ff');

    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 9) : ctx.rect(bx, by, bw, bh);
    ctx.fill();

    // Indicatore posizione corrente sulla barra
    const px = bx + ((selStar + 0.5) / STAR_DATA.length) * bw;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#08101a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, by + bh / 2, 13, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 13px ' + fam;
    ctx.fillStyle = '#ff6b52';
    ctx.textAlign = 'left';
    ctx.fillText('← Più fredde (2 500 K · Rosse)', bx, by + bh + 22);
    ctx.fillStyle = '#8ec5ff';
    ctx.textAlign = 'right';
    ctx.fillText('Più calde (40 000 K · Blu) →', bx + bw, by + bh + 22);
  });

  return starScene;
};

// 4. Pianeti: Canvas e chip selezionabili al tocco
let selP = 2, planetPos = [];
scenes.pianeti = c => {
  const S = makeScene(c, (ctx, w, h, t) => {
    bgStars(ctx, w, h, t, 0, 0, 0.6);
    const R = Math.min(h * 0.45, w * 0.27);
    planetPos = drawSystem(ctx, w * 0.70, h * 0.5, R, t, { sel: selP, labels: 0.85, speed: 0.8 });
    S.cx = w * 0.70;
  });

  function handleHit(clientX, clientY) {
    const r = c.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let b = -1, bd = 1e9;
    planetPos.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd && d < p.r + 32) {
        bd = d;
        b = i;
      }
    });
    if (b >= 0) pickPlanet(b);
  }

  c.addEventListener('click', e => handleHit(e.clientX, e.clientY));
  c.addEventListener('pointerdown', e => handleHit(e.clientX, e.clientY));
  c.style.cursor = 'pointer';
  return S;
};

const pn = $('#pname'), pf = $('#pfam'), pt = $('#ptxt'), pc = $('#pchips');
if (pc) {
  PL.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.p = i;
    b.textContent = p.n;
    b.setAttribute('aria-pressed', i === selP);
    b.onclick = () => pickPlanet(i);
    pc.append(b);
  });
}

function pickPlanet(i) {
  selP = i;
  const p = PL[i];
  if (pn) pn.textContent = p.n;
  if (pf) pf.textContent = p.fam;
  if (pt) pt.textContent = p.t;
  if (pn && pn.parentElement) pn.parentElement.style.setProperty('--pc', p.c);
  $$('.chip', pc).forEach((b, j) => b.setAttribute('aria-pressed', j === i));
  const pe = $('.pan');
  if (pe) {
    pe.classList.remove('swap');
    void pe.offsetWidth;
    pe.classList.add('swap');
  }
}
pickPlanet(2);

// 5. Rotazione terrestre con globo
scenes.globe = c => makeScene(c, (ctx, w, h, t) => {
  const r = Math.min(w, h) * 0.44;
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r * 1.12, 0, TAU);
  ctx.fill();

  const T = 23.44 * Math.PI / 180;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(T);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2.5, -r * 1.15, 5, r * 2.3);
  ctx.restore();

  drawGlobe(ctx, w / 2, h / 2, r, -t * 0.55, T, { ocean: '#1c5088', land: '#ece6d6', rim: false });
});

// 6. Stagioni: Slider touch + tocco/trascinamento diretto sull'orbita
const yr = $('#yr');
let yrAuto = true, yrP = 0, S6 = null;
const EV = [
  [0, 'equinozio di primavera'],
  [0.25, 'solstizio d’estate'],
  [0.5, 'equinozio d’autunno'],
  [0.75, 'solstizio d’inverno']
];
const SEA = ['primavera', 'estate', 'autunno', 'inverno'];

if (yr) {
  const updateYr = () => {
    yrAuto = false;
    yrP = yr.value / 1000;
    if (S6) S6.redraw();
    info6();
  };
  yr.addEventListener('input', updateYr);
  yr.addEventListener('change', updateYr);
}

function info6() {
  const p = ((yrP % 1) + 1) % 1;
  const dec = 23.44 * Math.sin(TAU * p);
  let near = null;
  EV.forEach(([e, n]) => {
    const d = Math.min(Math.abs(p - e), 1 - Math.abs(p - e));
    if (d < 0.035) near = n;
  });

  const sev = $('#sev'), szen = $('#szen');
  if (sev) sev.textContent = near || SEA[Math.floor(p * 4) % 4];
  const lat = Math.abs(dec);
  const zone = Math.abs(dec) < 1.2
    ? 'sull’Equatore'
    : (dec > 0 ? 'a ' + Math.round(lat) + '° Nord (Tropico del Cancro)' : 'a ' + Math.round(lat) + '° Sud (Tropico del Capricorno)');
  const arc = Math.abs(dec) < 1.2
    ? '12h di luce e 12h di buio ovunque.'
    : (dec > 0 ? 'Più luce nell’emisfero Nord.' : 'Più luce nell’emisfero Sud.');

  if (szen) szen.innerHTML = 'Sole allo zenit <b>' + zone + '</b> · ' + arc;
}

scenes.stagioni = c => {
  let dragging = false;
  let cx = 0, cy = 0, R = 0;

  function hitOrbit(clientX, clientY) {
    const rect = c.getBoundingClientRect();
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;
    let deg = Math.atan2(y, x) * 180 / Math.PI;
    let p = (270 - deg) / 360;
    yrP = ((p % 1) + 1) % 1;
    if (yr) yr.value = Math.round(yrP * 1000);
    yrAuto = false;
    info6();
    if (S6) S6.redraw();
  }

  c.addEventListener('pointerdown', e => {
    dragging = true;
    c.setPointerCapture(e.pointerId);
    hitOrbit(e.clientX, e.clientY);
  });
  c.addEventListener('pointermove', e => {
    if (dragging) hitOrbit(e.clientX, e.clientY);
  });
  c.addEventListener('pointerup', () => { dragging = false; });
  c.addEventListener('pointercancel', () => { dragging = false; });

  S6 = makeScene(c, (ctx, w, h, t, dt) => {
    if (yrAuto) {
      yrP = (yrP + dt / 26) % 1;
      if (yr) yr.value = Math.round(yrP * 1000);
    }
    info6();

    cx = w * 0.72;
    cy = h * 0.46;
    R = Math.min(h * 0.31, w * 0.205);

    ctx.fillStyle = '#e4dcc6'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d9cfb3'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ece6d6'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.98, 0, TAU); ctx.fill();

    [[2.4, 0.12], [1.8, 0.2], [1.35, 0.3]].forEach(([k, a]) => {
      ctx.globalAlpha = a; ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.14 * k, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.14, 0, TAU); ctx.fill();

    const p = ((yrP % 1) + 1) % 1;
    EV.forEach(([e]) => {
      const a = (270 - 360 * e) * Math.PI / 180;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      ctx.fillStyle = 'rgba(15,20,24,.25)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
    });

    const a = (270 - 360 * p) * Math.PI / 180;
    const ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
    const er = Math.max(18, R * 0.15);
    const T = 23.44 * Math.PI / 180, ux = Math.sin(T), uy = -Math.cos(T);

    ctx.strokeStyle = '#0f1418'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - ux * er * 1.7, ey - uy * er * 1.7); ctx.lineTo(ex + ux * er * 1.7, ey + uy * er * 1.7); ctx.stroke();

    ctx.fillStyle = '#1d5c9e'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();

    const sa = Math.atan2(cy - ey, cx - ex);
    ctx.fillStyle = '#4a93e0'; ctx.beginPath(); ctx.arc(ex, ey, er, sa - Math.PI / 2, sa + Math.PI / 2); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + ux * er * 0.92, ey + uy * er * 0.92, er * 0.22, 0, TAU); ctx.fill();

    ctx.fillStyle = '#0f1418'; ctx.font = '700 14px ' + FONT(); ctx.textAlign = 'center';
    const ex2 = [
      ['eq. primavera', cx, cy - R * 1.13],
      ['sol. estate', cx - R, cy - er - 14],
      ['eq. autunno', cx, cy + R * 1.17],
      ['sol. inverno', cx + R, cy - er - 14]
    ];
    ex2.forEach(([n, lx, ly]) => {
      ctx.globalAlpha = 0.78;
      ctx.fillText(n, lx, ly);
      ctx.globalAlpha = 1;
    });
  });
  return S6;
};

// 7. Luna: Orbita, fasi lunari touch-friendly
const PH = ['novilunio', 'primo quarto', 'plenilunio', 'ultimo quarto'];
function drawPhase(ctx, cx, cy, r, p, dark, lit) {
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  const c = Math.cos(TAU * p), dir = p < 0.5 ? 1 : -1;
  ctx.fillStyle = lit; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, dir < 0);
  for (let i = 0; i <= 48; i++) {
    const t = Math.PI / 2 - (i / 48) * Math.PI;
    ctx.lineTo(cx + dir * r * c * Math.cos(t), cy + r * Math.sin(t));
  }
  ctx.closePath(); ctx.fill();
}

const phEl = $('#phases');
const phC = [];
let moonAuto = true;
let moonTheta = 0.6;

if (phEl) {
  phEl.innerHTML = '';
  PH.forEach((n, i) => {
    const d = document.createElement('div');
    d.className = 'ph';
    const cv = document.createElement('canvas');
    cv.width = cv.height = 164;
    d.append(cv, n);
    phEl.append(d);
    phC.push([d, cv]);
    drawPhase(cv.getContext('2d'), 82, 82, 78, i / 4, '#2b3138', '#ece6d6');

    d.addEventListener('click', () => {
      moonTheta = (i / 4) * TAU;
      moonAuto = !moonAuto;
    });
  });
}

scenes.luna = c => {
  let dragging = false;
  let cx = 0, cy = 0, R = 0;

  c.addEventListener('pointerdown', e => {
    dragging = true;
    moonAuto = false;
    c.setPointerCapture(e.pointerId);
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    moonTheta = (Math.atan2(-y, x) + TAU) % TAU;
  });
  c.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    moonTheta = (Math.atan2(-y, x) + TAU) % TAU;
  });
  c.addEventListener('pointerup', () => { dragging = false; });

  return makeScene(c, (ctx, w, h, t, dt) => {
    if (moonAuto) moonTheta = (moonTheta + dt * 0.32) % TAU;
    bgStars(ctx, w, h, t, 0, 0, 0.7);

    cx = w * 0.64; cy = h * 0.46; R = Math.min(h * 0.34, w * 0.23);

    [[1, '#f0a81a', 1], [1.12, '#f0a81a', 0.2], [1.25, '#f0a81a', 0.1]].forEach(([k, col, a]) => {
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(w + h * 0.1, cy, h * 0.28 * k, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#10161c'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#161d24'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#06090c'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.96, 0, TAU); ctx.fill();

    const er = R * 0.2;
    drawPhase(ctx, cx, cy, er, 0.25, '#0f2a47', '#2f78c4');

    const mx = cx + Math.cos(moonTheta) * R, my = cy - Math.sin(moonTheta) * R, mr = R * 0.07;
    drawPhase(ctx, mx, my, mr, 0.25, '#2b3138', '#ece6d6');

    const p = moonTheta / TAU;
    const k = Math.round(p * 4) % 4;
    phC.forEach(([d], i) => d.classList.toggle('on', i === k));

    const br = Math.min(48, R * 0.22);
    drawPhase(ctx, cx + R * 1.12, cy - R * 1.02, br, p, '#2b3138', '#ece6d6');
    ctx.fillStyle = '#ece6d6'; ctx.font = '600 15px ' + FONT(); ctx.textAlign = 'center';
    ctx.fillText('come la vediamo', cx + R * 1.12, cy - R * 1.02 + br + 22);
    ctx.textAlign = 'left';
    ctx.fillText('terra', cx + er + 8, cy + 5);
  });
};
