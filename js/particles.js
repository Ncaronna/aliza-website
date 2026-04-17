/* ============================================
   ALIZA NADINE — Red Particle Background
   Canvas-based, mouse-reactive, performant.
   ============================================ */

(function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 1.2s ease;
  `;
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');

  // Fade in after brief delay so it doesn't flash
  setTimeout(() => { canvas.style.opacity = '1'; }, 300);

  /* ---- Config ---- */
  const CFG = {
    count:       85,     // particle count
    maxDist:     130,    // max distance to draw connecting lines
    mouseRadius: 200,    // radius of mouse influence
    mouseForce:  0.022,  // attraction strength (keep subtle)
    baseSpeed:   0.35,   // particle drift speed
    minR:        1.2,    // min particle radius
    maxR:        2.8,    // max particle radius
  };

  /* ---- Color palette — dark to bright reds ---- */
  const COLORS = [
    [179, 18,  23],   // brand red
    [210, 30,  35],   // mid red
    [140, 10,  14],   // dark red
    [230, 55,  55],   // brighter red
    [255, 90,  80],   // highlight red-orange
    [160, 20,  25],   // deep red
  ];

  /* ---- State ---- */
  let W, H, particles = [];
  let mx = -9999, my = -9999; // mouse position (off-screen default)
  let animId;

  /* ---- Resize ---- */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => {
    resize();
    // Redistribute particles on resize
    particles.forEach(p => {
      if (p.x > W) p.x = Math.random() * W;
      if (p.y > H) p.y = Math.random() * H;
    });
  }, { passive: true });

  /* ---- Mouse tracking ---- */
  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', () => {
    mx = -9999;
    my = -9999;
  });

  /* ---- Particle factory ---- */
  function makeParticle(x, y) {
    const col = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.2 + Math.random() * 0.8) * CFG.baseSpeed;
    return {
      x:    x ?? Math.random() * W,
      y:    y ?? Math.random() * H,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      r:    CFG.minR + Math.random() * (CFG.maxR - CFG.minR),
      col,
      alpha: 0.35 + Math.random() * 0.55,
      // Slight wobble
      wobbleSpeed: 0.004 + Math.random() * 0.006,
      wobbleAmt:   0.04 + Math.random() * 0.08,
      wobbleOff:   Math.random() * Math.PI * 2,
      life: 0,
    };
  }

  /* ---- Init ---- */
  function init() {
    particles = Array.from({ length: CFG.count }, () => makeParticle());
  }
  init();

  /* ---- Draw ---- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    const now = performance.now() * 0.001;

    /* Update + draw particles */
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life += 0.016;

      /* Mouse attraction */
      const dx   = mx - p.x;
      const dy   = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CFG.mouseRadius && dist > 0) {
        const factor = (1 - dist / CFG.mouseRadius) * CFG.mouseForce;
        p.vx += dx / dist * factor;
        p.vy += dy / dist * factor;
      }

      /* Wobble & velocity dampening */
      const wobble = Math.sin(now * p.wobbleSpeed * 60 + p.wobbleOff) * p.wobbleAmt;
      p.vx += wobble * 0.01;
      p.vy -= wobble * 0.008;
      p.vx *= 0.985;  // dampen so they don't fly off
      p.vy *= 0.985;

      /* Cap speed */
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpd = CFG.baseSpeed * 4;
      if (spd > maxSpd) {
        p.vx = (p.vx / spd) * maxSpd;
        p.vy = (p.vy / spd) * maxSpd;
      }

      p.x += p.vx;
      p.y += p.vy;

      /* Wrap edges (with soft fade-in on re-entry) */
      const pad = 50;
      if (p.x < -pad) p.x = W + pad;
      if (p.x > W + pad) p.x = -pad;
      if (p.y < -pad) p.y = H + pad;
      if (p.y > H + pad) p.y = -pad;

      /* Draw particle */
      const [r, g, b] = p.col;
      // Glow layer
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grd.addColorStop(0,   `rgba(${r},${g},${b},${(p.alpha * 0.5).toFixed(2)})`);
      grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha.toFixed(2)})`;
      ctx.fill();

      /* Draw connecting lines to nearby particles */
      for (let j = i + 1; j < particles.length; j++) {
        const q    = particles[j];
        const ldx  = p.x - q.x;
        const ldy  = p.y - q.y;
        const ldist = Math.sqrt(ldx * ldx + ldy * ldy);

        if (ldist < CFG.maxDist) {
          // Stronger line when closer to mouse
          const mousePull = (dist < CFG.mouseRadius)
            ? (1 - dist / CFG.mouseRadius) * 0.5
            : 0;
          const lineAlpha = ((1 - ldist / CFG.maxDist) * 0.18 + mousePull * 0.12).toFixed(3);

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  draw();

  /* ---- Pause when tab hidden (saves CPU) ---- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(draw);
    }
  });

})();
