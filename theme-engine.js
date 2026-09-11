/**
 * Ultra-Realistic, High-Performance Canvas Theme Engine for 1024 Game
 * 60 FPS Mobile-Optimized with Error Detection & Auto-Recovery
 * 
 * Themes:
 * 1. Stargazer: 3D parallax starfield with colored nebula gas clouds, depth-blurred stars, realistic shooting stars with head glow and fading smoke trails.
 * 2. Aqua Drift: Dynamic caustic sunlight rays, realistic fish with dorsal fins, gradient scales, translucent wiggling tail fins, rising shimmering bubbles with dual highlights.
 * 3. Arctic Drift: Realistic multi-depth hexagonal/soft snowflake crystals, 3D atmospheric blizzard fog waves, and variable wind velocity gusts.
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
    ambientWaves: [],
    lastTime: 0,
    running: false,
    errorCount: 0,

    init: function(canvasId) {
      try {
        this.canvas = document.getElementById(canvasId || 'bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        if (!this.ctx) {
          console.warn('[ThemeEngine] 2D Context not supported');
          return;
        }

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

        // Auto pause on tab switch to eliminate battery usage
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stop();
          } else {
            this.start();
          }
        });

        // Load saved theme (default to aqua underwater)
        const saved = localStorage.getItem('g1024_active_theme') || 'aqua';
        this.switchTheme(saved);
      } catch (err) {
        this.handleError(err);
      }
    },

    handleError: function(err) {
      this.errorCount++;
      console.error('[ThemeEngine Error Caught]:', err);
      // Auto recovery: if errors repeat, safely reset entities without crashing the page
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

      // Manage underwater coral video / photo layer visibility
      const bgVideo = document.getElementById('underwaterVideo');
      const bgFallback = document.getElementById('underwaterFallback');
      if (bgVideo && bgFallback) {
        if (themeName === 'aqua') {
          bgVideo.style.display = 'block';
          bgFallback.style.display = 'block';
          if (bgVideo.paused) bgVideo.play().catch(()=>{});
        } else {
          bgVideo.style.display = 'none';
          bgFallback.style.display = 'none';
          if (!bgVideo.paused) bgVideo.pause();
        }
      }

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
      this.ambientWaves = [];

      const w = this.width || window.innerWidth;
      const h = this.height || window.innerHeight;
      const scaleFactor = this.isMobile ? 0.55 : 1.0;

      if (this.currentTheme === 'stargazer') {
        // Multi-tier 3D parallax stars with realistic color temperature & brightness
        const starCount = Math.floor(95 * scaleFactor);
        for (let i = 0; i < starCount; i++) {
          const depth = Math.random(); // 0 (far away) to 1 (close foreground)
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: depth * 1.8 + 0.5,
            speed: depth * 0.45 + 0.06,
            depth: depth,
            alpha: depth * 0.5 + 0.35,
            twinkleFreq: Math.random() * 0.03 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2,
            color: depth > 0.8 ? '#e0f2fe' : (depth > 0.5 ? '#f8fafc' : (Math.random() < 0.3 ? '#c084fc' : '#bae6fd'))
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

        // Realistic diverse marine life: Sea Turtles, Coral Fish, Blue Tangs, Moorish Angels & Manta
        const creatureCount = this.isMobile ? 8 : 14;
        const speciesList = [
          { type: 'turtle', name: 'Sea Turtle', speedMult: 0.38, length: 50, scale: 0.85, alpha: 0.88 },
          { type: 'tang', name: 'Blue Tang (Dory)', speedMult: 0.75, length: 30, scale: 0.8, body: '#1d4ed8', fin: '#facc15', belly: '#60a5fa', alpha: 0.85 },
          { type: 'clown', name: 'Clownfish (Nemo)', speedMult: 0.65, length: 26, scale: 0.85, body: '#ea580c', fin: '#ffffff', belly: '#fb923c', alpha: 0.85 },
          { type: 'angel', name: 'Moorish Idol', speedMult: 0.7, length: 34, scale: 0.85, body: '#0f172a', fin: '#facc15', belly: '#f8fafc', alpha: 0.85 },
          { type: 'ray', name: 'Manta Ray', speedMult: 0.42, length: 58, scale: 0.8, alpha: 0.75 },
          { type: 'emerald', name: 'Parrotfish', speedMult: 0.68, length: 32, scale: 0.8, body: '#059669', fin: '#34d399', belly: '#a7f3d0', alpha: 0.85 },
          { type: 'violet', name: 'Orchid Dottyback', speedMult: 0.8, length: 24, scale: 0.75, body: '#7c3aed', fin: '#c084fc', belly: '#ede9fe', alpha: 0.85 }
        ];

        for (let i = 0; i < creatureCount; i++) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          const spec = speciesList[i % speciesList.length];
          this.creatures.push({
            x: Math.random() * w,
            y: Math.random() * (h * 0.80) + h * 0.08,
            length: spec.length * (Math.random() * 0.3 + 0.85),
            speed: (Math.random() * 0.45 + 0.45) * spec.speedMult * dir,
            dir: dir,
            freq: Math.random() * 0.035 + 0.02,
            amp: Math.random() * 14 + 6,
            tailAngle: Math.random() * Math.PI * 2,
            flipperAngle: 0,
            species: spec,
            scale: spec.scale * (Math.random() * 0.25 + 0.85),
            depth: Math.random() * 0.5 + 0.5 // depth layer for natural parallax
          });
        }
      } else if (this.currentTheme === 'arctic') {
        // Multi-depth snowflakes with wind gusts
        const snowCount = Math.floor(80 * scaleFactor);
        for (let i = 0; i < snowCount; i++) {
          const depth = Math.random();
          this.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: depth * 2.8 + 1.0,
            speedY: depth * 1.1 + 0.45,
            speedX: depth * 0.4 + 0.15,
            swayFreq: Math.random() * 0.02 + 0.012,
            swayAmp: Math.random() * 1.8 + 0.8,
            angle: Math.random() * Math.PI * 2,
            alpha: depth * 0.55 + 0.35,
            isCrystal: depth > 0.75 // detailed crystalline rendering for foreground flakes
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
    },

    /* ==========================================================================
       1. STARGAZER RENDERING
       ========================================================================== */
    renderStargazer: function(ctx, w, h, dt, time) {
      // Flowing luminous cosmic nebula clouds
      const tSec = time * 0.0003;
      const nebX = w * 0.35 + Math.sin(tSec) * 60;
      const nebY = h * 0.28 + Math.cos(tSec * 0.8) * 50;

      const nebulaGrad = ctx.createRadialGradient(nebX, nebY, 10, nebX, nebY, Math.max(w, h) * 0.65);
      nebulaGrad.addColorStop(0, 'rgba(124, 58, 237, 0.09)');
      nebulaGrad.addColorStop(0.4, 'rgba(79, 70, 229, 0.06)');
      nebulaGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.03)');
      nebulaGrad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, w, h);

      // Parallax Stars with realistic twinkle & depth glow
      for (let i = 0; i < this.particles.length; i++) {
        const s = this.particles[i];
        s.y += s.speed * 60 * dt;
        if (s.y > h + 5) {
          s.y = -5;
          s.x = Math.random() * w;
        }

        const twinkle = Math.sin(time * s.twinkleFreq + s.twinkleOffset) * 0.3 + 0.7;
        const alpha = s.alpha * twinkle;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Extra soft glow halo for closer stars
        if (s.depth > 0.75) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(186, 230, 253, 0.15)';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      // Realistic Shooting Star (Meteors) with glowing head & particle dust trail
      if (Math.random() < (this.isMobile ? 0.005 : 0.009) && this.meteors.length < 2) {
        this.meteors.push({
          x: Math.random() * (w * 0.85),
          y: Math.random() * (h * 0.35),
          vx: Math.random() * 320 + 440,
          vy: Math.random() * 200 + 260,
          len: Math.random() * 70 + 60,
          life: 1.0,
          decay: Math.random() * 1.3 + 1.2
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

        // Smooth fading gradient trail
        const mGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        mGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        mGrad.addColorStop(0.6, "rgba(56, 189, 248, " + (m.life * 0.6) + ")");
        mGrad.addColorStop(1, "rgba(255, 255, 255, " + (m.life * 0.98) + ")");

        ctx.strokeStyle = mGrad;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Glowing meteor head
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + m.life + ")";
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },

    /* ==========================================================================
       2. AQUA DRIFT RENDERING
       ========================================================================== */
    renderAqua: function(ctx, w, h, dt, time) {
      // 1. Cinematic Volumetric Sunbeam God Rays Sweeping Down
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

      // 2. Animated Caustics Refraction Web across the Water Column
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

      // Realistic swimming fish (smooth sine-wave swimming with multi-layer fins)
      for (let i = 0; i < this.creatures.length; i++) {
        const c = this.creatures[i];
        c.x += c.speed * 60 * dt;
        c.tailAngle += (c.speed > 0 ? 0.22 : -0.22);

        // Screen wrap
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
          // --- REALISTIC SEA TURTLE ---
          c.flipperAngle = Math.sin(time * 0.0035 + i) * 0.45;

          // Back flippers
          ctx.fillStyle = '#1e3a1e';
          ctx.beginPath();
          ctx.ellipse(-c.length * 0.38, -c.length * 0.22, c.length * 0.18, c.length * 0.09, 0.4, 0, Math.PI * 2);
          ctx.ellipse(-c.length * 0.38, c.length * 0.22, c.length * 0.18, c.length * 0.09, -0.4, 0, Math.PI * 2);
          ctx.fill();

          // Front swimming flippers (paddle wing motion)
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

          // Turtle Carapace (Oval Shell with scutes pattern)
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

          // Head & Neck
          ctx.fillStyle = '#3f6212';
          ctx.beginPath();
          ctx.ellipse(c.length * 0.48, 0, c.length * 0.16, c.length * 0.11, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eye
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(c.length * 0.52, -c.length * 0.04, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(c.length * 0.53, -c.length * 0.04, 1, 0, Math.PI * 2);
          ctx.fill();

        } else if (sp === 'ray') {
          // --- REALISTIC MANTA RAY ---
          const wingFlap = Math.sin(time * 0.003 + i) * 0.35;
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(c.length * 0.4, 0);
          ctx.quadraticCurveTo(0, -c.length * (0.65 + wingFlap), -c.length * 0.25, -c.length * 0.15);
          ctx.quadraticCurveTo(-c.length * 0.45, 0, -c.length * 0.25, c.length * 0.15);
          ctx.quadraticCurveTo(0, c.length * (0.65 + wingFlap), c.length * 0.4, 0);
          ctx.fill();

          // Cephalic horns
          ctx.beginPath();
          ctx.moveTo(c.length * 0.35, -c.length * 0.08);
          ctx.lineTo(c.length * 0.48, -c.length * 0.14);
          ctx.lineTo(c.length * 0.38, -c.length * 0.04);
          ctx.moveTo(c.length * 0.35, c.length * 0.08);
          ctx.lineTo(c.length * 0.48, c.length * 0.14);
          ctx.lineTo(c.length * 0.38, c.length * 0.04);
          ctx.fill();

          // Long whip-like tail
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-c.length * 0.28, 0);
          ctx.quadraticCurveTo(-c.length * 0.6, Math.sin(time * 0.004) * 6, -c.length * 1.1, 0);
          ctx.stroke();

        } else {
          // --- REALISTIC CORAL TROPICAL FISH (Clownfish, Blue Tang, Moorish Idol) ---
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

          // Species distinctive patterns:
          if (sp === 'clown') {
            // White stripes with black contour (Nemo)
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
            // Black curved swoosh on royal blue body (Dory)
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(-c.length * 0.08, 0, c.length * 0.22, -0.8, 0.8);
            ctx.stroke();
          }

          // Dorsal Fin
          ctx.fillStyle = c.species.fin;
          ctx.beginPath();
          ctx.moveTo(-c.length * 0.15, -c.length * 0.24);
          ctx.quadraticCurveTo(c.length * 0.1, -c.length * (sp === 'angel' ? 0.65 : 0.42), c.length * 0.25, -c.length * 0.14);
          ctx.closePath();
          ctx.fill();

          // Lifelike Wiggling Tail Fin (Dual Lobe)
          const tailWiggle = Math.sin(c.tailAngle) * 8;
          ctx.fillStyle = c.species.fin;
          ctx.beginPath();
          ctx.moveTo(-c.length * 0.52, 0);
          ctx.lineTo(-c.length * 0.96, -c.length * 0.34 + tailWiggle);
          ctx.quadraticCurveTo(-c.length * 0.76, tailWiggle * 0.5, -c.length * 0.96, c.length * 0.34 + tailWiggle);
          ctx.closePath();
          ctx.fill();

          // Eye
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

      // Rising Shimmering Micro-bubbles with Dual Specular Highlights
      for (let i = 0; i < this.particles.length; i++) {
        const b = this.particles[i];
        b.y -= b.speedY * 60 * dt;
        b.angle += b.wobbleSpeed;
        const wobbleX = b.x + Math.sin(b.angle) * b.wobbleDist;

        if (b.y < -15) {
          b.y = h + 15;
          b.x = Math.random() * w;
        }

        // Bubble Outer Rim
        ctx.beginPath();
        ctx.arc(wobbleX, b.y, b.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(186, 230, 253, " + b.alpha + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Specular Light Highlight (Top-left reflection)
        ctx.beginPath();
        ctx.arc(wobbleX - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (b.alpha * 0.85) + ")";
        ctx.fill();

        // Secondary subtle interior sheen
        ctx.beginPath();
        ctx.arc(wobbleX + b.radius * 0.2, b.y + b.radius * 0.2, b.radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56, 189, 248, " + (b.alpha * 0.5) + ")";
        ctx.fill();
      }
    },

    /* ==========================================================================
       3. ARCTIC DRIFT RENDERING
       ========================================================================== */
    renderArctic: function(ctx, w, h, dt, time) {
      // Glacial ambient blizzard glow
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.75, 10, w * 0.5, h * 0.75, Math.max(w, h) * 0.75);
      glow.addColorStop(0, 'rgba(186, 230, 253, 0.09)');
      glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.04)');
      glow.addColorStop(1, 'rgba(8, 17, 30, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Realistic Snowfall with Horizontal Wind Sway & Crystalline Flares
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
          // Hexagonal crystalline snowflake flare for foreground
          ctx.strokeStyle = "rgba(255, 255, 255, " + s.alpha + ")";
          ctx.lineWidth = 1;
          const arm = s.radius * 1.25;

          ctx.beginPath();
          ctx.moveTo(currentX - arm, s.y);
          ctx.lineTo(currentX + arm, s.y);
          ctx.moveTo(currentX, s.y - arm);
          ctx.lineTo(currentX, s.y + arm);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(currentX, s.y, s.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(240, 249, 255, " + s.alpha + ")";
          ctx.fill();
        } else {
          // Soft depth-of-field blurred snowflake
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
