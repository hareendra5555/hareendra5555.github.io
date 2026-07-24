/* ============================================================
   Hareendra Nerusu — Portfolio
   Interaction layer: inertial scroll, pointer-lit glass,
   scroll choreography.
   ============================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

// ── Footer year ──────────────────────────────────────────
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

/* ============================================================
   Inertial ("liquid") scrolling
   Keeps native scroll — we just animate the scroll position
   toward a target, so accessibility and layout stay intact.
   Touch devices keep their own momentum; we don't hijack it.
   ============================================================ */
const scroller = (() => {
  const enabled = finePointer && !reduceMotion;
  const NAV_OFFSET = 88;
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  if (!enabled) {
    return {
      enabled: false,
      to(y) { window.scrollTo({ top: clamp(y, 0, maxY()), behavior: reduceMotion ? 'auto' : 'smooth' }); },
      toEl(el) { this.to(el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET); }
    };
  }

  document.documentElement.classList.add('lenis');

  let target = window.scrollY;
  let current = target;
  let running = false;
  let lastT = 0;

  // Exponential smoothing with a fixed time constant. A per-frame
  // multiplier would settle twice as fast on a 120Hz display as on
  // 60Hz; deriving the factor from elapsed time keeps the feel
  // identical at any refresh rate. Higher LAMBDA = tighter to input.
  const LAMBDA = 19;

  const step = (now) => {
    const dt = Math.min((now - lastT) / 1000, 0.05); // clamp tab-switch gaps
    lastT = now;

    const diff = target - current;
    if (Math.abs(diff) < 0.35) {
      current = target;
      window.scrollTo(0, current);
      running = false;
      return;
    }
    current += diff * (1 - Math.exp(-LAMBDA * dt));
    window.scrollTo(0, current);
    requestAnimationFrame(step);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(step);
  };

  const push = (delta) => {
    target = clamp(target + delta, 0, maxY());
    start();
  };

  const to = (y) => {
    target = clamp(y, 0, maxY());
    start();
  };

  // Wheel / trackpad
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return; // pinch-zoom
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16; // lines
      else if (e.deltaMode === 2) d *= window.innerHeight; // pages
      push(d);
    },
    { passive: false }
  );

  // Keyboard — route through the same easing so it feels consistent
  const KEY_STEP = 110;
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const page = window.innerHeight * 0.85;
    switch (e.key) {
      case 'ArrowDown': push(KEY_STEP); break;
      case 'ArrowUp': push(-KEY_STEP); break;
      case 'PageDown': push(page); break;
      case 'PageUp': push(-page); break;
      case ' ': if (t === document.body || t === document.documentElement) { push(e.shiftKey ? -page : page); } else return; break;
      case 'Home': to(0); break;
      case 'End': to(maxY()); break;
      default: return;
    }
    e.preventDefault();
  });

  // Re-sync when something else moves the page (scrollbar drag, focus jump…)
  window.addEventListener(
    'scroll',
    () => {
      if (!running && Math.abs(window.scrollY - current) > 2) {
        current = target = window.scrollY;
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', () => { target = clamp(target, 0, maxY()); }, { passive: true });

  return {
    enabled: true,
    to,
    toEl(el) { to(el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET); }
  };
})();

// Anchor links ride the same scroller
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (id === '#top') scroller.to(0);
    else scroller.toEl(el);
    history.replaceState(null, '', id);
  });
});

/* ============================================================
   Theme switcher — circular View Transition wipe from the button
   ============================================================ */
const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
  const sync = () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    themeToggle.setAttribute('aria-pressed', String(light));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#faf7ef' : '#060d0a');
  };
  sync();

  const apply = (next) => {
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  };

  themeToggle.addEventListener('click', (e) => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';

    if (!document.startViewTransition || reduceMotion) {
      apply(next);
      return;
    }

    const r = themeToggle.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2;
    const y = e.clientY || r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    // A view transition can abort (slow frame, snapshot timeout). If that
    // happens the update callback may never run, so guarantee the theme
    // still flips — a toggle that silently does nothing is the worst outcome.
    let applied = false;
    const applyOnce = () => {
      if (applied) return;
      applied = true;
      apply(next);
    };

    let transition;
    try {
      transition = document.startViewTransition(applyOnce);
    } catch (err) {
      applyOnce();
      return;
    }

    transition.updateCallbackDone.catch(applyOnce);
    transition.finished.catch(applyOnce);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 620,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      })
      .catch(applyOnce);
  });
}

/* ============================================================
   Liquid-glass appearance control (slider + popover)
   Writes --glass-factor on :root; every glass fill scales from it.
   ============================================================ */
const glassControl = document.querySelector('.glass-control');
const glassPanel = document.getElementById('glass-panel');
if (glassControl && glassPanel) {
  const btn = glassControl.querySelector('.glass-btn');
  const panel = glassPanel; // portaled to <body>, not inside .glass-control
  const range = panel.querySelector('.glass-range');
  const valueOut = panel.querySelector('.glass-value');
  const resetBtn = panel.querySelector('.glass-reset');
  const DEFAULT = 100;

  const clampVal = (v) => Math.min(200, Math.max(20, v || DEFAULT));

  // reflect a percentage onto the document, the readout, and the track fill
  const apply = (pct, persist) => {
    pct = clampVal(pct);
    document.documentElement.style.setProperty('--glass-factor', (pct / 100).toFixed(3));
    range.value = String(pct);
    range.setAttribute('aria-valuetext', `${pct} percent`);
    valueOut.textContent = `${pct}%`;
    // fill the slider track up to the thumb (min 20 → max 200)
    range.style.setProperty('--p', `${((pct - 20) / 180) * 100}%`);
    if (persist) {
      try { localStorage.setItem('glass', String(pct)); } catch (e) {}
    }
  };

  // init from storage (falls back to the markup default)
  let saved = DEFAULT;
  try {
    const g = parseFloat(localStorage.getItem('glass'));
    if (g >= 20 && g <= 200) saved = g;
  } catch (e) {}
  apply(saved, false);

  range.addEventListener('input', () => apply(parseFloat(range.value), true));
  resetBtn.addEventListener('click', () => { apply(DEFAULT, true); range.focus(); });

  // anchor the fixed panel under the button, right-aligned to it
  const place = () => {
    const r = btn.getBoundingClientRect();
    panel.style.top = `${Math.round(r.bottom + 12)}px`;
    panel.style.right = `${Math.round(window.innerWidth - r.right)}px`;
  };

  // popover open/close
  let open = false;
  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      place();
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('open'));
    } else {
      panel.classList.remove('open');
      const done = () => { if (!open) panel.hidden = true; panel.removeEventListener('transitionend', done); };
      panel.addEventListener('transitionend', done);
    }
  };

  btn.addEventListener('click', () => setOpen(!open));
  document.addEventListener('click', (e) => {
    // panel now lives outside .glass-control (portaled to body), so exclude
    // both the control and the panel from the outside-click close
    if (open && !glassControl.contains(e.target) && !panel.contains(e.target)) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); }
  });
}

/* ============================================================
   Mobile nav
   ============================================================ */
const nav = document.querySelector('.nav');
const navToggle = document.querySelector('.nav-toggle');
if (nav && navToggle) {
  const closeNav = () => {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target)) closeNav();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) closeNav();
  });
}

/* ============================================================
   Pointer-lit glass — one delegated listener drives the
   specular blob and the lit rim on whichever pane is hovered.
   ============================================================ */
if (finePointer) {
  const spotlight = document.querySelector('.spotlight');
  let lit = null;
  let pending = false;
  let ev = null;

  const paint = () => {
    pending = false;
    const el = ev.target.closest ? ev.target.closest('.glass') : null;
    if (el !== lit) {
      if (lit) { lit.style.removeProperty('--mx'); lit.style.removeProperty('--my'); }
      lit = el;
    }
    if (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      el.style.setProperty('--my', `${ev.clientY - r.top}px`);
    }
    // Set on the spotlight itself, not on <body> — a custom property
    // written to body invalidates style for the whole subtree.
    if (spotlight) {
      spotlight.style.setProperty('--sx', `${ev.clientX}px`);
      spotlight.style.setProperty('--sy', `${ev.clientY}px`);
    }
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      ev = e;
      if (!document.body.classList.contains('pointer-active')) {
        document.body.classList.add('pointer-active');
      }
      if (!pending) {
        pending = true;
        requestAnimationFrame(paint);
      }
    },
    { passive: true }
  );

  document.documentElement.addEventListener('pointerleave', () =>
    document.body.classList.remove('pointer-active')
  );
}

/* ============================================================
   Magnetic buttons
   ============================================================ */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.magnetic').forEach((el) => {
    const strength = el.classList.contains('icon-link') ? 0.34 : 0.22;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${(e.clientX - r.left - r.width / 2) * strength}px`);
      el.style.setProperty('--ty', `${(e.clientY - r.top - r.height / 2) * strength}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    });
  });
}

/* ============================================================
   The emblem through the years — every relight is a new era
   ============================================================ */
const ERAS = [
  { id: 'bat-1939',   era: '1939 · Detective Comics #27', line: 'It’s not who I am underneath, but what I do that defines me.' },
  { id: 'bat-1941',   era: '1941 · The spiked wings',     line: 'The night is darkest just before the dawn.' },
  { id: 'bat-1966',   era: '1966 · The oval years',       line: 'A hero can be anyone.' },
  { id: 'bat-1989',   era: '1989 · Burton’s Batman',      line: 'Why do we fall? So we can learn to pick ourselves up.' },
  { id: 'bat-2005',   era: '2005 · Batman Begins',        line: 'A symbol can be incorruptible.' },
  { id: 'bat-snyder', era: '2016 · Dawn of Justice',      line: 'Tell me — do you bleed?' }
];

let eraIdx = 0;
try {
  const saved = parseInt(localStorage.getItem('era'), 10);
  if (Number.isInteger(saved) && saved >= 0 && saved < ERAS.length) eraIdx = saved;
} catch (e) {}

const currentEra = () => ERAS[eraIdx % ERAS.length];

// each emblem carries its own viewBox, so any host <svg> has to adopt it
function paintEmblem(svg) {
  if (!svg) return;
  const { id } = currentEra();
  const symbol = document.getElementById(id);
  if (symbol) svg.setAttribute('viewBox', symbol.getAttribute('viewBox'));
  const use = svg.querySelector('use');
  if (use) use.setAttribute('href', '#' + id);
}

const signalSvg = document.querySelector('.bat-signal svg');

const signalSwitch = document.querySelector('.signal-switch');
if (signalSwitch) {
  const bat = signalSwitch.querySelector('.switch-bat');
  const label = signalSwitch.querySelector('.switch-label');
  const quoteEl = document.querySelector('.signal-quote');
  const eraEl = quoteEl && quoteEl.querySelector('.quote-era');
  const lineEl = quoteEl && quoteEl.querySelector('.quote-line');
  const switchSvg = bat && bat.querySelector('svg');
  let quoteTimer = null;

  const paintAll = () => {
    paintEmblem(signalSvg);
    paintEmblem(switchSvg);
  };
  paintAll();

  const showQuote = () => {
    if (!quoteEl) return;
    const { era, line } = currentEra();
    if (eraEl) eraEl.textContent = era;
    if (lineEl) lineEl.textContent = '“' + line + '”';
    quoteEl.classList.add('show');
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => quoteEl.classList.remove('show'), 4600);
  };

  const render = (lit) => {
    document.body.classList.toggle('signal-on', lit);
    signalSwitch.setAttribute('aria-pressed', String(lit));
    signalSwitch.setAttribute('aria-label', lit ? 'Douse the bat-signal' : 'Light the bat-signal');
    if (label) label.textContent = lit ? 'Douse the signal' : 'Light the signal';
  };

  let lit = false;
  try { lit = localStorage.getItem('signal') === 'on'; } catch (e) {}
  render(lit);

  signalSwitch.addEventListener('click', () => {
    lit = !lit;

    // every time it's relit, the emblem advances an era
    if (lit) {
      eraIdx = (eraIdx + 1) % ERAS.length;
      try { localStorage.setItem('era', String(eraIdx)); } catch (e) {}
      paintAll();
    }

    render(lit);
    try { localStorage.setItem('signal', lit ? 'on' : 'off'); } catch (e) {}

    if (bat && !reduceMotion) {
      bat.classList.remove('spin');
      void bat.offsetWidth; // restart the animation
      bat.classList.add('spin');
    }
    if (lit) showQuote();
    else if (quoteEl) quoteEl.classList.remove('show');
  });
}

/* ============================================================
   Bat burst — a batarang tumbles out of every button press
   ============================================================ */
if (!reduceMotion) {
  document.addEventListener('click', (e) => {
    // .to-top is deliberately excluded — it fires the grapple instead,
    // and a spinning bat on top of that is just noise
    const btn = e.target.closest('.btn, .icon-link, .music-card, .brand');
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2;
    const y = e.clientY || r.top + r.height / 2;

    const burst = document.createElement('div');
    burst.className = 'bat-burst';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    // the batarang matches whichever era the signal is showing
    burst.innerHTML = '<svg aria-hidden="true"><use /></svg>';
    paintEmblem(burst.querySelector('svg'));
    document.body.appendChild(burst);

    const anim = burst.animate(
      [
        { transform: 'rotate(0deg) scale(0.25)', opacity: 0.95 },
        { transform: 'rotate(300deg) scale(1.15)', opacity: 0.75, offset: 0.55 },
        { transform: 'rotate(720deg) scale(1.9)', opacity: 0 }
      ],
      { duration: 850, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    anim.finished.catch(() => {}).finally(() => burst.remove());
  });
}

/* ============================================================
   Throwable batarang (contact) — fling it on a spinning arc
   ============================================================ */
const batarang = document.querySelector('.batarang');
if (batarang) {
  let flying = false;
  batarang.addEventListener('click', () => {
    if (flying) return;
    flying = true;
    batarang.classList.add('throwing');

    const kf = reduceMotion
      ? [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }]
      : [
          { transform: 'translate(0,0) rotate(0deg)', offset: 0 },
          { transform: 'translate(-150px,-72px) rotate(380deg)', offset: 0.28 },
          { transform: 'translate(-330px,-26px) rotate(760deg)', offset: 0.5 },
          { transform: 'translate(-150px,-80px) rotate(1140deg)', offset: 0.72 },
          { transform: 'translate(0,0) rotate(1440deg)', offset: 1 }
        ];

    const anim = batarang.animate(kf, {
      duration: reduceMotion ? 600 : 1150,
      easing: 'cubic-bezier(0.4, 0.05, 0.3, 1)'
    });
    anim.finished
      .catch(() => {})
      .finally(() => { batarang.classList.remove('throwing'); flying = false; });
  });
}

/* ============================================================
   Scroll-reveal + staggered cascade
   ============================================================ */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
        const counters = entry.target.querySelectorAll('.num[data-count]');
        counters.forEach(runCounter);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  revealEls.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) =>
      c.classList.contains('reveal')
    );
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 5) * 80}ms`;
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('in'));
  document.querySelectorAll('.num[data-count]').forEach(runCounter);
}

/* ── Animated stat counters ── */
function runCounter(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';

  const to = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const sep = el.dataset.sep === '1';
  const format = (v) => {
    const s = v.toFixed(decimals);
    return sep ? Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals }) : s;
  };

  // The final value lives in the markup so it's correct without JS.
  // Only rewind to zero when we're actually going to animate.
  if (reduceMotion) return;

  el.textContent = format(0);
  const duration = 1500;
  const start = performance.now();
  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 4); // quart-out
    el.textContent = format(to * eased);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = format(to);
  };
  requestAnimationFrame(tick);
}

/* ============================================================
   Nav: morphing indicator pill + scroll spy
   ============================================================ */
const navLinksWrap = document.querySelector('.nav-links');
const navIndicator = document.querySelector('.nav-indicator');
const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

let activeLink = null;

function moveIndicator(link) {
  if (!navIndicator || !link || window.innerWidth <= 940) return;
  navIndicator.style.setProperty('--x', `${link.offsetLeft}px`);
  navIndicator.style.setProperty('--w', `${link.offsetWidth}px`);
  navIndicator.classList.add('on');
}

if (navLinksWrap && navIndicator) {
  navLinks.forEach((link) => {
    link.addEventListener('pointerenter', () => moveIndicator(link));
  });
  navLinksWrap.addEventListener('pointerleave', () => {
    if (activeLink) moveIndicator(activeLink);
    else navIndicator.classList.remove('on');
  });
}

/* ============================================================
   Single rAF ticker for everything scroll-driven
   ============================================================ */
const navShell = document.querySelector('.nav-shell');
const navProgress = document.querySelector('.nav-progress');
const aurora = document.querySelector('.aurora');
const toTop = document.querySelector('.to-top');
const tlFill = document.querySelector('.tl-fill');
const tlRail = document.querySelector('.tl-rail');
const nativeRailFill = CSS.supports && CSS.supports('animation-timeline', 'scroll()');

let ticking = false;

function onScrollFrame() {
  ticking = false;
  const y = window.scrollY;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

  // nav condense + reading progress
  if (navShell) navShell.classList.toggle('scrolled', y > 24);
  if (navProgress) navProgress.style.setProperty('--p', clamp(y / max, 0, 1).toFixed(4));

  // aurora parallax
  if (aurora && !reduceMotion) aurora.style.setProperty('--par-y', `${y * -0.06}px`);

  // back-to-top
  if (toTop) toTop.classList.toggle('show', y > window.innerHeight * 0.7);

  // timeline rail fill (only when CSS scroll-timelines aren't available)
  if (tlFill && tlRail && !nativeRailFill) {
    const r = tlRail.getBoundingClientRect();
    const p = clamp((window.innerHeight * 0.65 - r.top) / Math.max(1, r.height), 0, 1);
    tlFill.style.setProperty('--fill', p.toFixed(4));
  }

  // scroll spy
  let current = null;
  sections.forEach((s, i) => {
    if (s.getBoundingClientRect().top <= 150) current = navLinks[i];
  });
  // The final section can sit below the trigger line even at max scroll,
  // so it would never light up. At the bottom, it always wins.
  if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    current = navLinks[navLinks.length - 1];
  }
  if (current !== activeLink) {
    navLinks.forEach((l) => l.classList.remove('active'));
    activeLink = current;
    if (activeLink) {
      activeLink.classList.add('active');
      if (navIndicator && !navLinksWrap.matches(':hover')) moveIndicator(activeLink);
    } else if (navIndicator) {
      navIndicator.classList.remove('on');
    }
  }
}

const requestTick = () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScrollFrame);
  }
};

window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', requestTick, { passive: true });

/* Grapple to top: fire the line at the rooftop, then ascend. */
if (toTop) {
  toTop.addEventListener('click', () => {
    if (reduceMotion) {
      scroller.to(0);
      return;
    }

    const HOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 23v-10"/><path d="M12 13c0-3.2-2.6-5.4-5.4-5.4"/>' +
      '<path d="M12 13c0-3.2 2.6-5.4 5.4-5.4"/><path d="M6.6 7.6 4.9 4.9"/>' +
      '<path d="m17.4 7.6 1.7-2.7"/></svg>';

    const r = toTop.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const startY = r.top - 4;
    const endY = 16;                       // where it bites the rooftop
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const FLIGHT = 320;

    const line = document.createElement('div');
    line.className = 'grapple-line';
    line.style.left = `${x - 1}px`;
    line.style.top = `${endY}px`;
    line.style.height = `${Math.max(0, startY - endY)}px`;

    const hook = document.createElement('div');
    hook.className = 'grapple-hook';
    hook.style.left = `${x}px`;
    hook.innerHTML = HOOK;

    document.body.append(line, hook);

    // rope pays out from the button while the hook rides up ahead of it —
    // same easing on both, otherwise the hook detaches from the line
    const fire = line.animate(
      [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: FLIGHT, easing: EASE, fill: 'forwards' }
    );
    hook.animate(
      [{ transform: `translateY(${startY}px)` }, { transform: `translateY(${endY}px)` }],
      { duration: FLIGHT, easing: EASE, fill: 'forwards' }
    );

    // the launcher kicks back
    const icon = toTop.querySelector('.grapple-icon');
    if (icon) {
      icon.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
        { duration: 460, easing: 'cubic-bezier(0.34, 1.4, 0.5, 1)' }
      );
    }

    fire.finished
      .then(() => {
        // it catches — then he goes up
        const anchor = document.createElement('div');
        anchor.className = 'grapple-anchor';
        anchor.style.left = `${x}px`;
        anchor.style.top = `${endY}px`;
        document.body.appendChild(anchor);
        anchor.animate(
          [
            { transform: 'scale(0.4)', opacity: 1 },
            { transform: 'scale(2)', opacity: 0 }
          ],
          { duration: 460, easing: 'ease-out' }
        ).finished.catch(() => {}).finally(() => anchor.remove());

        scroller.to(0);

        return Promise.all(
          [line, hook].map((el) =>
            el.animate([{ opacity: 1 }, { opacity: 0 }],
              { duration: 460, delay: 160, easing: 'ease-out', fill: 'forwards' }).finished
          )
        );
      })
      .catch(() => {})
      .finally(() => { line.remove(); hook.remove(); });
  });
}

/* ============================================================
   Entrance choreography
   ============================================================ */
const reveal = () => requestAnimationFrame(() => {
  document.body.classList.add('loaded');
  onScrollFrame();
});

if (document.readyState === 'complete') reveal();
else window.addEventListener('load', reveal);
// don't let a slow font/asset hold the hero hostage
setTimeout(reveal, 900);
