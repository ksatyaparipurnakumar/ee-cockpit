/* ============================================================
 * EE Cockpit Tour — Einstein Avatar
 * --------------------------------------------------------------
 * Renders a stylised Einstein face on a <canvas> with:
 *   - Subtle idle animation (eye blinks, breathing, slight head tilt)
 *   - Amplitude-driven lip-sync while Web Speech API is speaking
 *   - Public API:  EinsteinAvatar.create({ canvas, onReady })
 *                  .speak(text, opts)   // Promise<void>
 *                  .stop()              // cancel current speech
 *                  .setMuted(boolean)
 *                  .setRate(number)     // 0.7..1.2
 *                  .setPitch(number)    // 0.7..1.2
 *
 * Voice selection: prefers British male voices, falls back to any
 * English male voice, then any English voice. Override via
 * `EinsteinAvatar.preferredVoices = [...names]` before create().
 * ============================================================ */
(function (global) {
  'use strict';

  /** Voice preference list — first match (case-insensitive substring) wins. */
  const DEFAULT_VOICE_PREFS = [
    'Daniel',                // macOS / Safari — British male
    'Microsoft George',      // Windows / Edge — British male
    'Google UK English Male',// Chrome — British male
    'Microsoft Ryan',        // Windows — neutral male
    'Alex',                  // macOS — US deep male
    'Microsoft David'        // Windows — US male
  ];

  /** Pick the best available voice given prefs + locale. */
  function pickVoice(prefs) {
    const voices = global.speechSynthesis ? global.speechSynthesis.getVoices() : [];
    if (!voices || !voices.length) return null;
    const lower = (s) => (s || '').toLowerCase();
    for (const pref of prefs) {
      const m = voices.find(v => lower(v.name).includes(lower(pref)));
      if (m) return m;
    }
    // Fallbacks
    const enMale = voices.find(v => /en[-_]/i.test(v.lang) && /male|david|alex|ryan|george/i.test(v.name));
    if (enMale) return enMale;
    const en = voices.find(v => /en[-_]/i.test(v.lang));
    return en || voices[0];
  }

  /** Wait for voices to load (some browsers populate async). */
  function whenVoicesReady() {
    return new Promise(function (resolve) {
      if (!global.speechSynthesis) return resolve();
      const list = global.speechSynthesis.getVoices();
      if (list && list.length) return resolve();
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      global.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
      // Hard fallback after 1.5s in case the event never fires
      setTimeout(finish, 1500);
    });
  }

  /** Draw Einstein face. mouthOpen ∈ [0,1], blink ∈ [0,1], tilt ∈ [-1,1] */
  function drawEinstein(ctx, w, h, state) {
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((state.tilt || 0) * 0.04);
    ctx.translate(-cx, -cy);

    // Face skin
    const faceGrad = ctx.createRadialGradient(cx, cy - 6, 10, cx, cy, w * 0.55);
    faceGrad.addColorStop(0, '#f4d8b8');
    faceGrad.addColorStop(1, '#d3a87c');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, w * 0.30, h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck shadow
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.42, w * 0.18, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (wild white) — multiple overlapping shapes
    ctx.fillStyle = '#f4f4f4';
    drawHairTufts(ctx, cx, cy, w, h);
    // Hair highlights
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    drawHairTufts(ctx, cx - 4, cy - 6, w * 0.92, h * 0.92, true);

    // Ears
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.27, cy + 6, w * 0.045, h * 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.27, cy + 6, w * 0.045, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows (bushy)
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.12, cy - h * 0.10, w * 0.07, h * 0.025, -0.1, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.12, cy - h * 0.10, w * 0.07, h * 0.025, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeR = w * 0.025;
    const eyeLid = 1 - (state.blink || 0); // 1 = open, 0 = closed
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.11, cy - h * 0.05, w * 0.04, h * 0.025 * eyeLid, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.11, cy - h * 0.05, w * 0.04, h * 0.025 * eyeLid, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2820';
    ctx.beginPath();
    ctx.arc(cx - w * 0.105, cy - h * 0.05, eyeR * eyeLid, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.115, cy - h * 0.05, eyeR * eyeLid, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - w * 0.10, cy - h * 0.058, eyeR * 0.35 * eyeLid, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.12, cy - h * 0.058, eyeR * 0.35 * eyeLid, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.strokeStyle = 'rgba(150,90,60,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.03);
    ctx.quadraticCurveTo(cx - 6, cy + h * 0.04, cx, cy + h * 0.05);
    ctx.stroke();

    // Mustache (signature)
    ctx.fillStyle = '#ededed';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.14, cy + h * 0.08);
    ctx.quadraticCurveTo(cx - w * 0.05, cy + h * 0.10, cx, cy + h * 0.09);
    ctx.quadraticCurveTo(cx + w * 0.05, cy + h * 0.10, cx + w * 0.14, cy + h * 0.08);
    ctx.quadraticCurveTo(cx + w * 0.08, cy + h * 0.13, cx, cy + h * 0.12);
    ctx.quadraticCurveTo(cx - w * 0.08, cy + h * 0.13, cx - w * 0.14, cy + h * 0.08);
    ctx.fill();

    // Mouth — opens with state.mouthOpen
    const mo = Math.max(0, Math.min(1, state.mouthOpen || 0));
    const mouthY = cy + h * 0.16;
    ctx.fillStyle = '#5a2a22';
    ctx.beginPath();
    ctx.ellipse(cx, mouthY, w * 0.045, h * 0.012 + h * 0.04 * mo, 0, 0, Math.PI * 2);
    ctx.fill();
    // teeth hint
    if (mo > 0.15) {
      ctx.fillStyle = '#f4ece0';
      ctx.fillRect(cx - w * 0.035, mouthY - h * 0.005, w * 0.07, h * 0.008 + h * 0.012 * mo);
    }

    ctx.restore();
  }

  function drawHairTufts(ctx, cx, cy, w, h, highlight) {
    const r = w * 0.36;
    const baseY = cy - h * 0.22;
    const tufts = [
      [-0.42, -0.18, 0.18, 0.18],
      [-0.30, -0.30, 0.22, 0.22],
      [-0.12, -0.36, 0.22, 0.20],
      [ 0.08, -0.38, 0.24, 0.22],
      [ 0.28, -0.32, 0.20, 0.22],
      [ 0.40, -0.20, 0.18, 0.20],
      [-0.40,  0.00, 0.16, 0.20],
      [ 0.40,  0.00, 0.16, 0.20]
    ];
    for (const [dx, dy, rx, ry] of tufts) {
      ctx.beginPath();
      ctx.ellipse(cx + dx * w, baseY + dy * h * 0.6 + h * 0.06, rx * w * (highlight ? 0.7 : 1), ry * h * (highlight ? 0.6 : 1), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Schedule periodic blinks: return a stop() function. */
  function startBlinking(stateRef) {
    let stopped = false;
    function scheduleNext() {
      if (stopped) return;
      const delay = 2400 + Math.random() * 3200;
      setTimeout(function () {
        if (stopped) return;
        // blink envelope ~180ms
        const start = performance.now();
        function step() {
          if (stopped) return;
          const t = (performance.now() - start) / 180;
          if (t >= 1) { stateRef.blink = 0; scheduleNext(); return; }
          stateRef.blink = Math.sin(t * Math.PI);
          requestAnimationFrame(step);
        }
        step();
      }, delay);
    }
    scheduleNext();
    return function () { stopped = true; };
  }

  /** Schedule subtle head tilt oscillation. */
  function startTiltBreathing(stateRef) {
    let stopped = false;
    const start = performance.now();
    function step() {
      if (stopped) return;
      const t = (performance.now() - start) / 1000;
      stateRef.tilt = Math.sin(t * 0.6) * 0.6 + Math.sin(t * 0.23) * 0.4;
      requestAnimationFrame(step);
    }
    step();
    return function () { stopped = true; };
  }

  /** Main exported factory.
   *  opts.canvas — required if using canvas (drawn cartoon)
   *  opts.imageEl — alternatively, an <img> to animate (subtle scale + glow)
   *  Returns an object with .speak/.stop/.replay/.setMuted/.setRate/.setPitch.
   *  When imageEl is provided the canvas drawing is skipped entirely. */
  function create(opts) {
    opts = opts || {};
    const canvas = opts.canvas;
    const imageEl = opts.imageEl;
    if (!canvas && !imageEl) throw new Error('EinsteinAvatar.create: canvas or imageEl option is required');
    const dpr = global.devicePixelRatio || 1;

    const useCanvas = !!canvas && !imageEl;
    let ctx = null;
    if (useCanvas) {
      const resizeCanvas = function () {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
      };
      resizeCanvas();
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }

    const state = { mouthOpen: 0, blink: 0, tilt: 0 };
    let speaking = false;
    let muted = false;
    let rate = 0.95;
    let pitch = 0.95;
    let currentUtterance = null;
    let mouthAnimRAF = null;
    let lastSpoken = '';

    const stopBlinks = startBlinking(state);
    const stopTilt = startTiltBreathing(state);

    function renderLoop() {
      if (useCanvas && ctx) {
        const rect = canvas.getBoundingClientRect();
        drawEinstein(ctx, rect.width, rect.height, state);
      }
      // Image mode: keep static, no breathing animation (was causing flicker).
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    function startMouthAnim() {
      // Pseudo-amplitude: combine sine + jitter so lips move while speaking.
      const start = performance.now();
      function step() {
        if (!speaking) { state.mouthOpen = 0; mouthAnimRAF = null; return; }
        const t = (performance.now() - start) / 1000;
        const env = 0.45 + 0.55 * (0.6 + 0.4 * Math.sin(t * 7.5));
        const jitter = (Math.random() - 0.5) * 0.25;
        state.mouthOpen = Math.max(0, Math.min(1, env + jitter * env));
        mouthAnimRAF = requestAnimationFrame(step);
      }
      step();
    }

    function speak(text, speakOpts) {
      speakOpts = speakOpts || {};
      lastSpoken = text;
      return new Promise(function (resolve, reject) {
        if (!global.speechSynthesis) return resolve();
        if (muted || !text || !text.trim()) return resolve();

        // Cancel anything currently speaking
        try { global.speechSynthesis.cancel(); } catch (e) { /* noop */ }

        whenVoicesReady().then(function () {
          const u = new SpeechSynthesisUtterance(text);
          const voice = pickVoice(global.EinsteinAvatar.preferredVoices || DEFAULT_VOICE_PREFS);
          if (voice) u.voice = voice;
          u.lang = (voice && voice.lang) || 'en-GB';
          u.rate = speakOpts.rate || rate;
          u.pitch = speakOpts.pitch || pitch;
          u.volume = speakOpts.volume == null ? 1 : speakOpts.volume;
          u.onstart = function () {
            speaking = true;
            (canvas ? canvas.parentNode : (imageEl && imageEl.parentNode)) && (canvas ? canvas.parentNode : imageEl.parentNode).classList.add('speaking');
            startMouthAnim();
          };
          u.onend = function () {
            speaking = false;
            (canvas ? canvas.parentNode : (imageEl && imageEl.parentNode)) && (canvas ? canvas.parentNode : imageEl.parentNode).classList.remove('speaking');
            resolve();
          };
          u.onerror = function (ev) {
            speaking = false;
            (canvas ? canvas.parentNode : (imageEl && imageEl.parentNode)) && (canvas ? canvas.parentNode : imageEl.parentNode).classList.remove('speaking');
            // Don't reject — UI should continue gracefully.
            resolve();
          };
          currentUtterance = u;
          try { global.speechSynthesis.speak(u); }
          catch (e) { resolve(); }
        });
      });
    }

    function stop() {
      try { global.speechSynthesis.cancel(); } catch (e) { /* noop */ }
      speaking = false;
      state.mouthOpen = 0;
      (canvas ? canvas.parentNode : (imageEl && imageEl.parentNode)) && (canvas ? canvas.parentNode : imageEl.parentNode).classList.remove('speaking');
    }

    function setMuted(v) { muted = !!v; if (muted) stop(); }
    function setRate(v) { rate = Math.max(0.5, Math.min(1.6, v)); }
    function setPitch(v) { pitch = Math.max(0.5, Math.min(1.6, v)); }
    function replay() { return speak(lastSpoken); }
    let resizeT;
    if (useCanvas) {
      global.addEventListener('resize', function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(function () {
          const oldRect = canvas.getBoundingClientRect();
          canvas.width = Math.max(1, Math.round(oldRect.width * dpr));
          canvas.height = Math.max(1, Math.round(oldRect.height * dpr));
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }, 80);
      });
    }
    const api = {
      speak: speak, stop: stop, replay: replay,
      setMuted: setMuted, setRate: setRate, setPitch: setPitch,
      isSpeaking: function () { return speaking; },
      destroy: function () { stopBlinks(); stopTilt(); stop(); }
    };
    if (typeof opts.onReady === 'function') {
      whenVoicesReady().then(function () { opts.onReady(api); });
    }
    return api;
  }
  global.EinsteinAvatar = {
    create: create,
    preferredVoices: DEFAULT_VOICE_PREFS.slice(),
    imagePath: null
  };
})(window);
