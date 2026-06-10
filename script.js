// ── Footer year ──────────────────────────────────────────
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// ── Theme switcher (initial theme set inline in <head>) ──
const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
  const sync = () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    themeToggle.setAttribute('aria-pressed', String(light));
  };
  sync();
  themeToggle.addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  });
}

// ── Mobile nav toggle ────────────────────────────────────
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
  // close the menu after tapping a link
  nav.querySelectorAll('.nav-links a').forEach((a) =>
    a.addEventListener('click', closeNav)
  );
  // close when tapping outside
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target)) closeNav();
  });
}

// ── Cursor-tracked specular highlight on glass ───────────
const glowEls = document.querySelectorAll('.card, .skill-card, .hero-card');
if (window.matchMedia('(hover: hover)').matches) {
  glowEls.forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// ── Scroll-reveal on enter ───────────────────────────────
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  // stagger cards within the same grid/row for a cascade effect
  revealEls.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) =>
      c.classList.contains('reveal')
    );
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 5) * 70}ms`;
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}
