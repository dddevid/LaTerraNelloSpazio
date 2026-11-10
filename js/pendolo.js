// js/pendolo.js - Simulazione Prospettica 3D del Pendolo di Foucault (Slide prove)

(function() {
  const pT = $('#pt'), pA = $('#pa');
  let simTime = 0;          // Tempo simulato in ore (0 .. 48)
  let pendPaused = false;
  let pendView = 'pantheon'; // 'pantheon' (osservatore a Terra) o 'spazio' (sistema inerziale)
  let latDeg = 48.86;        // Default: Parigi (Pantheon, 48°51' N -> ~11.25°/ora)
  let latName = 'Parigi (49°N)';
  let pendScene = null;

  // Velocità angolare oraria di precessione: omega = 15°/h * sin(latitudine)
  const getRateDeg = () => 15 * Math.sin(latDeg * Math.PI / 180);

  const btnToggleView = $('#pend-view');
  const btnPlay = $('#pend-play');
  const btnStep = $('#pend-step');
  const btnReset = $('#pend-reset');
  const latBtns = $$('[data-lat]');

  function updateReadout() {
    const rate = getRateDeg();
    const deg = (simTime * rate) % 360;
    if (pT) pT.textContent = simTime.toFixed(1).replace('.', ',');
    if (pA) pA.textContent = Math.round(deg) + '°';
  }

  if (btnToggleView) {
    btnToggleView.onclick = () => {
      pendView = pendView === 'pantheon' ? 'spazio' : 'pantheon';
      btnToggleView.textContent = pendView === 'pantheon' ? 'Vista: Pantheon (Terra)' : 'Vista: Spazio (Inerziale)';
      btnToggleView.setAttribute('aria-pressed', pendView === 'spazio');
      if (pendScene) pendScene.redraw();
    };
  }

  if (btnPlay) {
    btnPlay.onclick = () => {
      pendPaused = !pendPaused;
      btnPlay.textContent = pendPaused ? 'Riprendi' : 'Pausa';
      btnPlay.setAttribute('aria-pressed', pendPaused);
    };
  }

  if (btnStep) {
    btnStep.onclick = () => {
      simTime = (simTime + 3) % 32;
      updateReadout();
      if (pendScene) pendScene.redraw();
    };
  }

  if (btnReset) {
    btnReset.onclick = () => {
      simTime = 0;
      updateReadout();
      if (pendScene) pendScene.redraw();
    };
  }

  latBtns.forEach(b => {
    b.onclick = () => {
      latDeg = parseFloat(b.dataset.lat);
      latName = b.dataset.latname || '';
      latBtns.forEach(x => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-pressed', x === b);
      });
      simTime = 0;
      updateReadout();
      if (pendScene) pendScene.redraw();
    };
  });

  scenes.pendolo = c => {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartHours = 0;

    c.addEventListener('pointerdown', e => {
      isDragging = true;
      c.setPointerCapture(e.pointerId);
      dragStartX = e.clientX;
      dragStartHours = simTime;
    });

    c.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      simTime = clamp(dragStartHours + dx * 0.04, 0, 32);
      updateReadout();
      if (pendScene) pendScene.redraw();
    });

    const stopDrag = () => { isDragging = false; };
    c.addEventListener('pointerup', stopDrag);
    c.addEventListener('pointercancel', stopDrag);

    pendScene = makeScene(c, (ctx, w, h, t, dt) => {
      if (!pendPaused && !isDragging) {
        // 1 ora simulata ogni ~2.2 secondi reali
        simTime = (simTime + dt * 0.45) % 32;
        updateReadout();
      }

      const rateDeg = getRateDeg();
      const rotRad = (simTime * rateDeg * Math.PI) / 180; // Angolo di precessione accumulato

      // Parametri geometrici 3D
      const cx = w * 0.54;
      const domeY = h * 0.14;          // Punto di sospensione nella cupola (sotto il titolo)
      const floorY = h * 0.59;         // Centro del pavimento di sabbia in basso
      const R = Math.min(w * 0.36, h * 0.28); // Raggio orizzontale della vasca di sabbia
      const tilt = 0.43;               // Rapporto di schiacciamento prospettico verticale dell'ellisse
      const wireLen = floorY - domeY;

      // Funzione di proiezione da coordinate del piatto (x, y, z_up) a schermo (sx, sy)
      // x: Est(+)/Ovest(-), y: Sud(+)/Nord(-), z: altezza dal pavimento di sabbia
      const proj = (x, y, z = 0) => ({
        x: cx + x,
        y: floorY + y * tilt - z
      });

      // Angoli nei due sistemi di riferimento:
      // - Vista Pantheon (Terra): il pavimento è fisso (floorRot = 0), il piano del pendolo ruota in senso orario (+rotRad)
      // - Vista Spazio (Inerziale): il piano del pendolo resta fisso Nord-Sud (swingRot = 0), il pavimento ruota in senso antiorario (-rotRad)
      const floorRot = pendView === 'pantheon' ? 0 : -rotRad;
      const swingRot = pendView === 'pantheon' ? rotRad : 0;

      // 1. Disegno della Cupola del Pantheon in alto e colonne/archi di sfondo
      ctx.save();
      const domeW = R * 1.15;
      ctx.strokeStyle = 'rgba(236,230,214,.12)';
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, domeY);
        ctx.quadraticCurveTo(cx + i * domeW * 0.32, domeY + wireLen * 0.25, cx + i * domeW * 0.38, floorY - R * tilt * 0.2);
        ctx.stroke();
      }
      // Anello dell'oculo della cupola
      ctx.fillStyle = '#252d38';
      ctx.strokeStyle = '#f0a81a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, domeY, 44, 14, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(240,168,26,.85)';
      ctx.font = '700 12px ' + FONT();
      ctx.textAlign = 'center';
      ctx.fillText('cupola · filo 67 m', cx, domeY - 20);
      ctx.restore();

      // 2. Basamento 3D e Vasca di Sabbia del Pantheon
      // Spessore cilindrico del bordo in marmo
      const rimDepth = 18;
      ctx.fillStyle = '#6e5d3e';
      ctx.beginPath();
      ctx.ellipse(cx, floorY + rimDepth, R * 1.08, R * 1.08 * tilt, 0, 0, Math.PI);
      ctx.lineTo(cx - R * 1.08, floorY);
      ctx.ellipse(cx, floorY, R * 1.08, R * 1.08 * tilt, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();

      // Corona esterna in legno/marmo
      ctx.fillStyle = '#9e885c';
      ctx.beginPath();
      ctx.ellipse(cx, floorY, R * 1.08, R * 1.08 * tilt, 0, 0, TAU);
      ctx.fill();

      // Letto circolare di sabbia dorata
      const sandGrad = ctx.createRadialGradient(cx, floorY - R * 0.1, R * 0.05, cx, floorY, R);
      sandGrad.addColorStop(0, '#e8d8b0');
      sandGrad.addColorStop(0.75, '#d4c090');
      sandGrad.addColorStop(1, '#b8a272');
      ctx.fillStyle = sandGrad;
      ctx.beginPath();
      ctx.ellipse(cx, floorY, R, R * tilt, 0, 0, TAU);
      ctx.fill();

      // 3. Griglia del pavimento, Rosa dei Venti (N, E, S, O) e Tacche graduate (ruotano con floorRot)
      ctx.save();
      // Cerchi concentrici sul pavimento
      [0.35, 0.68, 0.92].forEach(k => {
        ctx.strokeStyle = 'rgba(15,20,24,.16)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, floorY, R * k, R * k * tilt, 0, 0, TAU);
        ctx.stroke();
      });

      // Meridiani e tacche ogni 15° (1 ora di rotazione terrestre = 15°)
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg - 90) * Math.PI / 180 + floorRot;
        const isCard = deg % 90 === 0;
        const r0 = isCard ? 0.2 : 0.88;
        const p0 = proj(Math.cos(a) * R * r0, Math.sin(a) * R * r0);
        const p1 = proj(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98);
        ctx.strokeStyle = isCard ? 'rgba(15,20,24,.38)' : 'rgba(15,20,24,.22)';
        ctx.lineWidth = isCard ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Punti cardinali N, E, S, O sul pavimento
      const cards = [
        ['N', 0, '#d9381e'],
        ['E', 90, '#0f1418'],
        ['S', 180, '#0f1418'],
        ['O', 270, '#0f1418']
      ];
      ctx.font = '700 16px ' + FONT();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      cards.forEach(([label, deg, col]) => {
        const a = (deg - 90) * Math.PI / 180 + floorRot;
        const p = proj(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
        ctx.fillStyle = col;
        ctx.fillText(label, p.x, p.y);
      });
      ctx.restore();

      // 4. Settore angolare che evidenzia la rotazione apparente accumulata
      if (rotRad > 0.01) {
        ctx.save();
        ctx.fillStyle = 'rgba(217, 56, 30, 0.22)';
        ctx.strokeStyle = 'rgba(217, 56, 30, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, floorY);
        const arcSteps = 36;
        const aStart = -Math.PI / 2 + floorRot;
        const aEnd = aStart + rotRad;
        for (let i = 0; i <= arcSteps; i++) {
          const a = lerp(aStart, aEnd, i / arcSteps);
          const p = proj(Math.cos(a) * R * 0.68, Math.sin(a) * R * 0.68);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 5. Tracciato continuo a Rosetta (Ipocicloide) inciso nella sabbia!
      // Ogni ora simulata disegna un petalo continuo per mostrare chiaramente la curva di Foucault
      const amp = R * 0.82;
      const petalsPerHour = 1.5; // Frequenza dei petali della rosetta sulla sabbia
      // Fase corrente dell'oscillazione reale a schermo
      const fastOscPhase = t * 3.4;

      ctx.save();
      ctx.beginPath();
      const totalTraceHours = Math.max(0.05, simTime);
      const samples = Math.min(700, Math.max(60, Math.floor(totalTraceHours * 45)));
      for (let i = 0; i <= samples; i++) {
        const hTau = (i / samples) * totalTraceHours;
        const precessAngle = (hTau * rateDeg * Math.PI) / 180 + floorRot;
        const swingPos = -Math.cos(hTau * petalsPerHour * Math.PI) * amp;
        const tx = Math.sin(precessAngle) * swingPos;
        const ty = -Math.cos(precessAngle) * swingPos;
        const pt = proj(tx, ty, 0);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(92, 58, 22, 0.68)';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Linea del piano di oscillazione attuale (in rosso vivo)
      const pNorth = proj(Math.sin(swingRot) * amp, -Math.cos(swingRot) * amp, 0);
      const pSouth = proj(-Math.sin(swingRot) * amp, Math.cos(swingRot) * amp, 0);
      ctx.strokeStyle = '#d9381e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pNorth.x, pNorth.y);
      ctx.lineTo(pSouth.x, pSouth.y);
      ctx.stroke();
      ctx.restore();

      // 6. Birilli 3D lungo il bordo della sabbia (cadono quando il piano li supera)
      const numPegs = 24;
      for (let i = 0; i < numPegs; i++) {
        const pegDeg = (i / numPegs) * 360;
        const pegRadOnFloor = (pegDeg - 90) * Math.PI / 180;
        const screenAngle = pegRadOnFloor + floorRot;
        const px = Math.cos(screenAngle) * R * 0.92;
        const py = Math.sin(screenAngle) * R * 0.92;

        // Controllo se il birillo è stato abbattuto dal passaggio del pendolo (da 0 a rotRad o da PI a PI+rotRad)
        const relDeg1 = ((pegDeg % 180) + 180) % 180;
        const sweptDeg = simTime * rateDeg;
        const knocked = sweptDeg > 0.5 && relDeg1 <= sweptDeg;

        const basePt = proj(px, py, 0);
        if (!knocked) {
          // Birillo in piedi (cilindretto 3D)
          ctx.strokeStyle = '#3d2b14';
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(basePt.x, basePt.y);
          ctx.lineTo(basePt.x, basePt.y - 13);
          ctx.stroke();
          ctx.fillStyle = '#f0a81a';
          ctx.beginPath();
          ctx.arc(basePt.x, basePt.y - 14, 3, 0, TAU);
          ctx.fill();
        } else {
          // Birillo caduto a terra
          ctx.strokeStyle = '#d9381e';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(basePt.x - 4, basePt.y + 1);
          ctx.lineTo(basePt.x + 6, basePt.y + 4);
          ctx.stroke();
        }
      }

      // 7. Calcolo posizione 3D della Sfera del Pendolo e della sua Ombra
      const s = Math.sin(fastOscPhase) * amp; // Scostamento lungo il piano di oscillazione
      const bx = Math.sin(swingRot) * s;
      const by = -Math.cos(swingRot) * s;
      // Altezza z della sfera lungo l'arco circolare (sale leggermente agli estremi dell'oscillazione)
      const normS = s / amp;
      const bz = 18 + normS * normS * 28;

      const shadowPt = proj(bx, by, 0);
      const bobPt = proj(bx, by, bz);

      // Ombra ellittica sulla sabbia sotto la sfera
      ctx.fillStyle = 'rgba(15,20,24,.32)';
      ctx.beginPath();
      ctx.ellipse(shadowPt.x, shadowPt.y, 18 - normS * normS * 3, (18 - normS * normS * 3) * tilt, 0, 0, TAU);
      ctx.fill();

      // 8. Filo d'acciaio di 67 m dal centro della cupola alla sfera 3D
      ctx.strokeStyle = 'rgba(236,230,214,.88)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx, domeY);
      ctx.lineTo(bobPt.x, bobPt.y);
      ctx.stroke();

      // Perno cardanico nella cupola
      ctx.fillStyle = '#f0a81a';
      ctx.beginPath();
      ctx.arc(cx, domeY, 6, 0, TAU);
      ctx.fill();

      // 9. Sfera di ottone/bronzo 3D con punta (stilo)
      const bobR = 20;
      // Punta inferiore che incide la sabbia
      ctx.strokeStyle = '#e8c07a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bobPt.x, bobPt.y + bobR - 2);
      ctx.lineTo(shadowPt.x, shadowPt.y);
      ctx.stroke();

      // Corpo sferico 3D con illuminazione metallica
      const bobGrad = ctx.createRadialGradient(
        bobPt.x - bobR * 0.35,
        bobPt.y - bobR * 0.35,
        bobR * 0.1,
        bobPt.x,
        bobPt.y,
        bobR
      );
      bobGrad.addColorStop(0, '#fff3c4');
      bobGrad.addColorStop(0.35, '#f0a81a');
      bobGrad.addColorStop(0.78, '#9c5a14');
      bobGrad.addColorStop(1, '#3b1e06');

      ctx.fillStyle = bobGrad;
      ctx.beginPath();
      ctx.arc(bobPt.x, bobPt.y, bobR, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Etichetta informativa centrata sotto la vasca 3D
      const labelY = floorY + R * 1.08 * tilt + 26;
      ctx.fillStyle = '#f0a81a';
      ctx.font = '700 13.5px ' + FONT();
      ctx.textAlign = 'center';
      ctx.fillText(
        `${latName} · Precessione: ${rateDeg.toFixed(1).replace('.', ',')}°/ora`,
        cx,
        labelY
      );
      ctx.font = '500 12.5px ' + FONT();
      ctx.fillStyle = 'rgba(236,230,214,.8)';
      ctx.fillText(
        pendView === 'pantheon'
          ? 'Da Terra: il piano ruota in senso orario'
          : 'Dallo Spazio: la Terra sotto ruota in senso antiorario',
        cx,
        labelY + 18
      );
    });

    return pendScene;
  };
})();
