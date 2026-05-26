/* ============================================
   ALIZA NADINE — Ambient Particle Background
   Lightweight: 15 slow dots, no lines, no mouse
   interaction. Pure ambient atmosphere only.
   ============================================ */

(function initParticles() {
  // Skip entirely on mobile/tablet
  if (window.matchMedia('(max-width: 900px)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity 1.5s ease;';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  setTimeout(() => { canvas.style.opacity = '1'; }, 600);

  const COLORS = [
    [179, 18,  23],
    [210, 30,  35],
    [140, 10,  14],
  ];

  let W, H, particles = [];
  let animId, lastFrame = 0;
  const FPS_INTERVAL = 1000 / 20; // 20fps — imperceptible for slow ambient dots

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function makeParticle() {
    const col   = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.08 + Math.random() * 0.18; // very slow drift
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r:  1.0 + Math.random() * 1.4,
      col,
      alpha: 0.25 + Math.random() * 0.35,
    };
  }

  particles = Array.from({ length: 15 }, makeParticle);

  function draw(ts) {
    animId = requestAnimationFrame(draw);
    if (ts - lastFrame < FPS_INTERVAL) return;
    lastFrame = ts;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      const [r, g, b] = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.fill();
    }
  }

  animId = requestAnimationFrame(draw);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animId = requestAnimationFrame(draw);
  });
})();
