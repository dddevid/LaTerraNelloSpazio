// js/finale.js - Scena finale: ascesa dal suolo all'universo (Slide 18)

const SKY = [
  [0, '#a9d6f2'],
  [0.05, '#6fb0e0'],
  [0.1, '#2f78b8'],
  [0.15, '#1b4a80'],
  [0.2, '#0f2a4c'],
  [0.25, '#0a1626'],
  [0.3, '#060a10'],
  [0.85, '#05070b'],
  [1, '#0b1f33']
];
const KM = [[0, 0], [0.1, 12], [0.15, 50], [0.2, 85], [0.27, 500], [0.3, 700]];
const kmOf = t => {
  for (let i = 0; i < KM.length - 1; i++) {
    if (t <= KM[i + 1][0]) {
      return lerp(KM[i][1], KM[i + 1][1], (t - KM[i][0]) / (KM[i + 1][0] - KM[i][0]));
    }
  }
  return 700;
};

const STARS = Array.from({ length: 380 }, () => ({
  x: Math.random(),
  y: Math.random(),
  s: Math.random() < 0.1 ? 2.4 : rnd(0.8, 1.7),
  p: rnd(0, TAU),
  f: rnd(0.6, 2)
}));
const CLOUDS = Array.from({ length: 20 }, () => ({
  x: Math.random(),
  t: rnd(-0.02, 0.065),
  s: rnd(0.7, 1.7),
  d: rnd(0.2, 1)
}));
const GAL = Array.from({ length: 2400 }, (_, i) => {
  const arm = i % 2, r = Math.pow(Math.random(), 0.62);
  const a = arm * Math.PI + r * 5.2 + rnd(-0.28, 0.28) * (1.1 - r * 0.4);
  const cs = ['#ece6d6', '#ece6d6', '#f0a81a', '#8fb8f0', '#ece6d6'];
  return { r, a, s: rnd(0.8, 2.2), c: cs[Math.floor(Math.random() * cs.length)], al: rnd(0.35, 1) };
});
const GM = { r: 0.6, a: 1.5 };
const STRK = Array.from({ length: 28 }, () => ({
  x: Math.random(),
  y: Math.random(),
  l: rnd(0.04, 0.18),
  k: rnd(0.6, 1.6),
  w: rnd(1.5, 3)
}));

const STAGE = [
  [0, 'troposfera', '0–12 km · Nuvole, venti e vita.'],
  [0.1, 'stratosfera', '12–50 km · Lo scudo di ozono filtra i raggi UV.'],
  [0.15, 'mesosfera', '50–80 km · Le meteore bruciano nel freddo.'],
  [0.2, 'termosfera', '80–500 km · Il vento solare accende le aurore.'],
  [0.27, 'esosfera', 'Oltre 500 km · L’ultimo respiro prima dello spazio.'],
  [0.36, 'terra e luna', '384 400 km · In orbita attorno a un baricentro comune.'],
  [0.54, 'il sistema solare', '1 stella, 8 pianeti · 150 milioni di km dal Sole.'],
  [0.78, 'la via lattea', 'Miliardi di stelle e galassie in espansione.'],
  [0.9, 'siamo qui.', 'Un piccolo pianeta avvolto da un velo d’aria: casa.']
];

let flT = 0, flAuto = true, flKey = -1, flScene = null, flLight = null, ringT = -1, burst = [], burstDone = false, shoot = null;
const flEl = document.querySelector('[data-id=finale]');
const fh = $('#fl-h'), fp = $('#fl-p'), fa = $('#fl-alt'), fal = $('#fl-altl'), fbar = $('#fl-bar'), fend = $('#fl-end'), fplay = $('#fl-play');
const flRail = $('.fl-rail');

function setFlText(i) {
  if (i === flKey) return;
  if (flKey >= 0 && flAuto) ringT = 0;
  flKey = i;
  if (fh) {
    fh.textContent = STAGE[i][1];
    if (window.splitWords) splitWords(fh);
  }
  if (fp) {
    fp.textContent = STAGE[i][2];
    fp.classList.remove('fl-in');
    void fp.offsetWidth;
    fp.classList.add('fl-in');
  }
}

function setAuto(v) {
  flAuto = v;
  if (fplay) {
    fplay.textContent = v ? 'pausa' : 'riprendi';
    fplay.setAttribute('aria-pressed', !v);
  }
}

if (fplay) {
  fplay.onclick = () => {
    if (flT >= 0.999) flT = 0;
    setAuto(!flAuto);
    if (flScene) flScene.redraw();
  };
}

const fRestart = $('#fl-restart');
if (fRestart) {
  fRestart.onclick = () => {
    flT = 0;
    setAuto(true);
    flKey = -1;
    ringT = -1;
    burstDone = false;
    burst = [];
    if (flScene) flScene.redraw();
  };
}

function scrub(d) {
  flT = clamp(flT + d);
  setAuto(false);
  if (flScene) flScene.redraw();
}

// Barra laterale della quota interattiva per la LIM
if (flRail) {
  let railDragging = false;
  function updateFromRail(clientY) {
    const r = flRail.getBoundingClientRect();
    const ratio = clamp(1 - (clientY - r.top) / r.height);
    flT = ratio;
    setAuto(false);
    if (flScene) flScene.redraw();
  }
  flRail.addEventListener('pointerdown', e => {
    railDragging = true;
    flRail.setPointerCapture(e.pointerId);
    updateFromRail(e.clientY);
  });
  flRail.addEventListener('pointermove', e => {
    if (railDragging) updateFromRail(e.clientY);
  });
  flRail.addEventListener('pointerup', () => { railDragging = false; });
  flRail.addEventListener('pointercancel', () => { railDragging = false; });
}

function drawFinale(ctx, w, h, t0, dt, S) {
  if (flAuto && flT < 1) {
    flT = Math.min(1, flT + dt / 44 * (0.3 + 0.7 * sm(0, 0.04, flT)) * (1 - 0.62 * sm(0.94, 1, flT)));
  }
  if (flT >= 1 && flAuto) setAuto(false);
  const t = flT, time = S.time;
  ctx.fillStyle = ramp(SKY, t);
  ctx.fillRect(0, 0, w, h);

  // Stelle
  const sa = sm(0.09, 0.26, t) * (1 - 0.35 * sm(0.5, 0.7, t));
  if (sa > 0) {
    STARS.forEach(s => {
      const y = ((s.y - t * 0.3) % 1 + 1) % 1;
      const a = sa * (0.4 + 0.6 * Math.abs(Math.sin(time * s.f + s.p)));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ece6d6';
      ctx.fillRect(s.x * w, y * h, s.s, s.s);
    });
    ctx.globalAlpha = 1;
  }
  const Z = 10;

  // Strisce di velocità
  const sk = sm(0.01, 0.05, t) * (1 - sm(0.24, 0.34, t));
  if (sk > 0) {
    ctx.fillStyle = t < 0.07 ? '#fff' : '#ece6d6';
    STRK.forEach(s => {
      const y = (((s.y + t * Z * s.k * 0.8) % 1) + 1) % 1 * h;
      ctx.globalAlpha = sk * (0.05 + 0.12 * s.k / 1.6);
      ctx.fillRect(s.x * w, y, s.w, s.l * h);
    });
    ctx.globalAlpha = 1;
  }

  // Suolo e nuvole iniziali
  if (t < 0.14) {
    const gy = h * 0.8 + t * h * Z;
    if (gy < h) {
      ctx.fillStyle = '#2f7a4f'; ctx.beginPath(); ctx.moveTo(0, h * 2); ctx.lineTo(0, gy + h * 0.05);
      for (let x = 0; x <= w + 40; x += 40) ctx.lineTo(x, gy + Math.sin(x * 0.004 + 1) * h * 0.05 + Math.sin(x * 0.011) * h * 0.02);
      ctx.lineTo(w, h * 2); ctx.fill();
      ctx.fillStyle = '#e8c07a'; const bx = w * 0.72, by = gy + h * 0.02; ctx.fillRect(bx, by - h * 0.06, w * 0.012, h * 0.06);
      ctx.fillStyle = '#d9381e'; ctx.beginPath(); ctx.moveTo(bx - w * 0.012, by - h * 0.06); ctx.lineTo(bx + w * 0.006, by - h * 0.095); ctx.lineTo(bx + w * 0.024, by - h * 0.06); ctx.fill();
    }
    CLOUDS.forEach(c => {
      const y = h * 0.5 - (c.t - t) * h * Z; if (y < -h * 0.2 || y > h * 1.1) return;
      const x = ((c.x + time * 0.006 * c.d) % 1.3 - 0.15) * w, r = h * 0.05 * c.s;
      ctx.globalAlpha = 0.55 + 0.4 * c.d; ctx.fillStyle = '#fff';
      [[0, 0, 1], [0.9, 0.2, 0.8], [-0.9, 0.25, 0.75], [0.35, -0.45, 0.8], [-0.4, -0.3, 0.7]].forEach(([dx, dy, k]) => {
        ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * k, 0, TAU); ctx.fill();
      });
      ctx.fillRect(x - 1.6 * r, y + 0.2 * r, 3.2 * r, 0.55 * r);
    });
    ctx.globalAlpha = 1;

    // Pallone sonda
    const by2 = h * 0.5 - (0.125 - t) * h * Z;
    if (by2 > -80 && by2 < h + 80) {
      const bx = w * 0.3; ctx.fillStyle = '#ece6d6'; ctx.beginPath(); ctx.ellipse(bx, by2, 22, 30, 0, 0, TAU); ctx.fill();
      ctx.fillRect(bx - 5, by2 + 36, 10, 10); ctx.fillStyle = '#0f1418'; ctx.fillRect(bx - 1, by2 + 28, 2, 9);
    }
  }

  // Meteore nella mesosfera
  if (t > 0.14 && t < 0.24) {
    const k = sm(0.14, 0.17, t) * (1 - sm(0.21, 0.24, t));
    for (let i = 0; i < 5; i++) {
      const ph = ((time * 0.35 + i * 0.37) % 1);
      const x = w * (0.15 + 0.7 * ((i * 0.31 + Math.floor(time * 0.35 + i * 0.37) * 0.17) % 1)) + ph * w * 0.22;
      const y = ph * h * 0.55 + i * h * 0.06;
      ctx.globalAlpha = k * (1 - ph); ctx.fillStyle = '#ece6d6';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - w * 0.1, y - h * 0.09); ctx.lineTo(x - w * 0.1 + 5, y - h * 0.09 - 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Aurore e satellite nella termosfera
  if (t > 0.19 && t < 0.36) {
    const k = sm(0.19, 0.23, t) * (1 - sm(0.3, 0.35, t));
    [['#3ddc97', 0.9, 0.22], ['#3ddc97', 0.75, 0.14], ['#d95aa8', 0.68, 0.1]].forEach(([c, yb, al], i) => {
      ctx.globalAlpha = al * k; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w + 20; x += 20) {
        const y = h * yb - Math.sin(x * 0.006 + time * (0.4 + i * 0.15) + i) * h * 0.07 - Math.sin(x * 0.017 - time * 0.5) * h * 0.025;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.fill();
    });
    ctx.globalAlpha = 1;

    const sx = ((time * 0.03) % 1.2 - 0.1) * w, sy = h * 0.2 + Math.sin(time * 0.3) * h * 0.03;
    ctx.globalAlpha = k; ctx.fillStyle = '#ece6d6'; ctx.fillRect(sx - 14, sy - 4, 28, 8);
    ctx.fillStyle = '#f0a81a'; ctx.fillRect(sx - 40, sy - 9, 22, 18); ctx.fillRect(sx + 18, sy - 9, 22, 18);
    ctx.globalAlpha = 1;
  }

  // Terra e Luna viste dallo spazio
  const s2 = sm(0.22, 0.42, t), exit2 = sm(0.5, 0.58, t), FX = w * 0.62;
  if (t > 0.2 && exit2 < 1) {
    const a2 = sm(0.2, 0.28, t) * (1 - exit2);
    const Re = h * 0.2 * Math.pow(60, 1 - s2), top = lerp(h * 0.9, h * 0.5 - Re, s2 * s2), cx = FX, cy = top + Re;
    const sc = lerp(1, 0.12, sm(0.46, 0.58, t));
    ctx.save(); ctx.globalAlpha = a2; ctx.translate(FX, h / 2); ctx.scale(sc, sc); ctx.translate(-FX, -h / 2);
    drawGlobe(ctx, cx, cy, Re, -time * 0.5, 23.44 * Math.PI / 180, { landAlpha: sm(h * 3, h * 0.9, Re), maxDot: 8, rimA: 1, night: Re < h * 1.6 });

    const mo = sm(0.4, 0.45, t);
    if (mo > 0) {
      const mr = Re * 3.4, ma = time * 0.55, mx = cx + Math.cos(ma) * mr, my = cy - Math.sin(ma) * mr * 0.55, mrad = Re * 0.27;
      ctx.globalAlpha = a2 * mo; ctx.fillStyle = 'rgba(236,230,214,.12)'; ctx.beginPath(); ctx.ellipse(cx, cy, mr, mr * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#050a10'; ctx.beginPath(); ctx.ellipse(cx, cy, mr * 0.985, mr * 0.55 * 0.985, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = a2; drawGlobe(ctx, cx, cy, Re, -time * 0.5, 23.44 * Math.PI / 180, { landAlpha: 1, maxDot: 8, rimA: 1 });
      ctx.globalAlpha = a2 * mo; drawPhase(ctx, mx, my, mrad, 0.25, '#2b3138', '#ece6d6');
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // Sistema solare
  const in3 = sm(0.52, 0.6, t), out3 = sm(0.72, 0.8, t);
  if (in3 > 0 && out3 < 1) {
    const R = h * 0.46 * lerp(14, 1, sm(0.52, 0.66, t)) * lerp(1, 0.1, out3);
    ctx.globalAlpha = in3 * (1 - out3);
    drawSystem(ctx, FX, h / 2, R, time, { speed: 1.6, sz: 1.1, labels: sm(0.64, 0.72, t) * (1 - out3) * 0.9 });
    ctx.globalAlpha = 1;
  }

  // Galassia
  const in4 = sm(0.74, 0.84, t);
  if (in4 > 0) {
    const G = h * 0.6 * lerp(6, 1, sm(0.74, 0.92, t)) * Math.min(1, w / (h * 1.5) + 0.4), rot = time * 0.03;
    ctx.save(); ctx.globalAlpha = in4; ctx.translate(FX, h * 0.44); ctx.rotate(-0.35); ctx.scale(1, 0.52);
    [[0.34, 0.07], [0.22, 0.1], [0.13, 0.2], [0.06, 0.35]].forEach(([k, a]) => {
      ctx.globalAlpha = in4 * a; ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(0, 0, G * k, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = in4;
    GAL.forEach(s => {
      const a = s.a + rot * (1.2 - s.r), x = Math.cos(a) * s.r * G, y = Math.sin(a) * s.r * G;
      ctx.globalAlpha = in4 * s.al; ctx.fillStyle = s.c; ctx.fillRect(x, y, s.s * 1.25, s.s * 1.25);
    });

    const ga = GM.a + rot * (1.2 - GM.r), mx = Math.cos(ga) * GM.r * G, my = Math.sin(ga) * GM.r * G, mk = sm(0.86, 0.92, t);
    if (mk > 0) {
      const pul = (time % 2.4) / 2.4;
      ctx.globalAlpha = in4 * mk * (1 - pul); ctx.strokeStyle = '#f0a81a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, 8 + pul * 46, 0, TAU); ctx.stroke();
      ctx.globalAlpha = in4 * mk; ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(mx, my, 6, 0, TAU); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // Stella cadente nello spazio profondo
  if (t > 0.3 && dt > 0) {
    if (!shoot && Math.random() < dt * 0.35) shoot = { x: rnd(0.3, 1) * w, y: rnd(0, 0.4) * h, a: 0 };
    if (shoot) {
      shoot.a += dt; const k = shoot.a / 0.9;
      if (k >= 1) shoot = null;
      else {
        const x = shoot.x - k * w * 0.35, y = shoot.y + k * h * 0.25;
        ctx.globalAlpha = (1 - k) * 0.9; ctx.fillStyle = '#ece6d6';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.09, y - h * 0.06); ctx.lineTo(x + w * 0.09 + 3, y - h * 0.06 + 3); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // Anello impulso ad ogni nuovo strato
  if (ringT >= 0) {
    ringT += dt; const k = ringT / 1.8;
    if (k >= 1) ringT = -1;
    else {
      ctx.strokeStyle = t < 0.07 ? '#0f1418' : '#ece6d6';
      ctx.globalAlpha = 0.5 * (1 - k) * (1 - k); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, k * Math.hypot(w, h) * 0.55, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Fuochi d'artificio / particelle finali
  if (t < 0.9) burstDone = false;
  if (t > 0.93 && !burstDone) {
    burstDone = true;
    burst = Array.from({ length: 150 }, () => {
      const a = rnd(0, TAU), v = rnd(90, 540);
      return {
        x: w * 0.66, y: h * 0.42,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        l: rnd(1.6, 3.4), a: 0, s: rnd(2, 5.5),
        c: ['#f0a81a', '#ece6d6', '#4a93e0', '#d9381e'][Math.floor(rnd(0, 4))]
      };
    });
  }
  burst.forEach(p => {
    if (dt > 0) p.a += dt;
    if (p.a > p.l) return;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 1.4 * dt;
    ctx.globalAlpha = 1 - p.a / p.l; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s);
  });
  ctx.globalAlpha = 1;

  // Testi e letture quote
  let si = 0;
  STAGE.forEach((s, i) => { if (t >= s[0]) si = i; });
  setFlText(si);

  if (fa && fal) {
    if (t < 0.3) {
      const km = kmOf(t);
      fa.firstChild.nodeValue = Math.round(km).toLocaleString('it-IT') + ' km';
      fal.textContent = 'quota';
    } else if (t < 0.54) {
      fa.firstChild.nodeValue = '384 400 km';
      fal.textContent = 'distanza della luna';
    } else if (t < 0.78) {
      fa.firstChild.nodeValue = '150 milioni di km';
      fal.textContent = 'dalla terra al sole';
    } else {
      fa.firstChild.nodeValue = 'via lattea';
      fal.textContent = 'la nostra galassia';
    }
  }

  if (fbar) fbar.style.height = (t * 100) + '%';
  if (fend) fend.classList.toggle('on', t > 0.93);

  const lt = t < 0.07;
  if (lt !== flLight) {
    flLight = lt;
    if (flEl) flEl.classList.toggle('light', lt);
    if (window.curSlideIndex === window.slidesCount - 1) {
      document.documentElement.style.setProperty('--nav', lt ? '#0f1418' : '#ece6d6');
      document.documentElement.style.setProperty('--navbg', lt ? '#a9d6f2' : '#0b1f33');
    }
  }
}

scenes.finale = c => {
  flScene = makeScene(c, drawFinale);
  c.addEventListener('wheel', e => {
    if (window.curSlideIndex === window.slidesCount - 1) {
      e.preventDefault();
      scrub(e.deltaY * 0.0006);
    }
  }, { passive: false });

  let ty = null;
  c.addEventListener('pointerdown', e => {
    ty = e.clientY;
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if (ty !== null) {
      scrub((ty - e.clientY) * 0.0016);
      ty = e.clientY;
    }
  });
  c.addEventListener('pointerup', () => { ty = null; });
  c.addEventListener('pointercancel', () => { ty = null; });
  return flScene;
};
