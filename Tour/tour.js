/* EE Cockpit Tour Orchestrator — compact rewrite v3.
 * Auto-discovers menus via [data-tour]; falls back to common nav patterns.
 * Spotlight + glowing menu + Einstein avatar (image mode or canvas).
 * Auto-advances after speech ends, with an enforced minimum on-screen time. */
(function (g) {
  'use strict';
  var KEY = 'eeCockpit_tourCompleted';

  function el(t, a, k) {
    var n = document.createElement(t);
    if (a) Object.keys(a).forEach(function (key) {
      if (key === 'class') n.className = a[key];
      else if (key === 'style') n.style.cssText = a[key];
      else if (key === 'html') n.innerHTML = a[key];
      else n.setAttribute(key, a[key]);
    });
    (k || []).forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function discoverSteps() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-tour]'));
    if (nodes.length === 0) {
      nodes = Array.prototype.slice.call(document.querySelectorAll('nav a, .menu-item, .sidebar-item, [role="menuitem"], header a'));
    }
    var steps = nodes.map(function (e, i) {
      return {
        el: e,
        id: e.getAttribute('data-tour') || 'step-' + i,
        title: e.getAttribute('data-tour-title') || (e.textContent || '').trim().slice(0, 60) || 'Section',
        desc: e.getAttribute('data-tour-desc') || 'Click here to open this section.',
        order: e.getAttribute('data-tour-order') != null ? parseFloat(e.getAttribute('data-tour-order')) : i + 1
      };
    }).filter(function (s) {
      var r = s.el.getBoundingClientRect();
      return s.el.offsetParent !== null && r.width > 0 && r.height > 0;
    });
    steps.sort(function (a, b) { return a.order - b.order; });
    return steps;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function positionFrame(fr, rect) {
    var w = fr.getBoundingClientRect();
    var vw = g.innerWidth, vh = g.innerHeight, gap = 16;
    var cands = [
      { left: rect.right + gap, top: clamp(rect.top, gap, vh - w.height - gap) },
      { left: rect.left - w.width - gap, top: clamp(rect.top, gap, vh - w.height - gap) },
      { left: clamp(rect.left, gap, vw - w.width - gap), top: rect.bottom + gap },
      { left: clamp(rect.left, gap, vw - w.width - gap), top: rect.top - w.height - gap }
    ];
    var ok = cands.find(function (c) { return c.left >= gap && c.top >= gap && c.left + w.width <= vw - gap && c.top + w.height <= vh - gap; });
    var ch = ok || cands[2];
    fr.style.left = Math.max(gap, ch.left) + 'px';
    fr.style.top = Math.max(gap, ch.top) + 'px';
  }

  function Tour() {
    this.steps = []; this.index = 0;
    this.paused = false; this.muted = false;
    this.avatar = null; this.nodes = {};
    this.faqAnswer = (g.EinsteinFAQ && g.EinsteinFAQ.answer) || function () { return Promise.resolve('FAQ not loaded.'); };
  }
  Tour.prototype.build = function () {
    var self = this;
    self.nodes.help = el('button', { class: 'ee-help-btn', 'aria-label': 'Open EE Cockpit Tour' }, [el('span', { class: 'ee-help-pulse' }), '?']);
    self.nodes.help.addEventListener('click', function () { self.start(); });
    document.body.appendChild(self.nodes.help);

    self.nodes.overlay = el('div', { class: 'ee-spotlight-overlay hidden ee-tour-root' });
    self.nodes.spot = el('div', { class: 'ee-spotlight ee-tour-root' });
    document.body.appendChild(self.nodes.overlay);
    document.body.appendChild(self.nodes.spot);
    self.nodes.overlay.style.display = 'none';
    self.nodes.spot.style.display = 'none';

    self.nodes.caption = el('div', { class: 'ee-caption hidden ee-tour-root', 'aria-live': 'polite' });
    document.body.appendChild(self.nodes.caption);

    var imgPath = (g.EinsteinAvatar && g.EinsteinAvatar.imagePath) || null;
    var canvas = null, img = null, child;
    if (imgPath) { img = el('img', { class: 'ee-avatar-img', src: imgPath, alt: 'Albert Einstein' }); child = img; }
    else { canvas = el('canvas', { class: 'ee-avatar-canvas' }); child = canvas; }
    self.nodes.canvasWrap = el('div', { class: 'ee-avatar-canvas-wrap' }, [child]);
    self.nodes.title = el('h3', { class: 'ee-bubble-title' });
    self.nodes.text = el('p', { class: 'ee-bubble-text' });
    self.nodes.progress = el('div', { class: 'ee-progress' }, ['Step 1 of 1']);

    self.nodes.btnPrev = el('button', { class: 'ee-btn', type: 'button' }, ['← Prev']);
    self.nodes.btnNext = el('button', { class: 'ee-btn ee-btn-primary', type: 'button' }, ['Next →']);
    self.nodes.btnPause = el('button', { class: 'ee-btn', type: 'button' }, ['⏸ Pause']);
    self.nodes.btnMute = el('button', { class: 'ee-btn', type: 'button' }, ['🔇 Mute']);
    self.nodes.btnReplay = el('button', { class: 'ee-btn', type: 'button' }, ['↻ Replay']);
    self.nodes.btnSkip = el('button', { class: 'ee-btn ee-btn-skip', type: 'button' }, ['Skip']);
    self.nodes.btnPrev.addEventListener('click', function () { self.prev(); });
    self.nodes.btnNext.addEventListener('click', function () { self.next(); });
    self.nodes.btnPause.addEventListener('click', function () { self.togglePause(); });
    self.nodes.btnMute.addEventListener('click', function () { self.toggleMute(); });
    self.nodes.btnReplay.addEventListener('click', function () { self.goto(self.index); });
    self.nodes.btnSkip.addEventListener('click', function () { self.stop(true); });

    self.nodes.input = el('input', { class: 'ee-chat-input', type: 'text', placeholder: 'Ask Einstein a question…' });
    self.nodes.send = el('button', { class: 'ee-chat-send', type: 'button' }, ['Ask']);
    self.nodes.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); self.handleAsk(); } });
    self.nodes.send.addEventListener('click', function () { self.handleAsk(); });

    var head = el('div', { class: 'ee-avatar-head' }, [self.nodes.canvasWrap,
      el('div', {}, [el('div', { class: 'ee-avatar-name' }, ['Albert Einstein']), el('div', { class: 'ee-avatar-role' }, ['Your guide'])]),
      self.nodes.progress]);
    var bubble = el('div', { class: 'ee-bubble' }, [el('span', { class: 'ee-bubble-caret' }), self.nodes.title, self.nodes.text]);
    var ctrls = el('div', { class: 'ee-controls' }, [self.nodes.btnPrev, self.nodes.btnNext, self.nodes.btnPause, self.nodes.btnMute, self.nodes.btnReplay, self.nodes.btnSkip]);
    var chat = el('div', { class: 'ee-chat' }, [el('div', { class: 'ee-chat-label' }, ['Ask Einstein']), el('div', { class: 'ee-chat-row' }, [self.nodes.input, self.nodes.send])]);

    self.nodes.frame = el('div', { class: 'ee-avatar-frame hidden ee-tour-root', role: 'dialog' }, [head, bubble, ctrls, chat]);
    document.body.appendChild(self.nodes.frame);

    self.avatar = g.EinsteinAvatar.create(canvas ? { canvas: canvas } : { imageEl: img });

    document.addEventListener('keydown', function (e) {
      if (!self.isOpen()) return;
      if (e.key === 'Escape') self.stop(true);
      else if (e.key === 'ArrowRight') self.next();
      else if (e.key === 'ArrowLeft') self.prev();
    });
    g.addEventListener('resize', function () { self.refreshLayout(); });
  };

  Tour.prototype.isOpen = function () { return this.nodes.frame && !this.nodes.frame.classList.contains('hidden'); };

  Tour.prototype.start = function () {
    this.steps = discoverSteps();
    if (!this.steps.length) this.steps = [{ el: document.body, id: 'welcome', title: 'Welcome', desc: 'Tag elements with data-tour to define the tour sequence.', order: 1 }];
    this.index = 0;
    this.nodes.overlay.style.display = ''; this.nodes.spot.style.display = '';
    this.nodes.overlay.classList.remove('hidden');
    this.nodes.frame.classList.remove('hidden');
    this.nodes.caption.classList.remove('hidden');
    this.goto(0);
  };

  Tour.prototype.stop = function (markCompleted) {
    if (this._autoTimer) { clearTimeout(this._autoTimer); this._autoTimer = null; }
    if (this._glow) { this._glow.classList.remove('ee-tour-active'); this._glow = null; }
    if (g.EECockpitCinematic && g.EECockpitCinematic.hidePointer) g.EECockpitCinematic.hidePointer();
    if (this.avatar) this.avatar.stop();
    this.nodes.overlay.classList.add('hidden');
    this.nodes.frame.classList.add('hidden');
    this.nodes.caption.classList.add('hidden');
    var self = this;
    setTimeout(function () { self.nodes.overlay.style.display = 'none'; self.nodes.spot.style.display = 'none'; }, 400);
    if (markCompleted) { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
  };

  Tour.prototype.goto = function (i) {
    if (i < 0 || i >= this.steps.length) return;
    this.index = i;
    var s = this.steps[i];
    this.nodes.title.textContent = s.title;
    this.nodes.text.textContent = s.desc;
    this.nodes.caption.textContent = s.desc;
    this.nodes.progress.textContent = 'Step ' + (i + 1) + ' of ' + this.steps.length;
    this.nodes.btnPrev.disabled = i === 0;
    this.nodes.btnNext.textContent = i === this.steps.length - 1 ? 'Finish' : 'Next →';
    var target = s.el;
    try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    var self = this;
    if (self._autoTimer) { clearTimeout(self._autoTimer); self._autoTimer = null; }
    setTimeout(function () {
      var r = target.getBoundingClientRect();
      self.nodes.spot.style.top = (r.top - 8) + 'px';
      self.nodes.spot.style.left = (r.left - 8) + 'px';
      self.nodes.spot.style.width = (r.width + 16) + 'px';
      self.nodes.spot.style.height = (r.height + 16) + 'px';
      if (self._glow && self._glow !== target) self._glow.classList.remove('ee-tour-active');
      target.classList.add('ee-tour-active');
      self._glow = target;
      if (g.EECockpitCinematic && g.EECockpitCinematic.aimPointer) g.EECockpitCinematic.aimPointer(target);
      positionFrame(self.nodes.frame, target.getBoundingClientRect());

      var fullText = s.title + '. ' + s.desc;
      var stepStart = Date.now();
      var minMs = Math.min(30000, Math.max(20000, 8000 + s.desc.length * 80));
      function schedule(delay) {
        if (self._autoTimer) clearTimeout(self._autoTimer);
        self._autoTimer = setTimeout(function () { if (!self.paused && self.isOpen()) self.next(); }, delay);
      }
      function afterSpeech() { var rem = Math.max(800, minMs - (Date.now() - stepStart)); schedule(rem); }
      if (self.muted || self.paused || !self.avatar) schedule(minMs);
      else self.avatar.speak(fullText).then(afterSpeech);
    }, 320);
  };

  Tour.prototype.refreshLayout = function () {
    if (!this.isOpen()) return;
    var s = this.steps[this.index]; if (!s) return;
    var r = s.el.getBoundingClientRect();
    this.nodes.spot.style.top = (r.top - 8) + 'px';
    this.nodes.spot.style.left = (r.left - 8) + 'px';
    this.nodes.spot.style.width = (r.width + 16) + 'px';
    this.nodes.spot.style.height = (r.height + 16) + 'px';
    positionFrame(this.nodes.frame, r);
  };

  Tour.prototype.next = function () { if (this.index >= this.steps.length - 1) this.stop(true); else this.goto(this.index + 1); };
  Tour.prototype.prev = function () { if (this.index > 0) this.goto(this.index - 1); };
  Tour.prototype.togglePause = function () {
    this.paused = !this.paused;
    this.nodes.btnPause.textContent = this.paused ? '▶ Resume' : '⏸ Pause';
    if (this.paused) { if (this._autoTimer) clearTimeout(this._autoTimer); if (this.avatar) this.avatar.stop(); }
    else this.goto(this.index);
  };
  Tour.prototype.toggleMute = function () {
    this.muted = !this.muted;
    this.nodes.btnMute.textContent = this.muted ? '🔊 Unmute' : '🔇 Mute';
    if (this.avatar) this.avatar.setMuted(this.muted);
  };
  Tour.prototype.handleAsk = function () {
    var q = (this.nodes.input.value || '').trim(); if (!q) return;
    this.nodes.input.value = '';
    var self = this;
    Promise.resolve(this.faqAnswer(q)).then(function (ans) {
      self.nodes.title.textContent = 'Ask Einstein';
      self.nodes.text.textContent = ans;
      self.nodes.caption.textContent = ans;
      if (!self.muted && self.avatar) self.avatar.speak(ans);
    });
  };

  var _t = new Tour(); var _built = false;
  function init(o) {
    o = o || {};
    if (!_built) { _t.build(); _built = true; }
    var done = false; try { done = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (o.autoStart !== false && !done) setTimeout(function () { _t.start(); }, 600);
    return _t;
  }
  g.EECockpitTour = {
    init: init,
    start: function () { if (!_built) { _t.build(); _built = true; } _t.start(); },
    stop: function () { _t.stop(false); },
    next: function () { _t.next(); },
    prev: function () { _t.prev(); },
    replay: function () { _t.goto(_t.index); },
    discover: discoverSteps,
    setFaqAnswer: function (fn) { _t.faqAnswer = fn; },
    resetCompletion: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})(window);
