// js/atmosphere.js - Scene e simulatori interattivi per Atmosfera, Effetto Serra, Buco dell'Ozono e Pianura Padana

// 1. Strati dell'atmosfera
(function() {
  const ls = $$('.lay');
  ls.forEach(l => {
    const activate = () => {
      ls.forEach(x => {
        const isOn = x === l;
        x.classList.toggle('on', isOn);
        x.setAttribute('aria-expanded', isOn);
      });
    };
    l.addEventListener('pointerdown', activate);
    l.addEventListener('click', activate);
    l.addEventListener('focus', activate);
  });
})();

function cycle(root, n, t, per, manualIdx) {
  if (!root) return;
  const i = manualIdx >= 0 ? manualIdx : Math.floor((t / per) % n);
  [...root.children].forEach((e, j) => e.classList.toggle('on', j === i));
}

// 2. Composizione dell'aria (Grafico a ciambella interattivo)
const DON = [
  ['azoto', 78.08, '#ece6d6'],
  ['ossigeno', 20.95, '#f0a81a'],
  ['argon', 0.93, '#d9381e'],
  ['diossido di carbonio', 0.04, '#0f1418']
];
let donSel = -1;

function setDon(i) {
  donSel = i;
  $$('#leg button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
  if (scenes.donutInstance) scenes.donutInstance.redraw();
}

$$('#leg button').forEach(b => {
  const idx = +b.dataset.i;
  b.addEventListener('click', () => setDon(donSel === idx ? -1 : idx));
  b.addEventListener('pointerenter', () => {
    if (window.matchMedia('(hover: hover)').matches) setDon(idx);
  });
  b.addEventListener('pointerleave', () => {
    if (window.matchMedia('(hover: hover)').matches) setDon(-1);
  });
});

scenes.donut = c => {
  const S = makeScene(c, (ctx, w, h, t) => {
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.47;
    const rm = R * 0.78, lw = R * 0.44;
    const fr = DON.map(d => Math.max(d[1] / 100, 0.013));
    const sum = fr.reduce((a, b) => a + b, 0);
    const prog = sm(0.9, 2.6, t);
    let a = -Math.PI / 2, acc = 0;

    ctx.lineWidth = lw;
    ctx.lineCap = 'butt';

    DON.forEach((d, i) => {
      const f = fr[i] / sum;
      const a0 = a, a1 = a + f * TAU;
      a = a1;
      const lo = acc * TAU * prog;
      const hi = Math.min((acc + f) * TAU * prog, TAU * prog);
      acc += f;
      if (hi - lo <= 0) return;

      const mid = (a0 + a1) / 2;
      const off = donSel === i ? R * 0.06 : 0;
      ctx.globalAlpha = donSel < 0 || donSel === i ? 1 : 0.35;
      ctx.strokeStyle = d[2];
      ctx.beginPath();
      ctx.arc(cx + Math.cos(mid) * off, cy + Math.sin(mid) * off, rm, -Math.PI / 2 + lo, -Math.PI / 2 + hi);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    const d = donSel >= 0 ? DON[donSel] : null;
    const fam = FONT();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(R * 0.3) + 'px ' + fam;
    ctx.fillText(d ? String(d[1]).replace('.', ',') + '%' : 'aria', cx, cy + R * 0.06);
    ctx.font = '600 ' + Math.max(15, Math.round(R * 0.095)) + 'px ' + fam;
    ctx.fillText(d ? d[0] : 'un miscuglio di gas', cx, cy + R * 0.26);
  });

  function pickDonut(clientX, clientY) {
    const r = c.getBoundingClientRect();
    const x = clientX - r.left - r.width / 2;
    const y = clientY - r.top - r.height / 2;
    const d = Math.hypot(x, y);
    const R = Math.min(r.width, r.height) * 0.47;

    if (d < R * 0.45 || d > R * 1.08) {
      setDon(-1);
      return;
    }
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += TAU;
    const fr = DON.map(q => Math.max(q[1] / 100, 0.013));
    const sum = fr.reduce((p, q) => p + q, 0);
    let acc = 0, hit = -1;
    fr.forEach((f, i) => {
      const lo = acc / sum * TAU;
      acc += f;
      if (a >= lo && a < acc / sum * TAU) hit = i;
    });
    setDon(hit);
  }

  c.addEventListener('click', e => pickDonut(e.clientX, e.clientY));
  c.addEventListener('pointermove', e => {
    if (window.matchMedia('(hover: hover)').matches) pickDonut(e.clientX, e.clientY);
  });

  scenes.donutInstance = S;
  return S;
};

// 3. Ciclo dell'acqua
scenes.acqua = c => {
  const vap = [], drops = [], rip = [];
  let acc = 0;
  const stps = $('#stps-a');
  let manualStep = -1;

  if (stps) {
    [...stps.children].forEach((st, idx) => {
      st.onclick = () => {
        manualStep = manualStep === idx ? -1 : idx;
        cycle(stps, 3, 0, 1, manualStep);
      };
    });
  }

  return makeScene(c, (ctx, w, h, t, dt) => {
    const ph = (t % 15) / 15, seaY = h * 0.8;
    ctx.fillStyle = '#10304f';
    ctx.fillRect(0, 0, w, h);
    bgStars(ctx, w, h * 0.6, t, 0, 0, 0.25);

    [[2.2, 0.08], [1.6, 0.14], [1.25, 0.22]].forEach(([k, a]) => {
      ctx.globalAlpha = a; ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(w * 0.86, h * 0.14, h * 0.055 * k, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f0a81a'; ctx.beginPath(); ctx.arc(w * 0.86, h * 0.14, h * 0.055, 0, TAU); ctx.fill();

    ctx.fillStyle = '#2f7a4f'; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.62);
    ctx.quadraticCurveTo(w * 0.14, h * 0.56, w * 0.3, h * 0.7); ctx.lineTo(w * 0.4, seaY); ctx.lineTo(w * 0.4, h); ctx.fill();

    [[0.06, 0.63], [0.13, 0.6], [0.2, 0.65]].forEach(([x, y]) => {
      ctx.fillStyle = '#1d5535'; ctx.fillRect(w * x - 3, h * y, 6, h * 0.05);
      ctx.fillStyle = '#3da064'; ctx.beginPath(); ctx.arc(w * x, h * y, h * 0.035, 0, TAU); ctx.fill();
    });

    ctx.fillStyle = '#1c5088'; ctx.beginPath(); ctx.moveTo(w * 0.34, seaY);
    for (let x = w * 0.34; x <= w + 10; x += 14) ctx.lineTo(x, seaY + Math.sin(x * 0.03 + t * 1.6) * 3);
    ctx.lineTo(w, h); ctx.lineTo(w * 0.34, h); ctx.fill();
    ctx.fillStyle = '#164375'; ctx.fillRect(w * 0.4, seaY + h * 0.07, w * 0.6, h * 0.13);

    const ck = sm(0.12, 0.5, ph) * (1 - sm(0.86, 1, ph)), cxm = w * 0.62, cym = h * 0.25, dark = sm(0.5, 0.62, ph) * (1 - sm(0.82, 0.92, ph));
    if (ck > 0.01) {
      ctx.fillStyle = mix('#ece6d6', '#8c9db0', dark);
      const r = h * 0.07 * ck;
      [[0, 0, 1], [1.1, 0.2, 0.85], [-1.1, 0.25, 0.8], [0.5, -0.55, 0.85], [-0.5, -0.4, 0.75], [1.9, 0.35, 0.6], [-1.9, 0.4, 0.6]].forEach(([dx, dy, k]) => {
        ctx.beginPath(); ctx.arc(cxm + dx * r, cym + dy * r, r * k, 0, TAU); ctx.fill();
      });
      ctx.fillRect(cxm - 2.2 * r, cym + 0.2 * r, 4.4 * r, 0.7 * r);
    }

    acc += dt;
    while (acc > 0.05) {
      acc -= 0.05;
      if (ph < 0.75) {
        const fromTree = Math.random() < 0.35;
        vap.push({
          x: fromTree ? w * rnd(0.04, 0.22) : w * rnd(0.42, 0.95),
          y: fromTree ? h * 0.6 : seaY,
          vy: -rnd(40, 80),
          ph: rnd(0, TAU)
        });
      }
    }
    ctx.fillStyle = '#ece6d6';
    for (let i = vap.length - 1; i >= 0; i--) {
      const v = vap[i];
      v.y += v.vy * dt;
      v.ph += dt * 2;
      const top = cym + h * 0.04;
      if (v.y < top || v.y < h * 0.05) {
        vap.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = 0.55 * Math.min(1, (seaY - v.y) / (h * 0.1));
      ctx.beginPath();
      ctx.arc(v.x + Math.sin(v.ph) * 7, v.y, 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (ph > 0.52 && ph < 0.86 && dt > 0) {
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.7) drops.push({ x: cxm + rnd(-2, 2) * h * 0.07, y: cym + h * 0.1, v: rnd(380, 520) });
      }
    }
    ctx.fillStyle = '#8fc1e6';
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.v * dt;
      if (d.y >= seaY) {
        rip.push({ x: d.x, a: 0 });
        drops.splice(i, 1);
        continue;
      }
      ctx.fillRect(d.x, d.y, 3, 14);
    }

    ctx.strokeStyle = '#8fc1e6'; ctx.lineWidth = 2;
    for (let i = rip.length - 1; i >= 0; i--) {
      const r = rip[i];
      r.a += dt * 1.6;
      if (r.a >= 1) {
        rip.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = 1 - r.a;
      ctx.beginPath();
      ctx.ellipse(r.x, seaY + 4, 6 + r.a * 22, 2 + r.a * 5, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    cycle(stps, 3, ph * 15, 5, manualStep);
  });
};

// 4. Pressione e vento
scenes.vento = c => {
  const P = [];
  const spawn = (Hx, Hy, r) => {
    const a = rnd(0, TAU);
    return { x: Hx + Math.cos(a) * r * rnd(0.3, 0.95), y: Hy + Math.sin(a) * r * rnd(0.3, 0.95), tr: [], age: 0 };
  };

  return makeScene(c, (ctx, w, h, t, dt) => {
    const rr = Math.min(w * 0.17, h * 0.27);
    const H = { x: w * 0.27, y: h * 0.5 };
    const L = { x: w * 0.74, y: h * 0.5 };

    ctx.fillStyle = '#dff0fa';
    ctx.fillRect(0, 0, w, h);

    [[2.1, 0.1], [1.6, 0.16], [1.2, 0.24]].forEach(([k, a]) => {
      ctx.globalAlpha = a; ctx.fillStyle = '#d9381e'; ctx.beginPath(); ctx.arc(H.x, H.y, rr * k, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0b1f33'; ctx.beginPath(); ctx.arc(L.x, L.y, rr * k, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9381e'; ctx.beginPath(); ctx.arc(H.x, H.y, rr * 0.85, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b1f33'; ctx.beginPath(); ctx.arc(L.x, L.y, rr * 0.85, 0, TAU); ctx.fill();

    while (P.length < 170 && dt > 0) P.push(spawn(H.x, H.y, rr * 0.85));
    if (!P.length) {
      for (let i = 0; i < 170; i++) {
        const q = spawn(H.x, H.y, rr * 0.85);
        q.age = rnd(0, 5);
        P.push(q);
      }
    }

    ctx.lineCap = 'round';
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const dx1 = p.x - H.x, dy1 = p.y - H.y, d1 = Math.max(40, Math.hypot(dx1, dy1));
      const dx2 = p.x - L.x, dy2 = p.y - L.y, d2 = Math.max(40, Math.hypot(dx2, dy2));
      let vx = dx1 / (d1 * d1) - dx2 / (d2 * d2);
      let vy = dy1 / (d1 * d1) - dy2 / (d2 * d2);
      const m = Math.hypot(vx, vy) || 1;
      const sp = 120 + Math.min(160, 40000 / d1);
      vx = vx / m * sp; vy = vy / m * sp;
      p.x += vx * dt; p.y += vy * dt; p.age += dt;
      p.tr.push(p.x, p.y);
      if (p.tr.length > 22) p.tr.splice(0, 2);
      if (Math.hypot(p.x - L.x, p.y - L.y) < rr * 0.5 || p.age > 14 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
        P[i] = spawn(H.x, H.y, rr * 0.85);
        continue;
      }
      const n = p.tr.length / 2;
      ctx.strokeStyle = '#0b1f33';
      ctx.lineWidth = 2.4;
      for (let k = 1; k < n; k++) {
        ctx.globalAlpha = 0.65 * k / n;
        ctx.beginPath();
        ctx.moveTo(p.tr[k * 2 - 2], p.tr[k * 2 - 1]);
        ctx.lineTo(p.tr[k * 2], p.tr[k * 2 + 1]);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    const fam = FONT();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    [[H, 'alta', 'uscita'], [L, 'bassa', 'ingresso']].forEach(([q, a, b]) => {
      ctx.font = '700 ' + Math.round(rr * 0.34) + 'px ' + fam;
      ctx.fillText(a, q.x, q.y + rr * 0.06);
      ctx.font = '600 ' + Math.max(14, Math.round(rr * 0.16)) + 'px ' + fam;
      ctx.fillText(b, q.x, q.y + rr * 0.32);
    });
  });
};

// 5. EFFETTO SERRA INTERATTIVO (Semplificato per 1ª superiore)
let serraMode = 'naturale'; // 'nessuno' | 'naturale' | 'antropico'
let serraScene = null;

$$('[data-serra]').forEach(btn => {
  btn.onclick = () => {
    serraMode = btn.dataset.serra;
    $$('[data-serra]').forEach(b => {
      const on = b === btn;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    if (serraScene) serraScene.redraw();
  };
});

function drawArrow2D(ctx, x1, y1, x2, y2, color, lw, headSize) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headSize * Math.cos(ang - 0.42), y2 - headSize * Math.sin(ang - 0.42));
  ctx.lineTo(x2 - headSize * Math.cos(ang + 0.42), y2 - headSize * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

scenes.serra = c => {
  const P = [];
  let acc = 0;

  serraScene = makeScene(c, (ctx, w, h, t, dt) => {
    const gy = h * 0.78;
    const aT = h * 0.36;
    const aB = h * 0.54;
    const sx = w * 0.16;
    const sy = h * 0.17;
    const fam = FONT();

    // Sfondo spazio e atmosfera
    ctx.fillStyle = '#190b0a';
    ctx.fillRect(0, 0, w, h);
    bgStars(ctx, w, h * 0.36, t, 0, 0, 0.4);

    // Parametri in base allo scenario scelto
    const trapProb = serraMode === 'nessuno' ? 0 : (serraMode === 'naturale' ? 0.55 : 0.88);
    const bandAlpha = serraMode === 'nessuno' ? 0.03 : (serraMode === 'naturale' ? 0.22 : 0.45);
    const bandCol = serraMode === 'antropico'
      ? 'rgba(255, 100, 50, ' + bandAlpha + ')'
      : 'rgba(120, 200, 255, ' + bandAlpha + ')';
    const tempStr = serraMode === 'nessuno' ? '−18 °C' : (serraMode === 'naturale' ? '+15 °C' : '+16,5 °C');
    const stateTitle = serraMode === 'nessuno'
      ? 'SENZA GAS SERRA'
      : (serraMode === 'naturale'
        ? 'EFFETTO SERRA NATURALE'
        : 'TROPPA CO₂ (OGGI)');

    // Fascia "Coperta di Gas Serra" (come il vetro di una serra)
    ctx.fillStyle = bandCol;
    ctx.fillRect(0, aT, w, aB - aT);
    if (serraMode !== 'nessuno') {
      ctx.strokeStyle = serraMode === 'antropico' ? '#ff6e40' : '#78c8ff';
      ctx.lineWidth = serraMode === 'antropico' ? 3.5 : 2;
      ctx.setLineDash(serraMode === 'antropico' ? [] : [8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, aT); ctx.lineTo(w, aT);
      ctx.moveTo(0, aB); ctx.lineTo(w, aB);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Etichetta sulla fascia dei gas serra
    ctx.textAlign = 'center';
    ctx.font = '700 ' + Math.max(13, Math.round(w * 0.024)) + 'px ' + fam;
    if (serraMode === 'nessuno') {
      ctx.fillStyle = 'rgba(236,230,214,0.45)';
      ctx.fillText('Nessun gas serra: il calore scappa', w * 0.5, (aT + aB) * 0.5 + 5);
    } else if (serraMode === 'naturale') {
      ctx.fillStyle = '#d4f0ff';
      ctx.fillText('Gas serra naturali (Vapore, CO₂, Metano)', w * 0.5, (aT + aB) * 0.5 + 5);
    } else {
      ctx.fillStyle = '#ffe0d0';
      ctx.fillText('Troppa CO₂: calore in trappola', w * 0.5, (aT + aB) * 0.5 + 5);
    }

    // Suolo terrestre
    ctx.fillStyle = serraMode === 'nessuno' ? '#5c87a8' : (serraMode === 'naturale' ? '#2e6f40' : '#9e3818');
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = serraMode === 'nessuno' ? '#d8eeff' : (serraMode === 'naturale' ? '#4ca662' : '#ff7043');
    ctx.fillRect(0, gy, w, 6);

    ctx.textAlign = 'center';
    ctx.font = '700 14px ' + fam;
    ctx.fillStyle = '#fff';
    ctx.fillText(
      serraMode === 'nessuno'
        ? 'TERRA GHIACCIATA (−18 °C)'
        : (serraMode === 'naturale' ? 'TERRA ABITABILE (+15 °C)' : 'TERRA SURRISCALDATA (+16,5 °C)'),
      w * 0.5,
      gy + 26
    );

    // Sole in alto a sinistra
    [[2.1, 0.12], [1.5, 0.22]].forEach(([k, a]) => {
      ctx.globalAlpha = a; ctx.fillStyle = '#f0a81a';
      ctx.beginPath(); ctx.arc(sx, sy, h * 0.055 * k, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f0a81a';
    ctx.beginPath(); ctx.arc(sx, sy, h * 0.055, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px ' + fam;
    ctx.fillText('SOLE', sx, sy + 4);

    // Particelle animate (Luce del Sole = giallo, Calore che sale = bianco, Calore trattenuto = rosso/arancio)
    acc += dt;
    while (acc > 0.14 && P.length < 120) {
      acc -= 0.14;
      const tx = w * rnd(0.22, 0.88);
      const a = Math.atan2(gy - sy, tx - sx);
      const sp = 225;
      P.push({
        x: sx + Math.cos(a) * h * 0.065,
        y: sy + Math.sin(a) * h * 0.065,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        k: 0,
        wait: 0
      });
    }
    if (acc > 0.14) acc = 0;

    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      const py = p.y;
      if (p.wait > 0) {
        p.wait -= dt;
        if (p.wait > 0) continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.k === 0 && p.y >= gy) {
        // Tocca terra -> diventa calore che sale verso lo spazio
        p.k = 1; p.vy = -rnd(150, 185); p.vx = rnd(-35, 35); p.y = gy - 2;
      } else if (p.k === 2 && p.y >= gy) {
        p.k = 1; p.vy = -rnd(150, 185); p.vx = rnd(-35, 35); p.y = gy - 2;
      } else if (p.k === 1 && py > aB && p.y <= aB) {
        // Incontra la coperta di gas serra
        if (Math.random() < trapProb) {
          p.k = 2; p.vy = rnd(135, 165); p.wait = 0.08;
        }
      }

      if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
        P.splice(i, 1);
        continue;
      }

      const col = p.k === 0 ? '#f0a81a' : (p.k === 1 ? '#ece6d6' : '#ff5733');
      const m = Math.hypot(p.vx, p.vy) || 1;
      const tx = p.vx / m * 16, ty = p.vy / m * 16;
      ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - tx, p.y - ty); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 4.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Cruscotto chiaro in alto a destra
    ctx.fillStyle = 'rgba(15, 20, 24, 0.82)';
    ctx.beginPath();
    ctx.roundRect(w * 0.34, 14, w * 0.63, h * 0.16, 12);
    ctx.fill();
    ctx.textAlign = 'right';
    ctx.font = '700 ' + Math.round(h * 0.058) + 'px ' + fam;
    ctx.fillStyle = serraMode === 'nessuno' ? '#8fc1e6' : (serraMode === 'naturale' ? '#3ddc97' : '#ff6e40');
    ctx.fillText(tempStr, w - 24, 14 + h * 0.075);
    ctx.font = '700 ' + Math.max(12, Math.round(w * 0.022)) + 'px ' + fam;
    ctx.fillStyle = '#ece6d6';
    ctx.fillText(stateTitle, w - 24, 14 + h * 0.13);

    // Legenda semplice in basso
    ctx.textAlign = 'left';
    ctx.font = '600 13px ' + fam;
    const ky = h - 18;
    const items = [
      ['#f0a81a', '1. Luce del Sole'],
      ['#ece6d6', '2. Calore in uscita'],
      ['#ff5733', '3. Calore trattenuto']
    ];
    items.forEach(([cc, tx], i) => {
      const lx = 16 + i * (w * 0.32);
      ctx.fillStyle = cc;
      ctx.beginPath(); ctx.arc(lx + 6, ky - 4, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ece6d6';
      ctx.fillText(tx, lx + 16, ky);
    });
  });

  return serraScene;
};

// 6. IL BUCO DELL'OZONO (Semplificato per 1ª superiore)
let ozonoMode = 'buco'; // 'intatto' | 'buco' | 'montreal'
let ozonoScene = null;

$$('[data-ozono]').forEach(btn => {
  btn.onclick = () => {
    ozonoMode = btn.dataset.ozono;
    $$('[data-ozono]').forEach(b => {
      const on = b === btn;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    if (ozonoScene) ozonoScene.redraw();
  };
});

scenes.ozono = c => {
  const uvRays = [];
  const o3Mols = Array.from({ length: 36 }, (_, i) => ({
    x: (i + 0.5) / 36,
    yOff: rnd(-0.025, 0.025),
    ph: rnd(0, TAU)
  }));
  const cfcMols = Array.from({ length: 8 }, (_, i) => ({
    x0: 0.34 + (i / 7) * 0.32,
    y0: 0.39 + (i % 2) * 0.055,
    ph: i * 1.1
  }));

  let acc = 0;

  ozonoScene = makeScene(c, (ctx, w, h, t, dt) => {
    const fam = FONT();
    ctx.fillStyle = '#071826';
    ctx.fillRect(0, 0, w, h);
    bgStars(ctx, w, h * 0.35, t, 0, 0, 0.4);

    const stratTop = h * 0.35;
    const stratBot = h * 0.51;
    const groundY = h * 0.80;

    // Ampiezza del "buco" centrale
    const holeWidth = ozonoMode === 'intatto' ? 0 : (ozonoMode === 'buco' ? 0.46 : 0.16);
    const statusTitle = ozonoMode === 'intatto'
      ? 'SCUDO DI OZONO SANO'
      : (ozonoMode === 'buco' ? 'BUCO DELL’OZONO' : 'SCUDO IN RIPARAZIONE');
    const statusSub = ozonoMode === 'intatto'
      ? 'Blocca il 98% dei raggi UV nocivi'
      : (ozonoMode === 'buco'
        ? 'I gas CFC fanno passare i raggi UV!'
        : 'Vietati i CFC dal 1987: il buco si chiude');

    // Fascia stratosfera (a 25 km di altezza)
    ctx.fillStyle = 'rgba(44, 150, 210, 0.14)';
    ctx.fillRect(0, stratTop, w, stratBot - stratTop);

    // Etichetta fascia ozono
    ctx.textAlign = 'left';
    ctx.font = '700 13px ' + fam;
    ctx.fillStyle = '#4ce0ff';
    ctx.fillText('OZONOSFERA (O₃) · 25 km', 16, stratTop - 10);

    // Molecole di Ozono (O3 = 3 pallini di ossigeno)
    o3Mols.forEach(m => {
      const distCenter = Math.abs(m.x - 0.5);
      const inHole = distCenter < holeWidth * 0.5;
      const mx = m.x * w;
      const my = lerp(stratTop, stratBot, 0.5) + (m.yOff + 0.01 * Math.sin(t * 2 + m.ph)) * h;

      if (!inHole) {
        ctx.fillStyle = 'rgba(56, 210, 255, 0.26)';
        ctx.beginPath(); ctx.arc(mx, my, 17, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4ce0ff';
        [[0, -5.5], [-5.5, 4.5], [5.5, 4.5]].forEach(([dx, dy]) => {
          ctx.beginPath(); ctx.arc(mx + dx, my + dy, 4.2, 0, TAU); ctx.fill();
        });
      }
    });

    // Gas CFC (pallini rossi) che mangiano l'ozono nel buco
    if (ozonoMode !== 'intatto') {
      const count = ozonoMode === 'buco' ? cfcMols.length : 3;
      for (let i = 0; i < count; i++) {
        const cfc = cfcMols[i];
        const cx = (cfc.x0 + 0.012 * Math.sin(t * 1.8 + cfc.ph)) * w;
        const cy = (cfc.y0 + 0.012 * Math.cos(t * 1.5 + cfc.ph)) * h;
        ctx.fillStyle = '#ff5252';
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '700 9px ' + fam;
        ctx.textAlign = 'center';
        ctx.fillText('CFC', cx, cy + 3);
      }
    }

    // Generazione raggi UV dal Sole in alto
    acc += dt;
    while (acc > 0.09 && uvRays.length < 110) {
      acc -= 0.09;
      uvRays.push({
        x: rnd(0.08, 0.92),
        y: 0.16,
        vy: rnd(0.32, 0.40),
        blocked: false,
        alpha: 1
      });
    }

    for (let i = uvRays.length - 1; i >= 0; i--) {
      const r = uvRays[i];
      const prevY = r.y * h;
      r.y += r.vy * dt;
      const curY = r.y * h;

      const midStrat = (stratTop + stratBot) * 0.5;
      if (!r.blocked && prevY < midStrat && curY >= midStrat) {
        const distCenter = Math.abs(r.x - 0.5);
        const inHole = distCenter < holeWidth * 0.5;
        const blockChance = inHole ? 0.12 : 0.97;
        if (Math.random() < blockChance) {
          r.blocked = true;
          r.vy = -r.vy * 0.45;
        }
      }

      if (r.blocked) r.alpha -= dt * 2.2;
      if (r.alpha <= 0 || r.y * h > groundY) {
        uvRays.splice(i, 1);
        continue;
      }

      const rx = r.x * w, ry = r.y * h;
      const isPenetrating = ry > stratBot && !r.blocked;
      ctx.strokeStyle = isPenetrating ? '#ff4081' : '#b388ff';
      ctx.lineWidth = isPenetrating ? 3.8 : 2.4;
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx, ry - 18);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Suolo terrestre / Polo Sud in basso
    ctx.fillStyle = '#1b4a6b';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = '#e6f2fa';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, groundY);
    ctx.quadraticCurveTo(w * 0.5, groundY - 18, w * 0.82, groundY);
    ctx.lineTo(w * 0.82, groundY + 12);
    ctx.lineTo(w * 0.18, groundY + 12);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '700 14px ' + fam;
    ctx.fillStyle = ozonoMode === 'buco' ? '#ff80ab' : '#e6f2fa';
    ctx.fillText(
      ozonoMode === 'buco'
        ? '⚠️ POLO SUD: Raggi UV al suolo!'
        : 'TERRA PROTETTA DAI RAGGI UV',
      w * 0.5,
      groundY + 26
    );

    // Cruscotto in alto
    ctx.fillStyle = 'rgba(7, 24, 38, 0.86)';
    ctx.beginPath();
    ctx.roundRect(16, 12, w - 32, h * 0.14, 12);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = '700 ' + Math.max(15, Math.round(h * 0.036)) + 'px ' + fam;
    ctx.fillStyle = ozonoMode === 'buco' ? '#ff5252' : '#4ce0ff';
    ctx.fillText(statusTitle, w * 0.5, 12 + h * 0.058);
    ctx.font = '600 ' + Math.max(12, Math.round(w * 0.022)) + 'px ' + fam;
    ctx.fillStyle = '#ece6d6';
    ctx.fillText(statusSub, w * 0.5, 12 + h * 0.11);

    // Legenda semplice in basso
    ctx.textAlign = 'left';
    ctx.font = '600 13px ' + fam;
    const ky = h - 16;
    [
      ['#4ce0ff', 'Ozono O₃'],
      ['#b388ff', 'UV bloccati'],
      ['#ff4081', 'UV passanti'],
      ['#ff5252', 'Gas CFC']
    ].forEach(([cc, tx], i) => {
      const lx = 14 + i * (w * 0.245);
      ctx.fillStyle = cc;
      ctx.beginPath(); ctx.arc(lx + 5, ky - 4, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ece6d6';
      ctx.fillText(tx, lx + 14, ky);
    });
  });

  return ozonoScene;
};

// 7. La slide della Pianura Padana (modello 3D su dati reali) è in js/padana3d.js

// 8. Interazione touch per le schede della slide Inquinanti
$$('.inq-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.inq-card').forEach(c => c.classList.toggle('on', c === card));
  });
});

// 9. CORPO UMANO E ORGANI (Illustrazione anatomica vettoriale ufficiale EMBL-EBI Anatomogram)
let corpoMode = 'tutti'; // 'tutti' | 'pm10' | 'pm25'
let corpoStageEl = null;

function setCorpoMode(m) {
  corpoMode = m;
  $$('[data-corpo]').forEach(el => {
    const on = el.dataset.corpo === m;
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (corpoStageEl) corpoStageEl.setAttribute('data-mode', m);
}

$$('[data-corpo]').forEach(el => {
  el.addEventListener('click', () => setCorpoMode(el.dataset.corpo));
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setCorpoMode(el.dataset.corpo);
    }
  });
});

scenes.corpo = host => {
  corpoStageEl = host;
  host.setAttribute('data-mode', corpoMode);

  // Costruisci il palco con l'SVG anatomico ufficiale EMBL-EBI + 4 pin minimali + barra di scala in basso
  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'corpo-body-wrap';
  bodyWrap.innerHTML = (window.ANATOMOGRAM_SVG || '') + `
    <div class="corpo-pin" data-pin="pm25" style="right:4px;top:6%;--pc:#ff4769">
      <b>Cervello (PM2.5)</b>
      <span>Ictus, infiammazione nervosa</span>
    </div>
    <div class="corpo-pin" data-pin="pm10" style="left:4px;top:17%;--pc:#ff9f1c">
      <b>1 · Naso e Faringe (PM10)</b>
      <span>Rinite, bruciore a occhi e gola</span>
    </div>
    <div class="corpo-pin" data-pin="pm10" style="left:4px;top:46%;--pc:#ff9f1c">
      <b>2 · Trachea e Bronchi (PM10)</b>
      <span>Tosse, bronchite, attacchi d’asma</span>
    </div>
    <div class="corpo-pin" data-pin="pm25" style="right:4px;top:56%;--pc:#ff4769">
      <b>3 · Polmoni, Sangue e Cuore (PM2.5)</b>
      <span>Alveoli → arterie, infarti, polmoniti</span>
    </div>
  `;

  const scaleBar = document.createElement('div');
  scaleBar.className = 'corpo-scale';
  scaleBar.innerHTML = `
    <div class="corpo-sc-item">
      <div class="corpo-sc-dot" style="width:36px;height:36px;background:#9c6638;border:2px solid #e0b084">60µm</div>
      <div class="corpo-sc-txt"><b style="color:#e0b084">Capello umano</b><span>Diametro 50–70 µm</span></div>
    </div>
    <div class="corpo-sc-item">
      <div class="corpo-sc-dot" style="width:16px;height:16px;background:#ff9f1c;box-shadow:0 0 10px rgba(255,159,28,.6)"></div>
      <div class="corpo-sc-txt"><b style="color:#ff9f1c">PM10 (≤ 10 µm)</b><span>1/5 di capello · Bronchi</span></div>
    </div>
    <div class="corpo-sc-item">
      <div class="corpo-sc-dot" style="width:8px;height:8px;background:#ff335c;box-shadow:0 0 10px rgba(255,51,92,.8)"></div>
      <div class="corpo-sc-txt"><b style="color:#ff4769">PM2.5 (≤ 2,5 µm)</b><span>1/25 · Entra nel sangue</span></div>
    </div>
  `;

  host.innerHTML = '';
  host.appendChild(bodyWrap);
  host.appendChild(scaleBar);

  // Interazione touch diretta sugli organi dell'SVG EMBL-EBI o sui pin
  $$('.org-pm10, [data-pin="pm10"]', bodyWrap).forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      setCorpoMode(corpoMode === 'pm10' ? 'tutti' : 'pm10');
    });
  });
  $$('.org-pm25, [data-pin="pm25"]', bodyWrap).forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      setCorpoMode(corpoMode === 'pm25' ? 'tutti' : 'pm25');
    });
  });
  bodyWrap.addEventListener('click', () => setCorpoMode('tutti'));

  return {
    start() {},
    stop() {},
    redraw() {},
    size() {}
  };
};
