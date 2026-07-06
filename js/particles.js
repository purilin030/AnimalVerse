/* ============================================================
   Full-page Starry Sky Background
   Canvas-based twinkling starfield with subtle drift.
   ============================================================ */
(function() {
  'use strict';

  var canvas = document.getElementById('bg-particles');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var stars = [];
  var animId = null;

  // ── Resize ──────────────────────────────────────────────
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Create stars ────────────────────────────────────────
  var COUNT = 250;

  function createStar() {
    var type = Math.random();
    var size, glow, twinkleAmp;

    if (type < 0.65) {
      // Small dim star
      size = Math.random() * 1.2 + 0.4;
      glow = false;
      twinkleAmp = Math.random() * 0.3 + 0.15;
    } else if (type < 0.9) {
      // Medium star
      size = Math.random() * 1.0 + 1.5;
      glow = false;
      twinkleAmp = Math.random() * 0.35 + 0.2;
    } else {
      // Bright star with glow
      size = Math.random() * 1.5 + 2.5;
      glow = true;
      twinkleAmp = Math.random() * 0.2 + 0.3;
    }

    // Slight clustering toward a diagonal band (milky-way feel)
    var band = Math.random() < 0.4;
    var x, y;
    if (band) {
      // Cluster along a diagonal band
      var t = Math.random();
      x = t * canvas.width * 0.8 + (1 - t) * canvas.height * 0.3;
      y = t * canvas.height * 0.5 + (1 - t) * canvas.width * 0.2;
      // Add scatter
      x += (Math.random() - 0.5) * canvas.width * 0.15;
      y += (Math.random() - 0.5) * canvas.height * 0.15;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    }

    // Color temperature: mostly cool white, some warm
    var temp = Math.random();
    var color;
    if (temp < 0.6) {
      color = [255, 255, 255];       // pure white
    } else if (temp < 0.8) {
      color = [200, 220, 255];       // blue-white
    } else {
      color = [255, 240, 200];       // warm-white
    }

    return {
      x: x,
      y: y,
      size: size,
      baseOpacity: Math.random() * 0.5 + 0.35,
      twinkleFreq: Math.random() * 0.03 + 0.005,
      twinkleAmp: twinkleAmp,
      phase: Math.random() * Math.PI * 2,
      glow: glow,
      color: color,
      // Very slow drift
      driftX: (Math.random() - 0.5) * 0.08,
      driftY: -Math.random() * 0.05 - 0.01
    };
  }

  for (var i = 0; i < COUNT; i++) {
    stars.push(createStar());
  }

  // ── Theme detection ────────────────────────────────────
  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // ── Animation ───────────────────────────────────────────
  function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var dark = isDark();

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];

      // Twinkle
      var twinkle = Math.sin(time * s.twinkleFreq + s.phase) * s.twinkleAmp;
      var alpha = Math.max(0, Math.min(1, s.baseOpacity + twinkle));

      // Slow drift
      s.x += s.driftX;
      s.y += s.driftY;

      // Wrap around
      if (s.x < -10) s.x = canvas.width + 10;
      if (s.x > canvas.width + 10) s.x = -10;
      if (s.y < -10) s.y = canvas.height + 10;
      if (s.y > canvas.height + 10) s.y = -10;

      // Star color based on theme
      var r, g, b;
      if (dark) {
        r = s.color[0];
        g = s.color[1];
        b = s.color[2];
      } else {
        // Light mode: softer, more subtle — tint toward sage
        r = Math.round(s.color[0] * 0.4 + 107 * 0.6);
        g = Math.round(s.color[1] * 0.4 + 178 * 0.6);
        b = Math.round(s.color[2] * 0.4 + 63 * 0.6);
      }

      // Glow for bright stars
      if (s.glow && dark && alpha > 0.2) {
        var glowRadius = s.size * 5;
        var grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowRadius);
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.25) + ')');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw star
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.fill();

      // Extra bright core for larger stars
      if (s.size > 2 && alpha > 0.3) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.5) + ')';
        ctx.fill();
      }
    }

    animId = requestAnimationFrame(animate);
  }

  animate(0);

  // ── Watch theme changes ────────────────────────────────
  var observer = new MutationObserver(function() {
    // Colors update automatically on next frame
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

})();
