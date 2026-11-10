// js/padana3d.js - Modello 3D della Pianura Padana su dati REALI (NASA SRTM) con frecce di flusso 3D
// Richiede: three.min.js, OrbitControls.js, data/padana-dem.js

(function () {
  const EXAG = 6;               // esagerazione verticale (dichiarata sulla slide)
  const WX = 108, WZ = 70;      // dimensioni del plastico (1 unità ≈ 5,5 km)
  const KM = EXAG / 5540;       // metri -> unità di scena
  const LID_M = 650;            // quota del "tappo" di inversione (m s.l.m.)

  const HUD = {
    inversione: [
      'INVERNO · SMOG IN TRAPPOLA',
      'Bloccata da Alpi, Appennini e tappo caldo: l’aria gira in tondo'
    ],
    vento: [
      'VENTO FORTE (FÖHN) · ARIA PULITA',
      'Scavalca le Alpi e spinge lo smog fuori nel Mare Adriatico'
    ],
    normale: [
      'ESTATE · L’ARIA CALDA SALE',
      'Il sole scalda la pianura: le correnti disperdono gli inquinanti in quota'
    ]
  };

  scenes.padana = function (host) {
    const D = window.PADANA_DEM;
    let mode = 'inversione';
    let ready = false, running = false, raf = 0, interacted = false;
    let renderer, scene, camera, controls, last = 0, simTime = 0;
    let GW, GH, hw, terrain, lid, flowGroup, hudT, hudS, reset;
    const labels = [];
    const activeArrows = [];
    const wrap = host;
    wrap.classList.add('padana3d');

    // ---------- utilità geografiche ----------
    const wx = lon => ((lon - D.lon0) / (D.lon1 - D.lon0) - 0.5) * WX;
    const wz = lat => ((D.lat1 - lat) / (D.lat1 - D.lat0) - 0.5) * WZ;

    function hAt(x, z) {
      let u = (x / WX + 0.5) * (GW - 1), v = (z / WZ + 0.5) * (GH - 1);
      u = Math.min(Math.max(u, 0), GW - 1.001); v = Math.min(Math.max(v, 0), GH - 1.001);
      const i = u | 0, j = v | 0, fx = u - i, fz = v - j;
      return hw[j * GW + i] * (1 - fx) * (1 - fz) + hw[j * GW + i + 1] * fx * (1 - fz) +
             hw[(j + 1) * GW + i] * (1 - fx) * fz + hw[(j + 1) * GW + i + 1] * fx * fz;
    }
    const LID = LID_M * KM;

    function colorFor(m) {
      const s = [
        [0, [0.09, 0.33, 0.60]],
        [8, [0.26, 0.50, 0.28]],
        [150, [0.32, 0.55, 0.30]],
        [450, [0.40, 0.52, 0.29]],
        [900, [0.47, 0.46, 0.32]],
        [1500, [0.52, 0.44, 0.37]],
        [2200, [0.56, 0.53, 0.50]],
        [2900, [0.78, 0.78, 0.80]],
        [3600, [0.98, 0.98, 1.00]]
      ];
      if (m <= 0) return s[0][1];
      for (let k = 1; k < s.length; k++) {
        if (m <= s[k][0]) {
          const a = s[k - 1], b = s[k], f = (m - a[0]) / (b[0] - a[0]);
          return [
            a[1][0] + (b[1][0] - a[1][0]) * f,
            a[1][1] + (b[1][1] - a[1][1]) * f,
            a[1][2] + (b[1][2] - a[1][2]) * f
          ];
        }
      }
      return s[s.length - 1][1];
    }

    // ---------- Generatore di frecce 3D animate lungo curve sul rilievo reale ----------
    const RINGS = 16, SIDES = 8;
    const UP = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;
    const tmpP = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
    const tmpT = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
    const tmpN1 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
    const tmpN2 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;

    function createTailGeometry() {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(RINGS * SIDES * 3);
      const idx = [];
      for (let r = 0; r < RINGS - 1; r++) {
        for (let s = 0; s < SIDES; s++) {
          const a = r * SIDES + s;
          const b = r * SIDES + ((s + 1) % SIDES);
          const c = (r + 1) * SIDES + s;
          const d = (r + 1) * SIDES + ((s + 1) % SIDES);
          idx.push(a, c, b, b, c, d);
        }
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(idx);
      return geo;
    }

    function updateArrowMesh(ar, t) {
      const { curve, closed, speed, offset, tailSpan, headMesh, tailGeo } = ar;
      let u = (offset + t * speed) % 1;
      if (u < 0) u += 1;

      // Dissolvenza morbida alle estremità per le curve aperte
      let scale = 1;
      if (!closed) {
        const fadeIn = Math.min(1, u / 0.10);
        const fadeOut = Math.min(1, (1 - u) / 0.10);
        scale = Math.max(0.001, Math.min(fadeIn, fadeOut));
      }

      // 1. Posiziona e orienta la punta conica 3D
      curve.getPointAt(u, tmpP);
      curve.getTangentAt(u, tmpT).normalize();
      headMesh.position.copy(tmpP).addScaledVector(tmpT, 1.15 * scale);
      headMesh.quaternion.setFromUnitVectors(UP, tmpT);
      headMesh.scale.setScalar(scale);

      // 2. Aggiorna la coda tubolare 3D incurvata lungo la traiettoria
      const posAttr = tailGeo.attributes.position;
      const arr = posAttr.array;
      for (let r = 0; r < RINGS; r++) {
        const frac = r / (RINGS - 1); // 0 = punta coda, 1 = base cono
        let uRing = u - tailSpan * (1 - frac);
        if (closed) {
          uRing = ((uRing % 1) + 1) % 1;
        } else {
          uRing = Math.max(0, Math.min(1, uRing));
        }
        curve.getPointAt(uRing, tmpP);
        curve.getTangentAt(uRing, tmpT).normalize();

        // Costruisci terna ortonormale (tmpN1, tmpN2) perpendicolare alla tangente
        tmpN1.crossVectors(tmpT, UP);
        if (tmpN1.lengthSq() < 1e-4) tmpN1.set(1, 0, 0);
        else tmpN1.normalize();
        tmpN2.crossVectors(tmpT, tmpN1).normalize();

        const rad = (0.10 + 0.48 * frac) * scale;
        for (let s = 0; s < SIDES; s++) {
          const ang = (s / SIDES) * Math.PI * 2;
          const cos = Math.cos(ang) * rad, sin = Math.sin(ang) * rad;
          const k = (r * SIDES + s) * 3;
          arr[k]     = tmpP.x + tmpN1.x * cos + tmpN2.x * sin;
          arr[k + 1] = tmpP.y + tmpN1.y * cos + tmpN2.y * sin;
          arr[k + 2] = tmpP.z + tmpN1.z * cos + tmpN2.z * sin;
        }
      }
      posAttr.needsUpdate = true;
      tailGeo.computeVertexNormals();
    }

    function wpToVec3(wp) {
      // wp = [lon, lat, quotaOffsetMetri, tipo ('plain' | 'agl' | 'abs')]
      const x = wx(wp[0]), z = wz(wp[1]);
      const th = Math.max(0, hAt(x, z));
      const off = (wp[2] || 220) * KM;
      const kind = wp[3] || 'agl';
      let y;
      if (kind === 'plain') {
        y = Math.min(th + off, LID - 0.08);
      } else if (kind === 'abs') {
        y = Math.max(th + 0.35, wp[2] * KM);
      } else {
        y = th + off;
      }
      return new THREE.Vector3(x, y, z);
    }

    function addStreamline(waypoints, opts) {
      const pts = waypoints.map(wpToVec3);
      const closed = !!opts.closed;
      const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal', 0.5);

      // Tubo guida semitrasparente che mostra l'intero percorso 3D
      const tubeGeo = new THREE.TubeGeometry(curve, closed ? 96 : 64, opts.tubeRadius || 0.20, 8, closed);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: opts.color,
        transparent: true,
        opacity: opts.tubeOpacity || 0.24,
        depthWrite: false
      });
      flowGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Frecce 3D animate lungo la curva
      const headGeo = new THREE.ConeGeometry(opts.headRadius || 1.15, opts.headLen || 2.8, 14);
      const arrowMat = new THREE.MeshLambertMaterial({
        color: opts.color,
        emissive: opts.color,
        emissiveIntensity: 0.42
      });

      const count = opts.arrows || 4;
      for (let i = 0; i < count; i++) {
        const headMesh = new THREE.Mesh(headGeo, arrowMat);
        const tailGeo = createTailGeometry();
        const tailMesh = new THREE.Mesh(tailGeo, arrowMat);
        headMesh.frustumCulled = false;
        tailMesh.frustumCulled = false;
        flowGroup.add(headMesh);
        flowGroup.add(tailMesh);

        activeArrows.push({
          curve,
          closed,
          speed: opts.speed || 0.16,
          offset: i / count + (opts.phase || 0),
          tailSpan: opts.tailSpan || (closed ? 0.11 : 0.16),
          headMesh,
          tailGeo
        });
      }
    }

    function rebuildFlows(m) {
      while (flowGroup.children.length > 0) {
        const ch = flowGroup.children.pop();
        if (ch.geometry) ch.geometry.dispose();
      }
      activeArrows.length = 0;

      if (m === 'inversione') {
        // 1. Ingresso debole da Est (Mare Adriatico) che entra nella Pianura Padana
        addStreamline([
          [13.6, 44.85, 220, 'plain'],
          [12.5, 45.10, 220, 'plain'],
          [11.4, 45.28, 220, 'plain'],
          [10.2, 45.35, 220, 'plain']
        ], { color: 0x4ce0ff, arrows: 2, speed: 0.16, tailSpan: 0.22, closed: false });

        // 2. Grande anello esterno: gira in tondo bloccato da Alpi (Nord/Ovest) e Appennini (Sud)
        addStreamline([
          [11.6, 45.25, 240, 'plain'], // Veneto
          [10.2, 45.40, 240, 'plain'], // Lombardia (Brescia/Bergamo)
          [9.0,  45.42, 240, 'plain'], // Milano
          [7.9,  45.22, 240, 'plain'], // Piemonte Nord
          [7.55, 44.95, 240, 'plain'], // Torino (sbatte contro le Alpi Occidentali)
          [8.1,  44.68, 240, 'plain'], // Asti/Alessandria
          [9.3,  44.82, 240, 'plain'], // Piacenza (bloccata dagli Appennini)
          [10.5, 44.70, 240, 'plain'], // Parma/Reggio
          [11.5, 44.62, 240, 'plain'], // Bologna
          [12.0, 44.90, 240, 'plain']  // Ferrara -> chiude il giro
        ], { color: 0xff6e40, arrows: 6, speed: 0.11, tailSpan: 0.09, closed: true });

        // 3. Anello interno del vortice padano
        addStreamline([
          [10.9, 45.15, 190, 'plain'],
          [9.6,  45.25, 190, 'plain'],
          [8.5,  45.10, 190, 'plain'],
          [8.7,  44.88, 190, 'plain'],
          [10.0, 44.85, 190, 'plain'],
          [11.1, 44.92, 190, 'plain']
        ], { color: 0xffab40, arrows: 4, speed: 0.14, tailSpan: 0.12, closed: true, phase: 0.12 });

        // 4. Venti da Nord bloccati e deviati dal muro delle Alpi
        addStreamline([
          [8.3, 46.95, 2200, 'abs'],
          [8.4, 46.40, 2600, 'abs'],
          [7.7, 46.28, 3300, 'abs'],
          [7.0, 46.45, 3600, 'abs']
        ], { color: 0x80d8ff, arrows: 2, speed: 0.20, tailSpan: 0.22, closed: false });

        addStreamline([
          [10.8, 46.95, 2200, 'abs'],
          [10.9, 46.42, 2600, 'abs'],
          [11.7, 46.50, 3200, 'abs'],
          [12.5, 46.75, 3400, 'abs']
        ], { color: 0x80d8ff, arrows: 2, speed: 0.20, tailSpan: 0.22, closed: false, phase: 0.3 });

      } else if (m === 'vento') {
        // 5 grandi correnti da Nord che scavalcano le Alpi, spazzano la pianura ed escono nel Mare Adriatico
        const paths = [
          [[7.3, 46.8, 450], [7.5, 45.8, 450], [7.8, 45.05, 350], [9.4, 44.95, 320], [11.3, 44.80, 280], [13.6, 44.45, 220]],
          [[8.6, 46.9, 450], [8.8, 46.0, 450], [9.2, 45.45, 350], [10.5, 45.00, 300], [12.1, 44.75, 260], [13.7, 44.65, 220]],
          [[9.8, 46.9, 450], [10.0, 46.0, 450], [10.3, 45.35, 350], [11.5, 45.05, 300], [12.7, 44.98, 250], [13.8, 44.90, 220]],
          [[11.1, 46.9, 450], [11.1, 46.0, 450], [11.2, 45.38, 350], [12.2, 45.25, 280], [13.7, 45.15, 220]],
          [[12.3, 46.9, 450], [12.4, 46.1, 450], [12.6, 45.55, 320], [13.6, 45.38, 220]]
        ];
        paths.forEach((pts, idx) => {
          addStreamline(pts, {
            color: idx % 2 === 0 ? 0x4ce0ff : 0x3ddc97,
            arrows: 3,
            speed: 0.22,
            tailSpan: 0.17,
            closed: false,
            phase: idx * 0.18
          });
        });

      } else {
        // Estate: correnti termiche calde che salgono dalla pianura verso le valli alpine/appenniniche e l'alta quota
        const thermals = [
          [[8.2, 45.00, 180, 'abs'], [7.7, 45.15, 1100, 'abs'], [7.3, 45.35, 2500, 'abs'], [7.0, 45.55, 4200, 'abs']],
          [[9.3, 45.10, 180, 'abs'], [9.2, 45.50, 1200, 'abs'], [9.1, 45.90, 2600, 'abs'], [9.0, 46.25, 4300, 'abs']],
          [[10.6, 45.10, 180, 'abs'], [10.7, 45.55, 1200, 'abs'], [10.8, 45.95, 2600, 'abs'], [10.9, 46.35, 4300, 'abs']],
          [[11.9, 45.25, 160, 'abs'], [12.0, 45.65, 1200, 'abs'], [12.1, 46.05, 2600, 'abs'], [12.2, 46.45, 4200, 'abs']],
          [[9.5, 44.95, 180, 'abs'], [9.4, 44.68, 1100, 'abs'], [9.3, 44.42, 2300, 'abs'], [9.2, 44.20, 3700, 'abs']],
          [[11.3, 44.85, 160, 'abs'], [11.2, 44.58, 1100, 'abs'], [11.1, 44.32, 2300, 'abs'], [11.0, 44.10, 3700, 'abs']]
        ];
        thermals.forEach((pts, idx) => {
          addStreamline(pts, {
            color: idx < 4 ? 0xffca28 : 0xff9100,
            arrows: 3,
            speed: 0.20,
            tailSpan: 0.19,
            closed: false,
            phase: idx * 0.16
          });
        });
      }
    }

    // ---------- costruzione scena ----------
    function build() {
      GW = D.w; GH = D.h;
      const bin = atob(D.data), dv = new DataView(new ArrayBuffer(bin.length));
      for (let i = 0; i < bin.length; i++) dv.setUint8(i, bin.charCodeAt(i));
      hw = new Float32Array(GW * GH);
      const meters = new Float32Array(GW * GH);
      for (let i = 0; i < GW * GH; i++) { meters[i] = dv.getInt16(i * 2, true); hw[i] = meters[i] * KM; }

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.setClearColor(0x16202a);
      wrap.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction = 'none';

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(36, 1, 1, 600);
      scene.add(new THREE.HemisphereLight(0xd8ecff, 0x2a3328, 0.80));
      const sun = new THREE.DirectionalLight(0xfff1d6, 0.95);
      sun.position.set(-50, 75, 60);
      scene.add(sun);

      // terreno SRTM reale
      const pos = new Float32Array(GW * GH * 3), col = new Float32Array(GW * GH * 3);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const k = j * GW + i, m = meters[k], c = colorFor(m);
        pos[k * 3] = (i / (GW - 1) - 0.5) * WX;
        pos[k * 3 + 1] = m <= 0 ? -0.06 : hw[k];
        pos[k * 3 + 2] = (j / (GH - 1) - 0.5) * WZ;
        col.set(c, k * 3);
      }
      const idx = [];
      for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) {
        const a = j * GW + i, b = a + 1, c = a + GW, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      terrain = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
      scene.add(terrain);

      // fianchi del plastico
      const wallPos = [], wallIdx = [];
      const addWall = pts => {
        const base = wallPos.length / 3;
        pts.forEach(p => { wallPos.push(p[0], p[1], p[2]); wallPos.push(p[0], -1.2, p[2]); });
        for (let q = 0; q < pts.length - 1; q++) {
          const a = base + q * 2;
          wallIdx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
        }
      };
      const edge = (fn, n) => Array.from({ length: n }, (_, q) => fn(q));
      addWall(edge(i => { const k = (GH - 1) * GW + i; return [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]; }, GW));
      addWall(edge(j => { const k = j * GW + GW - 1; return [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]; }, GH));
      addWall(edge(i => { const k = i; return [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]; }, GW));
      addWall(edge(j => { const k = j * GW; return [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]; }, GH));
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
      wg.setIndex(wallIdx);
      scene.add(new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: 0x1b242c, side: THREE.DoubleSide })));

      // fiumi reali (Po, Ticino, Dora Baltea)
      D.rivers.forEach(r => {
        const pts = r.p.map(p => {
          const x = wx(p[0]), z = wz(p[1]);
          return new THREE.Vector3(x, Math.max(hAt(x, z), 0) + 0.08, z);
        });
        const lg = new THREE.BufferGeometry().setFromPoints(pts);
        scene.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: r.n === 'Po' ? 0x5ad1ff : 0x3fa6d6 })));
      });

      // "tappo" di inversione: solo sopra la pianura (celle tra 1 e 400 m)
      const lp = [], li = [];
      for (let j = 0; j < GH - 1; j += 2) for (let i = 0; i < GW - 1; i += 2) {
        const ms = [
          meters[j * GW + i],
          meters[j * GW + (i + 2 < GW ? i + 2 : i)],
          meters[(j + 2 < GH ? j + 2 : j) * GW + i],
          meters[(j + 2 < GH ? j + 2 : j) * GW + (i + 2 < GW ? i + 2 : i)]
        ];
        if (ms.every(m => m > 0 && m < 420)) {
          const b = lp.length / 3, i2 = Math.min(i + 2, GW - 1), j2 = Math.min(j + 2, GH - 1);
          [[i, j], [i2, j], [i, j2], [i2, j2]].forEach(([a, c]) => lp.push((a / (GW - 1) - 0.5) * WX, LID, (c / (GH - 1) - 0.5) * WZ));
          li.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
      const lgm = new THREE.BufferGeometry();
      lgm.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      lgm.setIndex(li);
      lid = new THREE.Mesh(lgm, new THREE.MeshBasicMaterial({
        color: 0xf0a81a,
        transparent: true,
        opacity: 0.20,
        side: THREE.DoubleSide,
        depthWrite: false
      }));
      scene.add(lid);

      flowGroup = new THREE.Group();
      scene.add(flowGroup);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minPolarAngle = 0.25;
      controls.maxPolarAngle = 1.38;
      controls.minDistance = 42;
      controls.maxDistance = 185;
      controls.rotateSpeed = 0.7;
      controls.addEventListener('start', () => { interacted = true; });

      buildUI();
      resetView();
      setMode(mode);
      ready = true;
    }

    // ---------- etichette minimali sopra il 3D ----------
    function addLabel(text, lon, lat, cls, dy) {
      const el = document.createElement('div');
      el.className = 'p3-l ' + cls;
      el.textContent = text;
      wrap.appendChild(el);
      const x = wx(lon), z = wz(lat);
      labels.push({ el, x, z, y: Math.max(hAt(x, z), 0) + (dy || 0.35) });
    }
    function buildUI() {
      const hud = document.createElement('div');
      hud.className = 'p3-hud';
      hud.innerHTML = '<b></b><span></span>';
      wrap.appendChild(hud);
      hudT = hud.firstChild; hudS = hud.lastChild;

      reset = document.createElement('button');
      reset.className = 'chip p3-reset';
      reset.textContent = '↺ Vista iniziale';
      reset.addEventListener('click', () => { resetView(); });
      wrap.appendChild(reset);

      const note = document.createElement('div');
      note.className = 'p3-note';
      note.textContent = 'Rilievo reale NASA SRTM · Altezze ×6 · Trascina per ruotare in 3D';
      wrap.appendChild(note);

      // Solo pochissime etichette geografiche minimali senza riquadri ingombranti
      addLabel('ALPI', 9.4, 46.35, 'reg', 1.1);
      addLabel('APPENNINI', 10.4, 44.15, 'reg', 0.7);
      addLabel('MARE ADRIATICO', 13.0, 44.50, 'sea', 0.2);
      addLabel('Torino', 7.69, 45.07, 'city', 0.3);
      addLabel('Milano', 9.19, 45.46, 'city', 0.3);
      addLabel('Venezia', 12.33, 45.44, 'city', 0.3);
    }

    function resetView() {
      interacted = false;
      fitCamera(true);
    }
    function fitCamera(force) {
      if (!renderer || (interacted && !force)) return;
      const w = Math.max(1, wrap.clientWidth), h = Math.max(1, wrap.clientHeight);
      const aspect = w / h, t = Math.tan(camera.fov * Math.PI / 360);
      const dist = Math.min(180, Math.max(WX * 0.50 / (t * aspect), WZ * 0.78 / t, 88));
      const dir = new THREE.Vector3(0.14, 0.66, 0.74).normalize();
      controls.target.set(0, 1.2, 2);
      camera.position.copy(dir.multiplyScalar(dist)).add(controls.target);
      controls.update();
    }

    function size() {
      if (!renderer) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fitCamera(false);
    }

    function setMode(m) {
      mode = m;
      $$('[data-padana]').forEach(b => {
        const on = b.dataset.padana === m;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
      if (!ready && !renderer) return;
      lid.visible = m === 'inversione';
      hudT.textContent = HUD[m][0];
      hudS.textContent = HUD[m][1];
      rebuildFlows(m);
      render();
    }
    $$('[data-padana]').forEach(b => { b.onclick = () => setMode(b.dataset.padana); });

    // ---------- rendering ----------
    const v3 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
    function placeLabels() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      labels.forEach(l => {
        v3.set(l.x, l.y, l.z).project(camera);
        if (v3.z > 1 || v3.z < -1) { l.el.style.display = 'none'; return; }
        l.el.style.display = 'block';
        const hw2 = l.el.offsetWidth / 2, lh = l.el.offsetHeight;
        const px = Math.min(Math.max((v3.x * 0.5 + 0.5) * w, hw2 + 6), w - hw2 - 6);
        const py = Math.min(Math.max((-v3.y * 0.5 + 0.5) * h, lh + 82), h - 36);
        l.el.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) translate(-50%,-100%)';
      });
    }

    function render() {
      if (!ready) return;
      controls.update();
      for (let i = 0; i < activeArrows.length; i++) {
        updateArrowMesh(activeArrows[i], simTime);
      }
      renderer.render(scene, camera);
      placeLabels();
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      simTime += dt;
      render();
      raf = requestAnimationFrame(frame);
    }

    function fail(msg) {
      wrap.innerHTML = '<div class="p3-fail">' + msg + '</div>';
    }

    const S = {
      start() {
        if (running) return;
        if (!ready) {
          if (typeof THREE === 'undefined' || !D) { fail('Libreria 3D non trovata.'); return; }
          try { build(); } catch (e) { console.error(e); fail('Il tuo schermo non supporta il 3D (WebGL).'); return; }
        }
        running = true;
        size();
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      stop() { running = false; cancelAnimationFrame(raf); },
      redraw() { if (ready) { size(); render(); } },
      size
    };
    new ResizeObserver(() => { if (ready && wrap.clientWidth > 1) { size(); if (!running) render(); } }).observe(wrap);
    return S;
  };
})();
