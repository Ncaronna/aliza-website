/* ============================================
   ALIZA NADINE — Optimized Particle Background
   - 50 particles (was 85)
   - No per-particle radial gradients (was most expensive op)
   - Throttled to 30fps (imperceptible for particles)
   - Spatial skip for line drawing
   - Pauses when tab hidden
   ============================================ */

(function initParticles() {
  // Skip on low-end / mobile devices to protect performance
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.cssText = `
    position:fixed;inset:0;z-index:0;pointer-events:none;
    opacity:0;transition:opacity 1.2s ease;
  `;
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });

  setTimeout(() => { canvas.style.opacity = '1'; }, 400);

  const CFG = {
    count:       isMobile ? 30 : 50,
    maxDist:     110,
    mouseRadius: 180,
    mouseForce:  0.018,
    baseSpeed:   0.3,
    minR:        1.0,
    maxR:        2.2,
    fps:         30,          // cap at 30fps — invisible difference for particles
  };

  const COLORS = [
    [179, 18,  23],
    [210, 30,  35],
    [140, 10,  14],
    [230, 55,  55],
    [160, 20,  25],
  ];

  let W, H, particles = [];
  let mx = -9999, my = -9999;
  let animId, lastFrame = 0;
  const frameInterval = 1000 / CFG.fps;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });

  function makeParticle() {
    const col   = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.2 + Math.random() * 0.8) * CFG.baseSpeed;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r:  CFG.minR + Math.random() * (CFG.maxR - CFG.minR),
      col,
      alpha: 0.4 + Math.random() * 0.5,
      wobbleOff: Math.random() * Math.PI * 2,
    };
  }

  particles = Array.from({ length: CFG.count }, makeParticle);

  function draw(ts) {
    animId = requestAnimationFrame(draw);
    if (ts - lastFrame < frameInterval) return;  // throttle to 30fps
    lastFrame = ts;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse attraction
      const dx = mx - p.x, dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.mouseRadius && dist > 0) {
        const f = (1 - dist / CFG.mouseRadius) * CFG.mouseForce;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }

      // Dampen + move
      p.vx *= 0.988;
      p.vy *= 0.988;

      // Cap speed
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > CFG.baseSpeed * 3.5) {
        p.vx = (p.vx / spd) * CFG.baseSpeed * 3.5;
        p.vy = (p.vy / spd) * CFG.baseSpeed * 3.5;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < -40) p.x = W + 40;
      if (p.x > W + 40) p.x = -40;
      if (p.y < -40) p.y = H + 40;
      if (p.y > H + 40) p.y = -40;

      // Draw dot (no expensive radial gradient — just a solid circle)
      const [r, g, b] = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.fill();

      // Lines to nearby particles (only check forward to avoid double-drawing)
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const ldx = p.x - q.x, ldy = p.y - q.y;
        // Skip sqrt for cheap early-exit check
        const distSq = ldx * ldx + ldy * ldy;
        if (distSq > CFG.maxDist * CFG.maxDist) continue;
        const ldist = Math.sqrt(distSq);
        const a = ((1 - ldist / CFG.maxDist) * 0.15).toFixed(3);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }

  animId = requestAnimationFrame(draw);

  // Free up CPU when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animId = requestAnimationFrame(draw);
  });
})();
