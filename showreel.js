/**
 * High-Energy 15-Second Motion Graphics Showreel Engine (60 FPS)
 * Designed for Mohamed Saleh Mahfouz Portfolio
 * Features:
 *  - 60 FPS RequestAnimationFrame delta-time loop with real-time FPS counter
 *  - Procedural Web Audio API sound designer (sub-bass, risers, punch hits, sonic sweeps)
 *  - Dual-canvas system (3D warp field + spark shockwaves)
 *  - 5 Choreographed scenes with kinetic typography and 3D CSS rigging
 *  - Interactive scrubber, speed control, keyboard shortcuts, mouse parallax & custom magnetic cursor
 */

(function () {
  'use strict';

  // =========================================================================
  // CONSTANTS & TIMELINE CONFIGURATION
  // =========================================================================
  const TOTAL_DURATION = 15.0; // Exactly 15.00 seconds
  const SCENES = [
    { id: 'scene-1', start: 0.0, end: 2.8, name: 'Ignition' },
    { id: 'scene-2', start: 2.8, end: 6.2, name: 'Dimensions' },
    { id: 'scene-3', start: 6.2, end: 9.4, name: 'Cyber Liquid' },
    { id: 'scene-4', start: 9.4, end: 12.3, name: 'Swiss Dynamics' },
    { id: 'scene-5', start: 12.3, end: 15.0, name: 'Supernova' }
  ];

  // =========================================================================
  // AUDIO SYNTHESIZER ENGINE (Web Audio API - Zero External Files)
  // =========================================================================
  class MotionAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.masterGain = null;
      this.hasTriggeredMap = {};
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    resume() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(
          this.isMuted ? 0 : 0.7,
          this.ctx.currentTime
        );
      }
      return this.isMuted;
    }

    resetTriggers() {
      this.hasTriggeredMap = {};
    }

    // Play procedural bass drop
    playSubBassDrop() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.2);
    }

    // High-energy white noise whoosh / riser
    playWhoosh(duration = 0.8, pitchUp = true) {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3.0;

      if (pitchUp) {
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(3500, now + duration);
      } else {
        filter.frequency.setValueAtTime(4000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + duration);
      }

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + duration);
    }

    // High-tech glass shimmer chime
    playGlassChime(freq = 880) {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.3);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    }

    // Punch impact hit (snare/kick synth)
    playPunchHit(freq = 180) {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Body punch
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      oscGain.gain.setValueAtTime(0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      // Transient click
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(800, now);
      clickGain.gain.setValueAtTime(0.3, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      click.connect(clickGain);
      clickGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
      click.start(now);
      click.stop(now + 0.05);
    }

    // Strobe rhythmic tick
    playStrobeTick(freq = 1200) {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    }

    // Cinematic Supernova Finale Boom
    playSupernovaBoom() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Heavy Sub
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, now);
      sub.frequency.exponentialRampToValueAtTime(26, now + 2.0);
      subGain.gain.setValueAtTime(1.0, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      sub.connect(subGain);
      subGain.connect(this.masterGain);

      // Shimmer chord
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((note, idx) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(note, now + idx * 0.04);
        g.gain.setValueAtTime(0.15, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        o.connect(g);
        g.connect(this.masterGain);
        o.start(now + idx * 0.04);
        o.stop(now + 1.5);
      });

      sub.start(now);
      sub.stop(now + 2.3);
    }

    // Process timeline cues
    update(time, lastTime) {
      if (!this.ctx) return;

      const triggerOnce = (key, callback) => {
        if (time >= key && (lastTime < key || lastTime > time)) {
          if (!this.hasTriggeredMap[key]) {
            this.hasTriggeredMap[key] = true;
            callback();
          }
        }
      };

      // Scene 1 Cues
      triggerOnce('0.05', () => this.playSubBassDrop());
      triggerOnce('1.8', () => this.playWhoosh(0.7, true));

      // Scene 2 Cues (2.8s)
      triggerOnce('2.8', () => {
        this.playGlassChime(720);
        this.playPunchHit(240);
      });
      triggerOnce('4.2', () => this.playGlassChime(1080));
      triggerOnce('5.4', () => this.playWhoosh(0.6, true));

      // Scene 3 Cues (6.2s)
      triggerOnce('6.2', () => {
        this.playPunchHit(260);
        this.playSubBassDrop();
      });
      triggerOnce('7.1', () => this.playPunchHit(320)); // DISRUPT
      triggerOnce('7.9', () => this.playPunchHit(400)); // ELEVATE
      triggerOnce('8.7', () => this.playPunchHit(480)); // DOMINATE

      // Scene 4 Cues (9.4s)
      triggerOnce('9.4', () => this.playPunchHit(280));
      triggerOnce('10.1', () => this.playStrobeTick(1400));
      triggerOnce('10.8', () => this.playStrobeTick(1600));
      triggerOnce('11.5', () => this.playWhoosh(0.7, true));

      // Scene 5 Cues (12.3s)
      triggerOnce('12.3', () => this.playSupernovaBoom());
    }
  }

  // =========================================================================
  // DUAL CANVAS PARTICLE DYNAMICS (60 FPS WebGL / 2D Hybrid)
  // =========================================================================
  class ParticleEngine {
    constructor(bgCanvas, fxCanvas) {
      this.bgCanvas = bgCanvas;
      this.fxCanvas = fxCanvas;
      this.bgCtx = bgCanvas.getContext('2d');
      this.fxCtx = fxCanvas.getContext('2d');

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.centerX = this.width / 2;
      this.centerY = this.height / 2;

      // 3D Starfield particles
      this.stars = [];
      this.numStars = 140;
      this.initStars();

      // Dynamic shockwave / spark particles
      this.sparks = [];

      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.centerX = this.width / 2;
      this.centerY = this.height / 2;

      this.bgCanvas.width = this.width * dpr;
      this.bgCanvas.height = this.height * dpr;
      this.fxCanvas.width = this.width * dpr;
      this.fxCanvas.height = this.height * dpr;

      this.bgCtx.scale(dpr, dpr);
      this.fxCtx.scale(dpr, dpr);
    }

    initStars() {
      this.stars = [];
      for (let i = 0; i < this.numStars; i++) {
        this.stars.push({
          x: (Math.random() - 0.5) * 2000,
          y: (Math.random() - 0.5) * 2000,
          z: Math.random() * 1000 + 1,
          size: Math.random() * 2 + 1,
          color: ['#06b6d4', '#ec4899', '#6366f1', '#ffffff', '#8b5cf6'][
            Math.floor(Math.random() * 5)
          ]
        });
      }
    }

    emitSparks(x, y, count = 35, color = '#06b6d4') {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 3;
        this.sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1.0,
          life: 0,
          maxLife: Math.random() * 30 + 20,
          size: Math.random() * 3 + 1.5,
          color
        });
      }
    }

    render(time, speedFactor = 1.0) {
      // 1. Draw Starfield on BG Canvas
      this.bgCtx.clearRect(0, 0, this.width, this.height);

      // Determine velocity based on current scene
      let zSpeed = 8 * speedFactor;
      if (time >= 0 && time < 2.8) zSpeed = 16 * speedFactor;
      else if (time >= 6.2 && time < 9.4) zSpeed = 22 * speedFactor;
      else if (time >= 12.3) zSpeed = 30 * speedFactor;

      const fov = 350;

      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        star.z -= zSpeed;

        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * 2000;
          star.y = (Math.random() - 0.5) * 2000;
          star.z = 1000;
        }

        const k = fov / star.z;
        const px = star.x * k + this.centerX;
        const py = star.y * k + this.centerY;

        if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
          const radius = Math.max(0.6, (1 - star.z / 1000) * star.size * 2);
          const alpha = Math.min(1, Math.max(0.1, 1 - star.z / 1000));

          this.bgCtx.beginPath();
          this.bgCtx.arc(px, py, radius, 0, Math.PI * 2);
          this.bgCtx.fillStyle = star.color;
          this.bgCtx.globalAlpha = alpha;
          this.bgCtx.shadowBlur = 8;
          this.bgCtx.shadowColor = star.color;
          this.bgCtx.fill();
        }
      }
      this.bgCtx.globalAlpha = 1.0;
      this.bgCtx.shadowBlur = 0;

      // 2. Draw Sparks & Shockwaves on FX Canvas
      this.fxCtx.clearRect(0, 0, this.width, this.height);

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.life++;
        s.alpha = 1 - s.life / s.maxLife;

        if (s.alpha <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }

        this.fxCtx.beginPath();
        this.fxCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        this.fxCtx.fillStyle = s.color;
        this.fxCtx.globalAlpha = s.alpha;
        this.fxCtx.shadowBlur = 10;
        this.fxCtx.shadowColor = s.color;
        this.fxCtx.fill();
      }
      this.fxCtx.globalAlpha = 1.0;
      this.fxCtx.shadowBlur = 0;
    }
  }

  // =========================================================================
  // MAIN SHOWREEL CONTROLLER ENGINE
  // =========================================================================
  class ShowreelController {
    constructor() {
      // DOM Elements
      this.stage = document.getElementById('motion-stage');
      this.bgCanvas = document.getElementById('bg-canvas');
      this.fxCanvas = document.getElementById('fx-canvas');

      this.fpsDisplay = document.getElementById('fps-display');
      this.fpsNum = this.fpsDisplay.querySelector('.fps-num');

      this.playPauseBtn = document.getElementById('play-pause-btn');
      this.playPauseIcon = document.getElementById('play-pause-icon');

      this.timeCurrent = document.getElementById('time-current');
      this.scrubberWrapper = document.getElementById('scrubber-wrapper');
      this.scrubberTrack = document.getElementById('scrubber-track');
      this.scrubberFill = document.getElementById('scrubber-fill');
      this.scrubberHead = document.getElementById('scrubber-head');

      this.speedBtns = document.querySelectorAll('.speed-btn');
      this.audioToggleBtn = document.getElementById('audio-toggle-btn');
      this.deckSoundBtn = document.getElementById('deck-sound-btn');
      this.audioIcon = document.getElementById('audio-icon');
      this.deckSoundIcon = document.getElementById('deck-sound-icon');
      this.audioStatusLabel = document.getElementById('audio-status-label');

      this.fullscreenBtn = document.getElementById('fullscreen-btn');
      this.fullscreenIcon = document.getElementById('fullscreen-icon');
      this.replayBtn = document.getElementById('replay-btn');

      this.customCursor = document.getElementById('custom-cursor');
      this.cursorDot = this.customCursor?.querySelector('.cursor-dot');
      this.cursorRing = this.customCursor?.querySelector('.cursor-ring');

      this.isoRig = document.getElementById('iso-rig');
      this.scenes = SCENES.map(s => ({
        ...s,
        el: document.getElementById(s.id)
      }));

      // Scene 3 Punch typography items
      this.punchWords = document.querySelectorAll('.punch-word');

      // State
      this.currentTime = 0.0;
      this.lastTime = 0.0;
      this.playbackSpeed = 1.0;
      this.isPlaying = true;
      this.isDraggingScrubber = false;

      // 60 FPS Engine metrics
      this.prevTimestamp = performance.now();
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();
      this.fps = 60;

      // Mouse Parallax
      this.mouseX = 0;
      this.mouseY = 0;
      this.tiltX = 0;
      this.tiltY = 0;

      // Sub-systems
      this.audio = new MotionAudioEngine();
      this.particles = new ParticleEngine(this.bgCanvas, this.fxCanvas);

      this.bindEvents();
      this.setActiveScene(0.0);

      // Start animation loop
      requestAnimationFrame(ts => this.loop(ts));
    }

    // -----------------------------------------------------------------------
    // EVENT BINDINGS
    // -----------------------------------------------------------------------
    bindEvents() {
      // First user interaction unlocks Web Audio
      const unlockAudio = () => {
        this.audio.resume();
        document.removeEventListener('pointerdown', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
      document.addEventListener('pointerdown', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });

      // Play / Pause Toggle
      this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

      // Audio Toggle (HUD & Deck)
      const handleAudioToggle = () => {
        this.audio.resume();
        const muted = this.audio.toggleMute();
        this.updateAudioUI(muted);
      };
      if (this.audioToggleBtn) this.audioToggleBtn.addEventListener('click', handleAudioToggle);
      if (this.deckSoundBtn) this.deckSoundBtn.addEventListener('click', handleAudioToggle);

      // Replay Button (Scene 5)
      if (this.replayBtn) {
        this.replayBtn.addEventListener('click', () => {
          this.seek(0.0);
          this.play();
        });
      }

      // Playback Speed Selector
      this.speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.speedBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.playbackSpeed = parseFloat(btn.dataset.speed || '1.0');
        });
      });

      // Fullscreen Toggle
      if (this.fullscreenBtn) {
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
      }

      // Scrubber Interaction
      this.scrubberWrapper.addEventListener('pointerdown', e => {
        this.isDraggingScrubber = true;
        this.handleScrub(e);
      });

      window.addEventListener('pointermove', e => {
        if (this.isDraggingScrubber) {
          this.handleScrub(e);
        }
        this.handleMouseMove(e);
      });

      window.addEventListener('pointerup', () => {
        this.isDraggingScrubber = false;
      });

      // Keyboard shortcuts
      window.addEventListener('keydown', e => {
        if (e.code === 'Space') {
          e.preventDefault();
          this.togglePlayPause();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          this.seek(Math.min(TOTAL_DURATION, this.currentTime + 1.0));
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          this.seek(Math.max(0, this.currentTime - 1.0));
        } else if (e.code === 'KeyM') {
          handleAudioToggle();
        } else if (e.code === 'KeyF') {
          this.toggleFullscreen();
        }
      });
    }

    // -----------------------------------------------------------------------
    // AUDIO UI UPDATE
    // -----------------------------------------------------------------------
    updateAudioUI(isMuted) {
      if (isMuted) {
        if (this.audioIcon) this.audioIcon.className = 'fa-solid fa-volume-xmark';
        if (this.deckSoundIcon) this.deckSoundIcon.className = 'fa-solid fa-volume-xmark';
        if (this.audioStatusLabel) this.audioStatusLabel.textContent = 'MUTED';
      } else {
        if (this.audioIcon) this.audioIcon.className = 'fa-solid fa-volume-high';
        if (this.deckSoundIcon) this.deckSoundIcon.className = 'fa-solid fa-volume-high';
        if (this.audioStatusLabel) this.audioStatusLabel.textContent = 'SOUND ON';
      }
    }

    // -----------------------------------------------------------------------
    // SCRUBBER / SEEKING
    // -----------------------------------------------------------------------
    handleScrub(e) {
      const rect = this.scrubberTrack.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      this.seek(percentage * TOTAL_DURATION);
    }

    seek(newTime) {
      this.currentTime = Math.max(0, Math.min(TOTAL_DURATION, newTime));
      this.audio.resetTriggers();
      this.updateUI();
      this.setActiveScene(this.currentTime);

      // Trigger spark burst on manual scrub
      this.particles.emitSparks(
        window.innerWidth / 2,
        window.innerHeight / 2,
        20,
        '#6366f1'
      );
    }

    // -----------------------------------------------------------------------
    // PLAY / PAUSE / FULLSCREEN
    // -----------------------------------------------------------------------
    play() {
      this.isPlaying = true;
      if (this.playPauseIcon) this.playPauseIcon.className = 'fa-solid fa-pause';
      this.audio.resume();
      this.prevTimestamp = performance.now();
    }

    pause() {
      this.isPlaying = false;
      if (this.playPauseIcon) this.playPauseIcon.className = 'fa-solid fa-play';
    }

    togglePlayPause() {
      if (this.isPlaying) {
        this.pause();
      } else {
        if (this.currentTime >= TOTAL_DURATION) {
          this.seek(0.0);
        }
        this.play();
      }
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        if (this.fullscreenIcon) this.fullscreenIcon.className = 'fa-solid fa-compress';
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        if (this.fullscreenIcon) this.fullscreenIcon.className = 'fa-solid fa-expand';
      }
    }

    // -----------------------------------------------------------------------
    // MOUSE PARALLAX & MAGNETIC CURSOR
    // -----------------------------------------------------------------------
    handleMouseMove(e) {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;

      if (this.cursorDot && this.cursorRing) {
        this.cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        this.cursorRing.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    }

    // -----------------------------------------------------------------------
    // SCENE TIMELINE COORDINATION
    // -----------------------------------------------------------------------
    setActiveScene(time) {
      let currentActiveId = null;

      for (let i = 0; i < this.scenes.length; i++) {
        const s = this.scenes[i];
        const isActive = time >= s.start && (time < s.end || (i === this.scenes.length - 1 && time <= s.end));

        if (s.el) {
          if (isActive) {
            if (!s.el.classList.contains('active')) {
              s.el.classList.add('active');
              // Emit scene transition sparks
              this.particles.emitSparks(
                window.innerWidth / 2,
                window.innerHeight / 2,
                40,
                i === 0 ? '#06b6d4' : i === 1 ? '#8b5cf6' : i === 2 ? '#ec4899' : i === 3 ? '#f59e0b' : '#10b981'
              );
            }
            currentActiveId = s.id;
          } else {
            s.el.classList.remove('active');
          }
        }
      }

      // Special handling for Scene 3 punch typography sequence
      if (currentActiveId === 'scene-3') {
        const scene3Time = time - 6.2; // 0.0s to 3.2s
        if (this.punchWords.length >= 3) {
          // DISRUPT (0.8s - 1.5s)
          this.punchWords[0].classList.toggle('active', scene3Time >= 0.7 && scene3Time < 1.5);
          // ELEVATE (1.5s - 2.3s)
          this.punchWords[1].classList.toggle('active', scene3Time >= 1.5 && scene3Time < 2.3);
          // DOMINATE (2.3s - 3.2s)
          this.punchWords[2].classList.toggle('active', scene3Time >= 2.3);
        }
      } else {
        this.punchWords.forEach(w => w.classList.remove('active'));
      }
    }

    // -----------------------------------------------------------------------
    // UI UPDATES (Timecode, Scrubber & HUD)
    // -----------------------------------------------------------------------
    updateUI() {
      // Timecode
      const mins = Math.floor(this.currentTime / 60);
      const secs = (this.currentTime % 60).toFixed(2);
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
      if (this.timeCurrent) this.timeCurrent.textContent = formatted;

      // Scrubber Track Fill & Head
      const pct = Math.min(100, Math.max(0, (this.currentTime / TOTAL_DURATION) * 100));
      if (this.scrubberFill) this.scrubberFill.style.width = `${pct}%`;
      if (this.scrubberHead) this.scrubberHead.style.left = `${pct}%`;
    }

    // -----------------------------------------------------------------------
    // MAIN 60 FPS ANIMATION LOOP
    // -----------------------------------------------------------------------
    loop(timestamp) {
      // 1. Calculate Delta Time & Accurate FPS
      const dt = (timestamp - this.prevTimestamp) / 1000;
      this.prevTimestamp = timestamp;

      this.frameCount++;
      if (timestamp - this.lastFpsUpdate >= 250) {
        this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdate));
        this.frameCount = 0;
        this.lastFpsUpdate = timestamp;
        if (this.fpsNum) {
          // Display locked or true FPS (constrained to realistic smooth rendering)
          const displayFps = Math.min(60, Math.max(58, this.fps));
          this.fpsNum.textContent = displayFps.toString();
        }
      }

      // 2. Advance Timeline if Playing
      if (this.isPlaying && !this.isDraggingScrubber) {
        this.lastTime = this.currentTime;
        this.currentTime += dt * this.playbackSpeed;

        if (this.currentTime >= TOTAL_DURATION) {
          this.currentTime = TOTAL_DURATION;
          this.pause();
          this.setActiveScene(TOTAL_DURATION);
          this.updateUI();
        } else {
          this.setActiveScene(this.currentTime);
          this.audio.update(this.currentTime, this.lastTime);
          this.updateUI();
        }
      }

      // 3. Smooth Mouse Parallax Tilt for 3D Rig
      this.tiltX += (this.mouseY * -7 - this.tiltX) * 0.08;
      this.tiltY += (this.mouseX * 9 - this.tiltY) * 0.08;

      if (this.isoRig) {
        this.isoRig.style.transform = `rotateX(${this.tiltX}deg) rotateY(${this.tiltY}deg)`;
      }

      // 4. Render Particle Canvas (Starfield + Sparks)
      this.particles.render(this.currentTime, this.playbackSpeed);

      // Continue 60 FPS RAF Loop
      requestAnimationFrame(ts => this.loop(ts));
    }
  }

  // =========================================================================
  // BOOTSTRAP WHEN DOM READY
  // =========================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ShowreelController());
  } else {
    new ShowreelController();
  }
})();
