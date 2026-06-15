/* EE Cockpit Cinematic Intro — robust, compact build.
 * Plays Tour/einstein-intro.mp4 fullscreen with narrated captions,
 * then calls opts.onDone() and exposes a floating mentor button.
 * Also provides aimPointer / hidePointer used by tour.js. */
(function (g) {
  'use strict';
  var KEY = 'eeCockpit_introCompleted';
  var LINES = [
    { kicker: 'EE COCKPIT', heading: 'Welcome, Executive Engineer.', caption: 'I am Albert Einstein, your guide through the EE Cockpit. Allow me a moment to walk you through it.' },
    { kicker: 'ORIENTATION', heading: 'Your division at a glance.', caption: 'Revenue, operations, people, finance, safety, governance — every system that runs under your signature.' },
    { kicker: 'INTERACTIVE', heading: 'Eighteen modules. One cockpit.', caption: 'Each menu opens a focused workspace. I will show you each one in turn.' }
  ];

  function el(t, a, k) {
    var n = document.createElement(t);
    if (a) Object.keys(a).forEach(function (key) {
      if (key === 'class') n.className = a[key];
      else if (key === 'style') n.style.cssText = a[key];
      else n.setAttribute(key, a[key]);
    });
    (k || []).forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  // Chrome/Edge bug workaround: speech stops after ~14s of speaking.
  // Keep nudging resume() to prevent pause.
  if (g.speechSynthesis && !g.__eeSpeechKeepAlive) {
    g.__eeSpeechKeepAlive = setInterval(function () {
      try { if (g.speechSynthesis.speaking) g.speechSynthesis.resume(); } catch (e) {}
    }, 5000);
  }
  function speak(text) {
    return new Promise(function (resolve) {
      if (!g.speechSynthesis) return resolve();
      try { g.speechSynthesis.cancel(); } catch (e) {}
      var u = new SpeechSynthesisUtterance(text);
      var v = g.speechSynthesis.getVoices();
      var pref = v.find(function (x) { return /daniel|microsoft george|google uk english male|microsoft ryan/i.test(x.name); })
              || v.find(function (x) { return /en[-_]/i.test(x.lang) && /male|ryan|george|david|alex/i.test(x.name); })
              || v.find(function (x) { return /en[-_]/i.test(x.lang); });
      if (pref) { u.voice = pref; u.lang = pref.lang; } else u.lang = 'en-GB';
      u.rate = 0.88; u.pitch = 0.95;
      u.onend = resolve; u.onerror = resolve;
      try { g.speechSynthesis.speak(u); } catch (e) { resolve(); }
    });
  }

  function playIntro(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var ov = el('div', { id: 'eeCinematic', role: 'dialog' });
      var vid = el('video', { id: 'eeFigure', src: opts.videoPath || 'Tour/einstein-intro.mp4', autoplay: '', muted: '', playsinline: '', loop: '' });
      vid.muted = true; vid.loop = true; try { vid.play().catch(function(){}); } catch(e){}
      var ttl = el('div', { class: 'ee-cine-title' }, [el('div', { class: 'ee-cine-kicker' }), el('h1', { class: 'ee-cine-heading' })]);
      var cap = el('div', { class: 'ee-cine-caption' }, [el('div', { class: 'ee-cine-caption-name' }, ['Albert Einstein']), el('div', { class: 'ee-cine-caption-text' })]);
      var skip = el('button', { class: 'ee-cine-btn', type: 'button', style: 'pointer-events:auto !important; cursor:pointer; position:relative; z-index:99999;' }, ['Skip Intro →']);
      var mute = el('button', { class: 'ee-cine-btn', type: 'button', style: 'pointer-events:auto !important; cursor:pointer; position:relative; z-index:99999;' }, ['Mute']);
      var ctrls = el('div', { class: 'ee-cine-controls' }, [mute, skip]);
      ov.appendChild(vid); ov.appendChild(ttl); ov.appendChild(cap); ov.appendChild(ctrls);
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('visible'); vid.classList.add('entered'); ttl.classList.add('visible'); cap.classList.add('visible'); });

      try { var pr = new SpeechSynthesisUtterance(' '); pr.volume = 0; g.speechSynthesis.speak(pr); } catch (e) {}

      var done = false, muted = false;
      function finish() {
        if (done) return; done = true;
        try { g.speechSynthesis.cancel(); } catch (e) {}
        ov.classList.remove('visible');
        try { localStorage.setItem(KEY, '1'); } catch (e) {}
        setTimeout(function () {
          if (ov.parentNode) ov.parentNode.removeChild(ov);
          showMentor(opts.imagePath || 'Tour/einstein.png');
          if (typeof opts.onDone === 'function') opts.onDone();
          resolve();
        }, 700);
      }
      skip.addEventListener('click', finish);
      mute.addEventListener('click', function () { muted = !muted; mute.textContent = muted ? 'Unmute' : 'Mute'; if (muted) try { g.speechSynthesis.cancel(); } catch(e){} });

      function setLine(i) {
        var L = LINES[i]; if (!L) return null;
        ttl.querySelector('.ee-cine-kicker').textContent = L.kicker;
        ttl.querySelector('.ee-cine-heading').textContent = L.heading;
        cap.querySelector('.ee-cine-caption-text').textContent = L.caption;
        return L;
      }

      (async function () {
        await new Promise(function (r) { setTimeout(r, 200); });
        for (var i = 0; i < LINES.length; i++) {
          if (done) return;
          var L = setLine(i);
          // Restart the video on each slide change so video stays fresh.
          try { vid.currentTime = 0; vid.play().catch(function(){}); } catch(e){}
          if (muted) {
            // No voice: use caption-length-based readtime
            await new Promise(function (r) { setTimeout(r, Math.max(6000, 60 * L.caption.length)); });
          } else {
            var startMs = Date.now();
            await speak(L.heading + '. ' + L.caption);
            var spoke = Date.now() - startMs;
            if (spoke < 1200) {
              // Voice was blocked/missing — fall back to readtime
              await new Promise(function (r) { setTimeout(r, Math.max(6000, 60 * L.caption.length) - spoke); });
            }
          }
          if (done) return;
          await new Promise(function (r) { setTimeout(r, 600); });
        }
        finish();
      })();
    });
  }

  var pointerEl = null, beamEl = null;
  function ensurePointer() {
    if (pointerEl) return;
    pointerEl = el('div', { id: 'eePointer' });
    pointerEl.innerHTML = '<svg viewBox="0 0 32 32"><circle class="ring2" cx="16" cy="16" r="14"/><circle class="ring1" cx="16" cy="16" r="9"/><circle class="core" cx="16" cy="16" r="4"/></svg>';
    document.body.appendChild(pointerEl);
    beamEl = el('div', { id: 'eeBeam' });
    beamEl.innerHTML = '<svg style="position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none"><defs><linearGradient id="eeBeamGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#06b6d4"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><line class="beam-line" x1="0" y1="0" x2="0" y2="0"/></svg>';
    document.body.appendChild(beamEl);
  }
  function aimPointer(target) {
    ensurePointer();
    if (!target || !target.getBoundingClientRect) { hidePointer(); return; }
    var r = target.getBoundingClientRect();
    var tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    pointerEl.style.transform = 'translate(' + (tx - 13) + 'px,' + (ty - 13) + 'px)';
    pointerEl.classList.add('visible', 'pulse');
    var from = document.getElementById('eeMentor') || document.querySelector('.ee-avatar-canvas-wrap');
    if (from) {
      var fr = from.getBoundingClientRect();
      var line = beamEl.querySelector('.beam-line');
      line.setAttribute('x1', fr.left + fr.width / 2);
      line.setAttribute('y1', fr.top + fr.height / 2);
      line.setAttribute('x2', tx); line.setAttribute('y2', ty);
      beamEl.classList.add('visible');
    }
  }
  function hidePointer() {
    if (pointerEl) pointerEl.classList.remove('visible', 'pulse');
    if (beamEl) beamEl.classList.remove('visible');
  }

  var mentorEl = null;
  function showMentor(p) {
    if (!mentorEl) {
      mentorEl = el('div', { id: 'eeMentor', role: 'button', tabindex: '0', 'aria-label': 'Open guided tour' }, [el('img', { src: p || 'Tour/einstein.png', alt: 'Einstein' })]);
      mentorEl.addEventListener('click', function () { if (g.EECockpitTour) g.EECockpitTour.start(); });
      document.body.appendChild(mentorEl);
    }
    mentorEl.classList.add('visible'); document.body.classList.add('ee-mentor-visible');
  }
  function hideMentor() { if (mentorEl) mentorEl.classList.remove('visible'); document.body.classList.remove('ee-mentor-visible'); }

  g.EECockpitCinematic = {
    play: playIntro, aimPointer: aimPointer, hidePointer: hidePointer,
    showMentor: showMentor, hideMentor: hideMentor,
    hasIntroPlayed: function () { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } },
    resetIntro: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})(window);

