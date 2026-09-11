/**
 * High-Performance Background Theme Engine for 1024 Game
 * Optimized for 60 FPS mobile devices:
 * - DPR clamped between 1.0 and 1.5
 * - Auto-pauses on document visibilitychange
 * - Particle count automatically scaled based on screen size/mobile
 * - Hardware accelerated Canvas 2D
 */
(function(window) {
  'use strict';

  const ThemeEngine = {
    canvas: null,
    ctx: null,
    currentTheme: 'stargazer', // 'stargazer' | 'aqua' | 'arctic'
    animId: null,
    width: 0,
    height: 0,
    dpr: 1,
    isMobile: false,
    particles: [],
    creatures: [],
    meteors: [],
    lastTime: 0,
    running: false,

    init: function(canvasId) {
      this.canvas = document.getElementById(canvasId || 'bg-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || window.innerWidth < 768;

      this.resize();
      window.addEventListener('resize', () => {
        this.resize();
        this.initThemeEntities();
      }, { passive: true });

      // Tab visibility management to prevent battery drain
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.start();
        }
      });

      // Retrieve saved theme or default to stargazer
      const saved = localStorage.getItem('g1024_active_theme') || 'stargazer';
      this.switchTheme(saved);
    },

    resize: function() {
      if (!this.canvas) return;
      const rawDpr = window.devicePixelRatio || 1;
      // Clamp DPR to max 1.5 on mobile, 1.8 on desktop to save GPU fill-rate
      this.dpr = this.isMobile ? Math.min(rawDpr, 1.35) : Math.min(rawDpr, 1.8);
      
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    switchTheme: function(themeName) {
      if (!['stargazer', 'aqua', 'arctic'].includes(themeName)) {
        themeName = 'stargazer';
      }
      this.currentTheme = themeName;
      localStorage.setItem('g1024_active_theme', themeName);
      document.body.setAttribute('data-animated-theme', themeName);

      // Update UI active buttons if present
      document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
      });

      this.initThemeEntities();
      if (!this.running) {
        this.start();
      }
    },

    initThemeEntities: function() {
      this.particles = [];
      this.creatures = [];
      this.meteors = [];

      const w = this.width;
      const h = this.height;
      const scaleFactor = this.isMobile ? 0.48 : 1.0;

      if (this.currentTheme === 'stargazer') {
        // 3D parallax star layers
        const starCount = Math.floor(80 * scaleFactor);
        for (let i = 0; i < starCount; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: Math.random() * 1.5 + 0.4,
            speed: Math.random() * 0.35 + 0.08,
            layer: Math.random() < 0.65 ? 1 : 2, // Layer 1 (background), Layer 2 (foreground)
            alpha: Math.random() * 0.7 + 0.3,
            pulseSpeed: Math.random() * 0.02 + 0.008,
            hue: Math.random() < 0.3 ? 280 : (Math.random() < 0.5 ? 195 : 0)
          });
        }
      } else if (this.currentTheme === 'aqua') {
        // Micro-bubbles rising
        const bubbleCount = Math.floor(45 * scaleFactor);
        for (let i = 0; i < bubbleCount; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: Math.random() * 3.5 + 1.2,
            speedY: Math.random() * 0.9 + 0.35,
            wobbleSpeed: Math.random() * 0.04 + 0.015,
            wobbleDist: Math.random() * 1.8 + 0.5,
            angle: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.5 + 0.2
          });
        }

        // Realistic swimming fish/creatures (6 to 8 smooth sine-wave swim paths)
        const creatureCount = this.isMobile ? 5 : 7;
        for (let i = 0; i < creatureCount; i++) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.creatures.push({
            x: Math.random() * w,
            y: Math.random() * (h * 0.85) + h * 0.08,
            length: Math.random() * 14 + 18,
            speed: (Math.random() * 0.7 + 0.6) * dir,
            dir: dir,
            freq: Math.random() * 0.035 + 0.025,
            amp: Math.random() * 14 + 6,
            tailAngle: 0,
            color: Math.random() < 0.45 ? 'rgba(56, 189, 248, 0.55)' : (Math.random() < 0.5 ? 'rgba(251, 146, 60, 0.6)' : 'rgba(45, 212, 191, 0.5)'),
            scale: Math.random() * 0.35 + 0.75
          });
        }
      } else if (this.currentTheme === 'arctic') {
        // Multi-layer realistic snowfall with horizontal wind drift
        const snowCount = Math.floor(75 * scaleFactor);
        for (let i = 0; i < snowCount; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: Math.random() * 2.8 + 1.0,
            speedY: Math.random() * 1.1 + 0.4,
            speedX: Math.random() * 0.4 + 0.1,
            swayFreq: Math.random() * 0.02 + 0.01,
            swayAmp: Math.random() * 1.5 + 0.8,
            angle: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.65 + 0.35
          });
        }
      }
    },

    start: function() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      const loop = (timestamp) => {
        if (!this.running) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.render(dt, timestamp);
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    },

    stop: function() {
      this.running = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    },

    render: function(dt, time) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      if (this.currentTheme === 'stargazer') {
        this.renderStargazer(ctx, w, h, dt, time);
      } else if (this.currentTheme === 'aqua') {
        this.renderAqua(ctx, w, h, dt, time);
      } else if (this.currentTheme === 'arctic') {
        this.renderArctic(ctx, w, h, dt, time);
      }
    },

    /* ---- STARGAZER RENDERING ---- */
    renderStargazer: function(ctx, w, h, dt, time) {
      const grad = ctx.createRadialGradient(w * 0.3, h * 0.25, 20, w * 0.3, h * 0.25, Math.max(w, h) * 0.7);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0.07)');
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)');
      grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < this.particles.length; i++) {
        const s = this.particles[i];
        s.y += s.speed * s.layer * 60 * dt;
        if (s.y > h + 5) {
          s.y = -5;
          s.x = Math.random() * w;
        }

        const twinkle = Math.sin(time * s.pulseSpeed) * 0.3 + 0.7;
        const a = s.alpha * twinkle;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * (s.layer === 2 ? 1.25 : 1.0), 0, Math.PI * 2);
        if (s.hue > 0) {
          ctx.fillStyle = "hsla(" + s.hue + ", 90%, 80%, " + a + ")";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, " + a + ")";
        }
        ctx.fill();
      }

      if (Math.random() < (this.isMobile ? 0.004 : 0.008) && this.meteors.length < 2) {
        this.meteors.push({
          x: Math.random() * (w * 0.8),
          y: Math.random() * (h * 0.35),
          vx: Math.random() * 300 + 420,
          vy: Math.random() * 180 + 260,
          len: Math.random() * 60 + 50,
          life: 1.0,
          decay: Math.random() * 1.2 + 1.2
        });
      }

      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= m.decay * dt;

        if (m.life <= 0) {
          this.meteors.splice(i, 1);
          continue;
        }

        const tailX = m.x - (m.vx * (m.len / 500));
        const tailY = m.y - (m.vy * (m.len / 500));

        const mGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        mGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        mGrad.addColorStop(0.7, "rgba(56, 189, 248, " + (m.life * 0.6) + ")");
        mGrad.addColorStop(1, "rgba(255, 255, 255, " + (m.life * 0.95) + ")");

        ctx.strokeStyle = mGrad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }
    },

    /* ---- AQUA DRIFT RENDERING ---- */
    renderAqua: function(ctx, w, h, dt, time) {
      const causticsA = Math.sin(time * 0.001) * 0.5 + 0.5;
      const cGrad = ctx.createRadialGradient(w * 0.5, h * 0.1, 10, w * 0.5, h * 0.1, Math.max(w, h) * 0.85);
      cGrad.addColorStop(0, "rgba(14, 165, 233, " + (0.12 + causticsA * 0.05) + ")");
      cGrad.addColorStop(0.6, 'rgba(3, 105, 161, 0.06)');
      cGrad.addColorStop(1, 'rgba(3, 15, 38, 0)');
      ctx.fillStyle = cGrad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < this.creatures.length; i++) {
        const c = this.creatures[i];
        c.x += c.speed * 60 * dt;
        c.tailAngle += (c.speed > 0 ? 0.18 : -0.18);

        if (c.dir > 0 && c.x > w + 60) {
          c.x = -60;
          c.y = Math.random() * (h * 0.85) + h * 0.08;
        } else if (c.dir < 0 && c.x < -60) {
          c.x = w + 60;
          c.y = Math.random() * (h * 0.85) + h * 0.08;
        }

        const waveY = c.y + Math.sin(time * 0.002 * c.freq * 100 + i) * c.amp;

        ctx.save();
        ctx.translate(c.x, waveY);
        ctx.scale(c.scale * c.dir, c.scale);

        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(-c.length * 0.6, 0);
        ctx.quadraticCurveTo(-c.length * 0.2, -c.length * 0.28, c.length * 0.5, 0);
        ctx.quadraticCurveTo(-c.length * 0.2, c.length * 0.28, -c.length * 0.6, 0);
        ctx.fill();

        const tailWiggle = Math.sin(c.tailAngle) * 6;
        ctx.beginPath();
        ctx.moveTo(-c.length * 0.55, 0);
        ctx.lineTo(-c.length * 0.95, -c.length * 0.28 + tailWiggle);
        ctx.lineTo(-c.length * 0.82, 0);
        ctx.lineTo(-c.length * 0.95, c.length * 0.28 + tailWiggle);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      for (let i = 0; i < this.particles.length; i++) {
        const b = this.particles[i];
        b.y -= b.speedY * 60 * dt;
        b.angle += b.wobbleSpeed;
        const wobbleX = b.x + Math.sin(b.angle) * b.wobbleDist;

        if (b.y < -10) {
          b.y = h + 10;
          b.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(wobbleX, b.y, b.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(186, 230, 253, " + b.alpha + ")";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(wobbleX - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (b.alpha * 0.8) + ")";
        ctx.fill();
      }
    },

    /* ---- ARCTIC DRIFT RENDERING ---- */
    renderArctic: function(ctx, w, h, dt, time) {
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.8, 10, w * 0.5, h * 0.8, Math.max(w, h) * 0.7);
      glow.addColorStop(0, 'rgba(125, 211, 252, 0.08)');
      glow.addColorStop(0.7, 'rgba(56, 189, 248, 0.03)');
      glow.addColorStop(1, 'rgba(8, 14, 28, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < this.particles.length; i++) {
        const s = this.particles[i];
        s.y += s.speedY * 60 * dt;
        s.angle += s.swayFreq;
        const currentX = s.x + Math.sin(s.angle) * s.swayAmp + (s.speedX * 60 * dt);

        s.x = currentX;
        if (s.y > h + 10) {
          s.y = -10;
          s.x = Math.random() * w;
        }
        if (s.x > w + 10) s.x = -10;

        ctx.beginPath();
        ctx.arc(currentX, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240, 249, 255, " + s.alpha + ")";
        ctx.fill();
      }
    }
  };

  window.ThemeEngine = ThemeEngine;
})(window);
