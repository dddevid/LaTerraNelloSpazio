// js/deck.js - Motore della presentazione, gestione slide, touch/swipe LIM e fullscreen

const slides = $$('.slide');
const N = slides.length;
window.slidesCount = N;
const seg = $('#seg');
const slideNumEl = $('#slide-num');
const btnFs = $('#btn-fs');
let cur = 0;
window.curSlideIndex = 0;
let pend = null;
const reg = {};

// Inizializzazione scene canvas registrate
slides.forEach((s, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', 'Vai alla slide ' + (i + 1));
  b.onclick = () => go(i);
  if (seg) seg.append(b);

  $$('[data-scene]', s).forEach(cv => {
    const f = scenes[cv.dataset.scene];
    if (f) (reg[i] ??= []).push(f(cv));
  });
});

const startScenes = i => {
  (reg[i] || []).forEach(s => s.start());
  if (slides[i].dataset.id === 'sole' && window.sunStart) window.sunStart();
};
const stopScenes = i => {
  (reg[i] || []).forEach(s => s.stop());
  if (slides[i].dataset.id === 'sole' && window.sunStop) window.sunStop();
};

function tone(i) {
  const fg = getComputedStyle(slides[i]).getPropertyValue('--fg').trim();
  const bg = getComputedStyle(slides[i]).getPropertyValue('--bg').trim();
  document.documentElement.style.setProperty('--nav', fg);
  document.documentElement.style.setProperty('--navbg', bg);
}

function mark(push) {
  $$('button', seg).forEach((b, i) => b.setAttribute('aria-current', i === cur));
  const prevBtn = $('#prev'), nextBtn = $('#next');
  if (prevBtn) prevBtn.disabled = cur === 0;
  if (nextBtn) nextBtn.disabled = cur === N - 1;
  if (slideNumEl) slideNumEl.textContent = (cur + 1) + ' / ' + N;
  try {
    history[push ? 'pushState' : 'replaceState'](null, '', '#' + (cur + 1));
  } catch (e) {}
}

const EASE = 'cubic-bezier(.7,0,.15,1)';

function settle() {
  if (!pend) return;
  const p = pend;
  pend = null;
  p.anims.forEach(a => {
    a.onfinish = a.oncancel = null;
    try { a.cancel(); } catch (e) {}
  });
  p.from.classList.remove('active', 'leaving');
  slides.forEach(x => { x.style.zIndex = ''; });
  stopScenes(p.fi);
}

function go(n, ev, silent) {
  if (n === cur || n < 0 || n >= N) return;
  settle();

  const from = slides[cur], to = slides[n], fi = cur, back = n < cur;
  const ox = (ev && ev.clientX > 0) ? ev.clientX : window.innerWidth * (back ? 0.06 : 0.94);
  const oy = (ev && ev.clientY > 0) ? ev.clientY : window.innerHeight * 0.92;

  cur = n;
  window.curSlideIndex = cur;
  to.classList.add('active');
  tone(n);
  mark(!silent);
  startScenes(n);
  countUp(to);

  if (to.dataset.id === 'finale') {
    flT = 0;
    flKey = -1;
    flLight = null;
    ringT = -1;
    burstDone = false;
    burst = [];
    setAuto(true);
  }

  if (!to.animate) {
    from.classList.remove('active');
    stopScenes(fi);
    return;
  }

  from.classList.add('leaving');
  const r = Math.hypot(Math.max(ox, window.innerWidth - ox), Math.max(oy, window.innerHeight - oy)) + 20;
  const clip = k => `circle(${k}px at ${ox}px ${oy}px)`;
  const anims = [];

  if (!back) {
    to.style.zIndex = 4;
    from.style.zIndex = 2;
    anims.push(to.animate([{ clipPath: clip(0) }, { clipPath: clip(r) }], { duration: 900, easing: EASE }));
    anims.push(from.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(.93)', filter: 'brightness(.55)' }], { duration: 900, easing: EASE }));
  } else {
    from.style.zIndex = 4;
    to.style.zIndex = 3;
    anims.push(from.animate([{ clipPath: clip(r) }, { clipPath: clip(0) }], { duration: 800, easing: EASE }));
    anims.push(to.animate([{ transform: 'scale(.93)', filter: 'brightness(.55)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 800, easing: EASE }));
  }

  pend = { fi, from, to, anims };
  anims[0].onfinish = anims[0].oncancel = () => {
    if (pend && pend.anims === anims) settle();
  };
}
window.goToSlide = go;

function countUp(slide) {
  $$('[data-count]', slide).forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suf || '';
    const pre = el.dataset.pre || '';
    el.textContent = pre + '0' + suf;
    const t0 = performance.now() + 550;
    const tick = n => {
      const k = clamp((n - t0) / 1300);
      el.textContent = pre + Math.round(to * (1 - Math.pow(1 - k, 4))) + suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function splitWords(el) {
  const txt = el.textContent;
  let k = 0;
  const frag = document.createDocumentFragment();
  [...el.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      n.textContent.split(/(\s+)/).forEach(tok => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) {
          frag.append(' ');
          return;
        }
        const w = document.createElement('span');
        w.className = 'w';
        const i = document.createElement('i');
        i.style.setProperty('--k', k++);
        i.textContent = tok;
        w.append(i);
        frag.append(w);
      });
    } else {
      frag.append(n.cloneNode(true));
    }
  });
  el.textContent = '';
  el.append(frag);
  el.setAttribute('aria-label', txt.replace(/\s+/g, ' ').trim());
}
window.splitWords = splitWords;

// Pulsanti freccia, data-next e data-goto (salto rapido capitolo)
const nextBtn = $('#next'), prevBtn = $('#prev');
if (nextBtn) nextBtn.onclick = e => go(cur + 1, e);
if (prevBtn) prevBtn.onclick = e => go(cur - 1, e);
$$('[data-next]').forEach(b => b.addEventListener('click', e => go(cur + 1, e)));
$$('[data-goto]').forEach(b => {
  b.addEventListener('click', e => {
    const targetId = b.dataset.goto;
    const idx = slides.findIndex(s => s.dataset.id === targetId);
    if (idx >= 0) go(idx, e);
  });
});

// Pulsante Schermo Intero per la LIM
if (btnFs) {
  btnFs.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
}

// Navigazione da tastiera
window.addEventListener('keydown', e => {
  if (e.target.matches('input') && !['Backspace', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) return;
  const fin = slides[cur].dataset.id === 'finale';
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !fin && !e.target.matches('button')) || (e.key === 'Enter' && !e.target.matches('button'))) {
    e.preventDefault();
    go(cur + 1);
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
    e.preventDefault();
    go(cur - 1);
  } else if (e.key === 'Home') {
    go(0);
  } else if (e.key === 'End') {
    go(N - 1);
  } else if (fin && e.key === 'ArrowUp') {
    e.preventDefault();
    scrub(0.02);
  } else if (fin && e.key === 'ArrowDown') {
    e.preventDefault();
    scrub(-0.02);
  } else if (fin && e.key === ' ' && !e.target.matches('button')) {
    e.preventDefault();
    if (fplay) fplay.click();
  }
});

// Gesture Swipe touch intelligente per LIM
let touchStartX = null, touchStartY = 0, touchIgnored = false;
window.addEventListener('touchstart', e => {
  const target = e.target;
  if (target.closest('input, button, .chip, .pend, #fl, .fl-rail, .donut, #sunwrap, #phases, .leg, .st-spectrum, .st-vis, .sim-ctl, .padana3d, .inq-card, .stp, .corpo-tab, .corpo-stage')) {
    touchIgnored = true;
    return;
  }
  touchIgnored = false;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', e => {
  if (touchIgnored || touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = null;
  if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    go(cur + (dx < 0 ? 1 : -1));
  }
}, { passive: true });

// Mouse wheel laterale per cambio slide
let wl = 0;
window.addEventListener('wheel', e => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.4 && Math.abs(e.deltaX) > 40 && performance.now() - wl > 1000) {
    wl = performance.now();
    go(cur + (e.deltaX > 0 ? 1 : -1));
  }
}, { passive: true });

// Hash URL
window.addEventListener('popstate', () => {
  const n = parseInt(location.hash.slice(1)) - 1;
  if (Number.isFinite(n) && n >= 0 && n < N && n !== cur) go(n, null, true);
});

// Preparazione titoli
$$('.slide:not([data-id=finale]) .display').forEach(el => {
  el.removeAttribute('data-r');
  splitWords(el);
});

// Avvio alla slide corrente da hash o iniziale
const hash = parseInt(location.hash.slice(1)) - 1;
cur = Number.isFinite(hash) && hash >= 0 && hash < N ? hash : 0;
window.curSlideIndex = cur;
slides[cur].classList.add('active');
tone(cur);
mark();

startScenes(cur);
countUp(slides[cur]);
if (slides[cur].dataset.id === 'finale') {
  flT = 0;
  setAuto(true);
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    (reg[cur] || []).forEach(s => s.redraw && s.redraw());
  });
}
