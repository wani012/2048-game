/**
 * Interactive, Photorealistic & Dynamic 3-Theme Engine for 1024 Game
 * Desktop & Mobile Responsive with 60 FPS RequestAnimationFrame Loop
 * 
 * 1. "Star Gazer" (Space):
 *    - Full-screen moving deep cosmic background
 *    - Twinkling stars, drifting cosmic dust across Z-depth, faint shooting stars
 *    - Gyroscope tilt & desktop cursor parallax response
 * 
 * 2. "Aqua Drift" (Underwater):
 *    - High-definition underwater coral reef backdrop
 *    - Sweeping volumetric sunbeam god rays and dancing caustics
 *    - Sea turtle, blue tangs, clownfish, rays swimming gracefully across viewport
 *    - Rising micro-bubbles with dual highlights
 * 
 * 3. "Arctic Drift" (Cinematic Snowfall):
 *    - Multi-layered blizzard / snowfall with depth (large slow foreground flakes, tiny fast background flakes)
 *    - Cool icy blue/white color grading with subtle frosty mist hovering at bottom edges
 */
(function(window) {
  'use strict';

  const ThemeEngine = {
    canvas: null,
    ctx: null,
    currentTheme: 'aqua', // 'stargazer' | 'aqua' | 'arctic'
    animId: null,
    width: 0,
    height: 0,
    dpr: 1,
    isMobile: false,
    particles: [],
    creatures: [],
    meteors: [],
    mistParticles: [],
    shockwaves: [],
    lastTime: 0,
    running: false,
    errorCount: 0,

    // Interactive Parallax offsets
    parallaxX: 0,
    parallaxY: 0,
    targetParallaxX: 0,
    targetParallaxY: 0,

    // Trigger dynamic shockwave/fluid ripple (called on merge or touch)
    spawnShockwave: function(x, y, power) {
      if (this.shockwaves.length > 8) this.shockwaves.shift();
      const col = this.currentTheme === 'aqua' ? '#00f0ff' : (this.currentTheme === 'stargazer' ? '#c084fc' : '#38bdf8');
      this.shockwaves.push({
        x: x || (this.width / 2),
        y: y || (this.height / 2),
        radius: 8,
        maxRadius: power ? Math.min(this.width, this.height) * 0.42 : Math.min(this.width, this.height) * 0.26,
        life: 1.0,
        decay: power ? 1.4 : 1.8,
        color: col
      });
    },

    init: function(canvasId) {
      try {
        this.canvas = document.getElementById(canvasId || 'bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        if (!this.ctx) return;

        this.isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || window.innerWidth < 768;

        this.resize();
        window.addEventListener('resize', () => {
          try {
            this.resize();
            this.initThemeEntities();
          } catch(e) {
            this.handleError(e);
          }
        }, { passive: true });

        // Desktop mouse parallax & click fluid wave interaction
        window.addEventListener('mousemove', (e) => {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          this.targetParallaxX = (e.clientX - cx) / cx * 18;
          this.targetParallaxY = (e.clientY - cy) / cy * 18;
        }, { passive: true });

        window.addEventListener('pointerdown', (e) => {
          this.spawnShockwave(e.clientX, e.clientY, false);
        }, { passive: true });

        // Mobile gyroscope tilt parallax interaction
        if (window.DeviceOrientationEvent) {
          window.addEventListener('deviceorientation', (e) => {
            if (e.gamma !== null && e.beta !== null) {
              this.targetParallaxX = Math.max(-25, Math.min(25, e.gamma)) * 0.8;
              this.targetParallaxY = Math.max(-25, Math.min(25, (e.beta - 45))) * 0.8;
            }
          }, { passive: true });
        }

        // Auto-pause loop on tab switch (zero background battery drain)
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stop();
          } else {
            this.start();
          }
        });

        // Load saved theme or default to aqua
        const saved = localStorage.getItem('g1024_active_theme') || 'aqua';
        this.switchTheme(saved);
      } catch (err) {
        this.handleError(err);
      }
    },

    handleError: function(err) {
      this.errorCount++;
      console.error('[ThemeEngine Error Caught]:', err);
      if (this.errorCount < 4) {
        setTimeout(() => {
          try {
            this.initThemeEntities();
            if (!this.running) this.start();
          } catch(e) {}
        }, 500);
      }
    },

    resize: function() {
      if (!this.canvas) return;
      const rawDpr = window.devicePixelRatio || 1;
      this.dpr = this.isMobile ? Math.min(rawDpr, 1.4) : Math.min(rawDpr, 1.85);
      
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    switchTheme: function(themeName) {
      if (!['stargazer', 'aqua', 'arctic'].includes(themeName)) {
        themeName = 'aqua';
      }
      this.currentTheme = themeName;
      try {
        localStorage.setItem('g1024_active_theme', themeName);
      } catch(e){}
      document.body.setAttribute('data-animated-theme', themeName);

      // Smooth 0.8s cross-fade layer management
      const layerStargazer = document.getElementById('bgStargazer');
      const layerAqua = document.getElementById('bgAqua');
      const layerArctic = document.getElementById('bgArctic');

      if (layerStargazer) layerStargazer.classList.toggle('active', themeName === 'stargazer');
      if (layerAqua) layerAqua.classList.toggle('active', themeName === 'aqua');
      if (layerArctic) layerArctic.classList.toggle('active', themeName === 'arctic');

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
      this.mistParticles = [];

      const w = this.width || window.innerWidth;
      const h = this.height || window.innerHeight;
      const scaleFactor = this.isMobile ? 0.55 : 1.0;

      if (this.currentTheme === 'stargazer') {
        // Deep space cosmic dust & multi-tier 3D stars
        const starCount = Math.floor(110 * scaleFactor);
        for (let i = 0; i < starCount; i++) {
          const depth = Math.random(); // 0 (far Z) to 1 (near Z)
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: depth * 1.9 + 0.4,
            speed: depth * 0.4 + 0.05,
            depth: depth,
            alpha: depth * 0.6 + 0.3,
            twinkleFreq: Math.random() * 0.035 + 0.015,
            twinkleOffset: Math.random() * Math.PI * 2,
            color: depth > 0.8 ? '#ffffff' : (depth > 0.5 ? '#e0f2fe' : (Math.random() < 0.35 ? '#c084fc' : '#38bdf8'))
          });
        }
      } else if (this.currentTheme === 'aqua') {
        // Shimmering micro and macro rising bubbles
        const bubbleCount = Math.floor(48 * scaleFactor);
        for (let i = 0; i < bubbleCount; i++) {
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: Math.random() * 4.2 + 1.2,
            speedY: Math.random() * 0.85 + 0.4,
            wobbleSpeed: Math.random() * 0.035 + 0.015,
            wobbleDist: Math.random() * 2.2 + 0.6,
            angle: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.55 + 0.25
          });
        }

        // Prominent live marine life: Sea Turtles, Blue Tangs, Clownfish, Manta Rays (Large & Active)
        const creatureCount = this.isMobile ? 10 : 16;
        const speciesList = [
          { type: 'turtle', name: 'Sea Turtle', speedMult: 0.55, length: 95, scale: 1.25, alpha: 0.95 },
          { type: 'turtle', name: 'Baby Sea Turtle', speedMult: 0.65, length: 65, scale: 1.0, alpha: 0.92 },
          { type: 'tang', name: 'Blue Tang (Dory)', speedMult: 1.1, length: 50, scale: 1.1, body: '#1d4ed8', fin: '#facc15', belly: '#60a5fa', alpha: 0.95 },
          { type: 'clown', name: 'Clownfish (Nemo)', speedMult: 0.95, length: 44, scale: 1.15, body: '#ea580c', fin: '#ffffff', belly: '#fb923c', alpha: 0.95 },
          { type: 'angel', name: 'Moorish Idol', speedMult: 1.05, length: 55, scale: 1.15, body: '#0f172a', fin: '#facc15', belly: '#f8fafc', alpha: 0.95 },
          { type: 'ray', name: 'Manta Ray', speedMult: 0.62, length: 110, scale: 1.1, alpha: 0.88 },
          { type: 'emerald', name: 'Parrotfish', speedMult: 1.0, length: 52, scale: 1.1, body: '#059669', fin: '#34d399', belly: '#a7f3d0', alpha: 0.92 },
          { type: 'violet', name: 'Orchid Dottyback', speedMult: 1.15, length: 42, scale: 1.05, body: '#7c3aed', fin: '#c084fc', belly: '#ede9fe', alpha: 0.92 }
        ];

        for (let i = 0; i < creatureCount; i++) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const spec = speciesList[i % speciesList.length];
          this.creatures.push({
            x: Math.random() * w,
            y: Math.random() * (h * 0.82) + h * 0.08,
            length: spec.length * (Math.random() * 0.25 + 0.9),
            speed: (Math.random() * 0.55 + 0.65) * spec.speedMult * dir,
            dir: dir,
            freq: Math.random() * 0.035 + 0.02,
            amp: Math.random() * 16 + 8,
            tailAngle: Math.random() * Math.PI * 2,
            flipperAngle: 0,
            species: spec,
            scale: spec.scale * (Math.random() * 0.25 + 0.9),
            depth: Math.random() * 0.5 + 0.5
          });
        }
      } else if (this.currentTheme === 'arctic') {
        // Multi-layered blizzard snowfall with depth (large slow foreground flakes, tiny fast background flakes)
        const snowCount = Math.floor(95 * scaleFactor);
        for (let i = 0; i < snowCount; i++) {
          const isForeground = Math.random() < 0.25;
          const depth = isForeground ? (Math.random() * 0.3 + 0.7) : (Math.random() * 0.6 + 0.1);
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: isForeground ? (depth * 3.8 + 2.0) : (depth * 2.2 + 0.8),
            speedY: isForeground ? (depth * 0.75 + 0.4) : (depth * 1.35 + 0.65), // Foreground flakes fall slow & float, background tiny fast
            speedX: depth * 0.45 + 0.15,
            swayFreq: Math.random() * 0.025 + 0.012,
            swayAmp: isForeground ? 2.5 : 1.2,
            angle: Math.random() * Math.PI * 2,
            alpha: isForeground ? 0.85 : (depth * 0.55 + 0.25),
            isCrystal: isForeground
          });
        }

        // Frosty mist hovering at bottom edges
        const mistCount = 6;
        for (let m = 0; m < mistCount; m++) {
          this.mistParticles.push({
            x: (w / (mistCount - 1)) * m,
            y: h - Math.random() * 60,
            radius: Math.random() * 120 + 160,
            alpha: Math.random() * 0.08 + 0.04,
            speed: (Math.random() * 0.2 + 0.1) * (m % 2 === 0 ? 1 : -1)
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

        // Smooth parallax interpolation
        this.parallaxX += (this.targetParallaxX - this.parallaxX) * 0.06;
        this.parallaxY += (this.targetParallaxY - this.parallaxY) * 0.06;

        try {
          this.render(dt, timestamp);
        } catch(err) {
          this.handleError(err);
        }
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

      this.renderShockwaves(ctx, dt);
    },

    /* ---- DYNAMIC SHOCKWAVES & FLUID RIPPLES ---- */
    renderShockwaves: function(ctx, dt) {
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * (sw.decay * 3.8 * dt);
        sw.life -= sw.decay * dt;

        if (sw.life <= 0 || sw.radius >= sw.maxRadius * 0.98) {
          this.shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5 * sw.life;
        ctx.globalAlpha = sw.life * 0.45;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12 * sw.life;
        ctx.stroke();

        // Secondary subtle inner ring
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, Math.max(1, sw.radius * 0.72), 0, Math.PI * 2);
        ctx.lineWidth = 1.2 * sw.life;
        ctx.globalAlpha = sw.life * 0.25;
        ctx.stroke();
        ctx.restore();
      }
    },

    /* ==========================================================================
       1. STAR GAZER RENDERING (Moving Deep Space & Parallax)
       ========================================================================== */
    renderStargazer: function(ctx, w, h, dt, time) {
      const px = this.parallaxX;
      const py = this.parallaxY;

      // Deep Nebula Clouds with Parallax
      const tSec = time * 0.0003;
      const nebX = w * 0.35 + Math.sin(tSec) * 60 + px * 0.5;
      const nebY = h * 0.28 + Math.cos(tSec * 0.8) * 50 + py * 0.5;

      const nebulaGrad = ctx.createRadialGradient(nebX, nebY, 10, nebX, nebY, Math.max(w, h) * 0.7);
      nebulaGrad.addColorStop(0, 'rgba(168, 85, 247, 0.12)');
      nebulaGrad.addColorStop(0.45, 'rgba(99, 102, 241, 0.07)');
      nebulaGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.03)');
      nebulaGrad.addColorStop(1, 'rgba(2, 7, 18, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars drifting along depth with parallax response
      for (let i = 0; i < this.particles.length; i++) {
        const s = this.particles[i];
        s.y += s.speed * 60 * dt;
        if (s.y > h + 5) {
          s.y = -5;
          s.x = Math.random() * w;
        }

        const twinkle = Math.sin(time * s.twinkleFreq + s.twinkleOffset) * 0.3 + 0.7;
        const alpha = s.alpha * twinkle;

        const starX = s.x + px * s.depth * 1.5;
        const starY = s.y + py * s.depth * 1.5;

        ctx.beginPath();
        ctx.arc(starX, starY, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        if (s.depth > 0.75) {
          ctx.beginPath();
          ctx.arc(starX, starY, s.radius * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(192, 132, 252, 0.2)';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      // Faint Shooting Stars (Meteors) passing occasionally
      if (Math.random() < (this.isMobile ? 0.005 : 0.009) && this.meteors.length < 2) {
        this.meteors.push({
          x: Math.random() * (w * 0.85),
          y: Math.random() * (h * 0.35),
          vx: Math.random() * 340 + 460,
          vy: Math.random() * 200 + 260,
          len: Math.random() * 70 + 60,
          life: 1.0,
          decay: Math.random() * 1.2 + 1.1
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

        const tailX = m.x - (m.vx * (m.len / 520));
        const tailY = m.y - (m.vy * (m.len / 520));

        const mGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        mGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        mGrad.addColorStop(0.6, "rgba(192, 132, 252, " + (m.life * 0.6) + ")");
        mGrad.addColorStop(1, "rgba(255, 255, 255, " + (m.life * 0.98) + ")");

        ctx.strokeStyle = mGrad;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(m.x, m.y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + m.life + ")";
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },

    /* ==========================================================================
       2. AQUA DRIFT RENDERING (Underwater Sunlight Rays, Marine Life & Bubbles)
       ========================================================================== */
    renderAqua: function(ctx, w, h, dt, time) {
      // 1. Volumetric God Rays Sweeping Down
      ctx.save();
      const beamCount = this.isMobile ? 4 : 7;
      for (let b = 0; b < beamCount; b++) {
        const rayAngle = -0.15 + (b / beamCount) * 0.35 + Math.sin(time * 0.0006 + b * 1.2) * 0.04;
        const originX = w * 0.5 + (b - beamCount / 2) * (w * 0.16);
        const rayWidth = (w * 0.08) + Math.sin(time * 0.001 + b) * (w * 0.03);
        const rayAlpha = 0.08 + Math.sin(time * 0.0012 + b * 1.5) * 0.04;

        const rayGrad = ctx.createLinearGradient(originX, 0, originX + Math.tan(rayAngle) * h, h);
        rayGrad.addColorStop(0, "rgba(255, 255, 255, " + (rayAlpha * 1.6) + ")");
        rayGrad.addColorStop(0.35, "rgba(186, 230, 253, " + rayAlpha + ")");
        rayGrad.addColorStop(0.75, "rgba(56, 189, 248, " + (rayAlpha * 0.4) + ")");
        rayGrad.addColorStop(1, 'rgba(2, 11, 23, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(originX - rayWidth * 0.2, 0);
        ctx.lineTo(originX + rayWidth * 0.2, 0);
        ctx.lineTo(originX + Math.tan(rayAngle) * h + rayWidth * 1.4, h);
        ctx.lineTo(originX + Math.tan(rayAngle) * h - rayWidth * 1.4, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 2. Animated Caustics Refraction Web
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const causticIntensity = 0.06 + Math.sin(time * 0.0018) * 0.025;
      const cGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      cGrad.addColorStop(0, "rgba(0, 240, 255, " + causticIntensity + ")");
      cGrad.addColorStop(0.5, "rgba(14, 165, 233, " + (causticIntensity * 0.5) + ")");
      cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 3. Swimming Marine Life (Sea Turtle, Tangs, Clownfish, Rays outside grid)
      for (let i = 0; i < this.creatures.length; i++) {
        const c = this.creatures[i];
        c.x += c.speed * 60 * dt;
        c.tailAngle += (c.speed > 0 ? 0.22 : -0.22);

        const bound = c.length * 1.5;
        if (c.dir > 0 && c.x > w + bound) {
          c.x = -bound;
          c.y = Math.random() * (h * 0.80) + h * 0.08;
        } else if (c.dir < 0 && c.x < -bound) {
          c.x = w + bound;
          c.y = Math.random() * (h * 0.80) + h * 0.08;
        }

        const waveY = c.y + Math.sin(time * 0.0025 * c.freq * 100 + i) * c.amp;

        ctx.save();
        ctx.translate(c.x, waveY);
        ctx.scale(c.scale * c.dir, c.scale);
        ctx.globalAlpha = c.species.alpha;

        const sp = c.species.type;

        if (sp === 'turtle') {
          c.flipperAngle = Math.sin(time * 0.0035 + i) * 0.45;

          ctx.fillStyle = '#1e3a1e';
          ctx.beginPath();
          ctx.ellipse(-c.length * 0.38, -c.length * 0.22, c.length * 0.18, c.length * 0.09, 0.4, 0, Math.PI * 2);
          ctx.ellipse(-c.length * 0.38, c.length * 0.22, c.length * 0.18, c.length * 0.09, -0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.translate(c.length * 0.12, -c.length * 0.18);
          ctx.rotate(c.flipperAngle);
          ctx.fillStyle = '#2d5a27';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(c.length * 0.25, -c.length * 0.48, c.length * 0.42, -c.length * 0.38);
          ctx.quadraticCurveTo(c.length * 0.28, -c.length * 0.1, 0, 0);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.translate(c.length * 0.12, c.length * 0.18);
          ctx.rotate(-c.flipperAngle);
          ctx.fillStyle = '#2d5a27';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(c.length * 0.25, c.length * 0.48, c.length * 0.42, c.length * 0.38);
          ctx.quadraticCurveTo(c.length * 0.28, c.length * 0.1, 0, 0);
          ctx.fill();
          ctx.restore();

          const shellGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, c.length * 0.45);
          shellGrad.addColorStop(0, '#854d0e');
          shellGrad.addColorStop(0.65, '#452b14');
          shellGrad.addColorStop(1, '#1c1917');
          ctx.fillStyle = shellGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, c.length * 0.45, c.length * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#a16207';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = '#3f6212';
          ctx.beginPath();
          ctx.ellipse(c.length * 0.48, 0, c.length * 0.16, c.length * 0.11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(c.length * 0.52, -c.length * 0.04, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(c.length * 0.53, -c.length * 0.04, 1, 0, Math.PI * 2);
          ctx.fill();

        } else if (sp === 'ray') {
          const wingFlap = Math.sin(time * 0.003 + i) * 0.35;
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(c.length * 0.4, 0);
          ctx.quadraticCurveTo(0, -c.length * (0.65 + wingFlap), -c.length * 0.25, -c.length * 0.15);
          ctx.quadraticCurveTo(-c.length * 0.45, 0, -c.length * 0.25, c.length * 0.15);
          ctx.quadraticCurveTo(0, c.length * (0.65 + wingFlap), c.length * 0.4, 0);
          ctx.fill();

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-c.length * 0.28, 0);
          ctx.quadraticCurveTo(-c.length * 0.6, Math.sin(time * 0.004) * 6, -c.length * 1.1, 0);
          ctx.stroke();

        } else {
          const bodyGrad = ctx.createLinearGradient(0, -c.length * 0.3, 0, c.length * 0.3);
          bodyGrad.addColorStop(0, c.species.body);
          bodyGrad.addColorStop(0.65, c.species.fin);
          bodyGrad.addColorStop(1, c.species.belly);
          ctx.fillStyle = bodyGrad;

          ctx.beginPath();
          ctx.moveTo(-c.length * 0.55, 0);
          ctx.quadraticCurveTo(-c.length * 0.15, -c.length * 0.32, c.length * 0.52, 0);
          ctx.quadraticCurveTo(-c.length * 0.15, c.length * 0.32, -c.length * 0.55, 0);
          ctx.fill();

          if (sp === 'clown') {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            [-c.length * 0.15, c.length * 0.15].forEach(sx => {
              ctx.beginPath();
              ctx.ellipse(sx, 0, c.length * 0.08, c.length * 0.26, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            });
          } else if (sp === 'tang') {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(-c.length * 0.08, 0, c.length * 0.22, -0.8, 0.8);
            ctx.stroke();
          }

          ctx.fillStyle = c.species.fin;
          ctx.beginPath();
          ctx.moveTo(-c.length * 0.15, -c.length * 0.24);
          ctx.quadraticCurveTo(c.length * 0.1, -c.length * (sp === 'angel' ? 0.65 : 0.42), c.length * 0.25, -c.length * 0.14);
          ctx.closePath();
          ctx.fill();

          const tailWiggle = Math.sin(c.tailAngle) * 8;
          ctx.fillStyle = c.species.fin;
          ctx.beginPath();
          ctx.moveTo(-c.length * 0.52, 0);
          ctx.lineTo(-c.length * 0.96, -c.length * 0.34 + tailWiggle);
          ctx.quadraticCurveTo(-c.length * 0.76, tailWiggle * 0.5, -c.length * 0.96, c.length * 0.34 + tailWiggle);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(c.length * 0.32, -c.length * 0.06, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.arc(c.length * 0.34, -c.length * 0.06, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
      ctx.globalAlpha = 1.0;

      // 4. Rising Shimmering Micro-bubbles
      for (let i = 0; i < this.particles.length; i++) {
        const b = this.particles[i];
        b.y -= b.speedY * 60 * dt;
        b.angle += b.wobbleSpeed;
        const wobbleX = b.x + Math.sin(b.angle) * b.wobbleDist;

        if (b.y < -15) {
          b.y = h + 15;
          b.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(wobbleX, b.y, b.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(186, 230, 253, " + b.alpha + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(wobbleX - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (b.alpha * 0.85) + ")";
        ctx.fill();
      }
    },

    /* ==========================================================================
       3. ARCTIC DRIFT RENDERING (Multi-Layer Blizzard Snowfall & Frost Mist)
       ========================================================================== */
    renderArctic: function(ctx, w, h, dt, time) {
      // 1. Cool Glacial Frost Illumination
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.75, 10, w * 0.5, h * 0.75, Math.max(w, h) * 0.75);
      glow.addColorStop(0, 'rgba(186, 230, 253, 0.12)');
      glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
      glow.addColorStop(1, 'rgba(5, 15, 30, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 2. Subtle Frosty Mist Hovering at Bottom Edges
      for (let m = 0; m < this.mistParticles.length; m++) {
        const mist = this.mistParticles[m];
        mist.x += mist.speed * 60 * dt;
        if (mist.x > w + mist.radius) mist.x = -mist.radius;
        if (mist.x < -mist.radius) mist.x = w + mist.radius;

        const mistGrad = ctx.createRadialGradient(mist.x, mist.y, 10, mist.x, mist.y, mist.radius);
        mistGrad.addColorStop(0, "rgba(240, 249, 255, " + mist.alpha + ")");
        mistGrad.addColorStop(0.6, "rgba(186, 230, 253, " + (mist.alpha * 0.4) + ")");
        mistGrad.addColorStop(1, 'rgba(240, 249, 255, 0)');

        ctx.fillStyle = mistGrad;
        ctx.beginPath();
        ctx.arc(mist.x, mist.y, mist.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Multi-Layer Blizzard Snowfall with Depth
      for (let i = 0; i < this.particles.length; i++) {
        const s = this.particles[i];
        s.y += s.speedY * 60 * dt;
        s.angle += s.swayFreq;
        const currentX = s.x + Math.sin(s.angle) * s.swayAmp + (s.speedX * 60 * dt);

        s.x = currentX;
        if (s.y > h + 15) {
          s.y = -15;
          s.x = Math.random() * w;
        }
        if (s.x > w + 15) s.x = -15;

        if (s.isCrystal) {
          // Foreground large floating crystalline flakes
          ctx.strokeStyle = "rgba(255, 255, 255, " + s.alpha + ")";
          ctx.lineWidth = 1.2;
          const arm = s.radius * 1.3;

          ctx.beginPath();
          ctx.moveTo(currentX - arm, s.y);
          ctx.lineTo(currentX + arm, s.y);
          ctx.moveTo(currentX, s.y - arm);
          ctx.lineTo(currentX, s.y + arm);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(currentX, s.y, s.radius * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(240, 249, 255, " + s.alpha + ")";
          ctx.shadowColor = 'rgba(186, 230, 253, 0.6)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Background tiny fast drifting snowflakes
          ctx.beginPath();
          ctx.arc(currentX, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(240, 249, 255, " + s.alpha + ")";
          ctx.fill();
        }
      }
    }
  };

  window.ThemeEngine = ThemeEngine;
})(window);
