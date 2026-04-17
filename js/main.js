/* ============================================
   ALIZA NADINE — Main JS
   ============================================ */

// ---------- Nav: sticky + scroll state ----------
const nav = document.querySelector('.nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });
  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navToggle.classList.remove('open');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// Active nav link
(function setActiveLink() {
  const path = window.location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '');
    const isHome = (href === '' || href === 'index.html') && (path === '' || path.endsWith('index.html') || path === '/');
    const isMatch = !isHome && path.endsWith(href.replace('.html', ''));
    if (isHome || isMatch) a.classList.add('active');
  });
})();

// ---------- Intersection Observer: fade-in ----------
const fadeEls = document.querySelectorAll('.fade-in');
if (fadeEls.length) {
  // Immediately show anything already in the viewport (hero, above-fold)
  fadeEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.1) el.classList.add('visible');
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  fadeEls.forEach(el => { if (!el.classList.contains('visible')) io.observe(el); });
}

// ---------- Gallery filter (gallery.html) ----------
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

function applyFilter(cat) {
  filterBtns.forEach(b => b.classList.remove('active'));
  const match = [...filterBtns].find(b => b.dataset.filter === cat);
  if (match) match.classList.add('active');
  galleryItems.forEach(item => {
    item.classList.toggle('hidden', cat !== 'all' && item.dataset.category !== cat);
  });
}

if (filterBtns.length) {
  // Auto-apply filter from URL param e.g. gallery.html?filter=realism
  const urlFilter = new URLSearchParams(window.location.search).get('filter');
  if (urlFilter) applyFilter(urlFilter);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });
}

// ---------- Lightbox ----------
const lightbox     = document.getElementById('lightbox');
const lightboxImg  = document.getElementById('lightboxImg');
const lightboxCap  = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let currentIndex = 0;
let visibleItems  = [];

function openLightbox(index) {
  visibleItems = [...document.querySelectorAll('.gallery-item:not(.hidden)')];
  currentIndex = index;
  showSlide(currentIndex);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showSlide(i) {
  const item = visibleItems[i];
  if (!item) return;
  const img = item.querySelector('img');
  if (img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || '';
  }
  if (lightboxCap) lightboxCap.textContent = `${i + 1} / ${visibleItems.length}`;
}

if (lightbox) {
  document.querySelectorAll('.gallery-item').forEach((item, idx) => {
    item.addEventListener('click', () => {
      const visible = [...document.querySelectorAll('.gallery-item:not(.hidden)')];
      openLightbox(visible.indexOf(item));
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  if (lightboxPrev) lightboxPrev.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    showSlide(currentIndex);
  });
  if (lightboxNext) lightboxNext.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    showSlide(currentIndex);
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  { currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length; showSlide(currentIndex); }
    if (e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % visibleItems.length; showSlide(currentIndex); }
  });

  // Touch swipe
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      currentIndex = dx < 0
        ? (currentIndex + 1) % visibleItems.length
        : (currentIndex - 1 + visibleItems.length) % visibleItems.length;
      showSlide(currentIndex);
    }
  });
}

// ---------- Homepage: work-card lightbox (uses same lightbox but different items) ----------
document.querySelectorAll('.work-card[data-src]').forEach(card => {
  card.addEventListener('click', () => {
    if (!lightbox) return;
    lightboxImg.src = card.dataset.src;
    lightboxImg.alt = card.dataset.alt || '';
    if (lightboxCap) lightboxCap.textContent = card.dataset.alt || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

// ---------- Contact form (Netlify) ----------
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const data = new FormData(form);

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      });
      if (res.ok) {
        form.style.display = 'none';
        if (formSuccess) formSuccess.style.display = 'block';
      } else {
        throw new Error('Network error');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = 'Send Message';
      alert('Something went wrong. Please call or text instead: 602.935.7020');
    }
  });
}

// ============================================================
//  PREMIUM EFFECTS
// ============================================================

// ---------- 1. Global mouse spotlight ----------
// Updates CSS custom properties --mx / --my on <html>
// so the body::before radial gradient follows the cursor.
(function mouseSpotlight() {
  let raf = null;
  let tx = window.innerWidth  / 2;
  let ty = window.innerHeight / 2;
  let cx = tx, cy = ty;

  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  function tick() {
    raf = null;
    // Smooth lerp — feels luxurious, not janky
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    document.documentElement.style.setProperty('--mx', cx + 'px');
    document.documentElement.style.setProperty('--my', cy + 'px');
    // Keep animating while cursor is moving
    if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
      raf = requestAnimationFrame(tick);
    }
  }
})();

// ---------- 2. Card inner glow — follows mouse within each card ----------
(function cardGlow() {
  const cards = document.querySelectorAll(
    '.work-card, .review-card, .contact-card, .rights-card, .resource-card, .gallery-item'
  );
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r   = card.getBoundingClientRect();
      const x   = ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%';
      const y   = ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%';
      card.style.setProperty('--card-mx', x);
      card.style.setProperty('--card-my', y);
    }, { passive: true });
  });
})();

// ---------- 3. Magnetic buttons ----------
// Buttons subtly pull toward the cursor when nearby
(function magneticButtons() {
  const btns = document.querySelectorAll('.btn');
  const STRENGTH = 0.12; // 0 = no pull, 1 = full pull to cursor

  btns.forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r    = btn.getBoundingClientRect();
      const cx   = r.left + r.width  / 2;
      const cy   = r.top  + r.height / 2;
      const MAX  = 6; // never move more than 6px
      const dx   = Math.max(-MAX, Math.min(MAX, (e.clientX - cx) * STRENGTH));
      const dy   = Math.max(-MAX, Math.min(MAX, (e.clientY - cy) * STRENGTH));
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      setTimeout(() => { btn.style.transition = ''; }, 400);
    });
  });
})();

