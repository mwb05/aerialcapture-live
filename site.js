/* Aerial Capture Photography - shared script for the five preview pages (index, portfolio,
   services, about, contact). Every block checks that its section is on the page first.

   Video pacing (2026-11-17, Matt: "videos on the reel are jumping"): the hero film and the reel
   used to change clips on a wall-clock timer while each <video> looped on its own. A clip that
   started late or stalled while buffering wrapped back to its first frame on screen before the
   timer cut away, and the progress bars ran ahead of the picture. Both players are now paced by
   the clip itself: the bar is the clip's currentTime, the crossfade starts FADE seconds before
   the clip ends, a clip never loops, and the next clip only fades in once it has frames to show. */
(function () {
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n, w) { n = String(Math.max(0, Math.round(n))); while (n.length < (w || 2)) n = '0' + n; return n; };
  var play = function (v) { if (!v) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  var hasGsap = typeof window.gsap !== 'undefined';
  var MEDIA = 'media/', MEDIA_V = '?v=5'; // bump when the media is re-cut: files are cached for a day

  // Start fetching a clip that is still preload="none", so it is ready before its crossfade.
  function warm(v) { if (RM || !v || v.preload === 'auto') return; v.preload = 'auto'; if (v.readyState === 0) v.load(); }
  // Run fn once v can play through its next frames (or after 2.5 s, so a slow link never freezes the player).
  function whenReady(v, fn) {
    if (RM || v.readyState >= 3) { fn(); return; }
    var done = false;
    var go = function () { if (done) return; done = true; v.removeEventListener('canplay', go); fn(); };
    v.addEventListener('canplay', go);
    setTimeout(go, 2500);
  }
  // Seek to the first frame only when it is not already there (a seek on a playing clip is a visible hitch).
  function rewind(v) { if (v.readyState > 0 && v.currentTime > 0.05) { try { v.currentTime = 0; } catch (e) { /* not seekable yet */ } } }

  // ── preload: every film on the page is downloaded whole before the page is shown ──
  // (2026-11-17, Matt: "the videos are still jumping a little bit. can you have them load in before
  // the site loads"). Streaming a clip while it plays meant a slow patch of the link showed as a
  // hitch. Now each clip on the page (the phone cut on phones) is fetched in full, two at a time in
  // page order, and played from memory (a blob: URL), so playback never touches the network. The
  // screen lifts when all of them are in; on a slow link it lifts after WAIT_SOFT once the first
  // clip is in (WAIT_HARD at the latest) and the rest keep downloading and swap in while hidden.
  // A later page view reads the same files from the browser cache (they are cached for a day).
  var WAIT_SOFT = 20000, WAIT_HARD = 45000;
  function preloadFilms(done) {
    var screen = $('#preload'), root = document.documentElement;
    var vids = $$('.hero-media video, #stage video');
    var lifted = false;
    var lift = function () {
      if (lifted) return; lifted = true;
      if (screen) { screen.classList.add('lift'); setTimeout(function () { screen.remove(); }, 800); }
      root.classList.remove('preloading');
      done();
    };
    if (!screen || !vids.length || RM || !window.fetch || !window.URL || !window.Blob) { lift(); return; }
    var bar = $('#preloadBar'), pct = $('#preloadPct');
    // the <source> this browser would pick: the first whose media query matches
    var pick = function (v) {
      var ss = $$('source', v);
      for (var k = 0; k < ss.length; k++) { var m = ss[k].getAttribute('media'); if (!m || window.matchMedia(m).matches) return ss[k].getAttribute('src'); }
      return v.getAttribute('src');
    };
    var jobs = vids.map(function (v) { return { v: v, url: pick(v), size: 0, got: 0, ok: false }; }).filter(function (j) { return j.url; });
    if (!jobs.length) { lift(); return; }
    var show = function () {
      var size = 0, got = 0, unknown = 0;
      jobs.forEach(function (j) { if (j.size) { size += j.size; got += Math.min(j.got, j.size); } else unknown++; });
      // until every response has said how big it is, estimate the rest from the ones that have
      if (unknown && size) size += unknown * (size / (jobs.length - unknown));
      var p = size ? Math.min(1, got / size) : 0;
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      if (pct) pct.textContent = String(Math.floor(p * 100));
    };
    // swap the clip onto its in-memory copy (never under a clip that is on screen or starting to play)
    var attach = function (j, blobUrl) {
      var v = j.v;
      if (lifted && (v.classList.contains('on') || !v.paused)) { setTimeout(function () { attach(j, blobUrl); }, 1000); return; }
      $$('source', v).forEach(function (s) { s.remove(); });
      v.src = blobUrl; v.preload = 'auto'; v.load();
    };
    var fetchOne = function (j) {
      return fetch(j.url, { credentials: 'same-origin' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        j.size = Number(res.headers.get('Content-Length')) || 0;
        if (!res.body || !res.body.getReader) return res.blob();
        var reader = res.body.getReader(), parts = [];
        var pump = function () {
          return reader.read().then(function (r) {
            if (r.done) return new Blob(parts, { type: 'video/mp4' });
            parts.push(r.value); j.got += r.value.length; show(); return pump();
          });
        };
        return pump();
      }).then(function (blob) {
        j.got = j.size = j.size || blob.size; j.ok = true; show();
        attach(j, URL.createObjectURL(blob));
      }).catch(function () {
        // this clip streams from the network as before; it no longer holds the screen
        j.size = j.size || 1; j.got = j.size; j.ok = true; show();
      });
    };
    // two downloads at a time, in page order, so the clip shown first is in first
    var queue = jobs.slice(), running = 0, finished = 0;
    var firstReady = false, softHit = false;
    var check = function () {
      if (finished === jobs.length) { decodeFirst(); return; }
      if (softHit && firstReady) lift();
    };
    // let the first clip decode its opening frames from memory before the screen lifts
    var decodeFirst = function () {
      var v = jobs[0].v;
      if (v.readyState >= 3) { lift(); return; }
      v.addEventListener('canplaythrough', lift, { once: true });
      setTimeout(lift, 3000);
    };
    var next = function () {
      while (running < 2 && queue.length) {
        var j = queue.shift(); running++;
        fetchOne(j).then(function () {
          running--; finished++;
          if (jobs[0].ok) firstReady = true;
          check(); next();
        });
      }
    };
    setTimeout(function () { softHit = true; check(); }, WAIT_SOFT);
    setTimeout(lift, WAIT_HARD);
    show(); next();
  }

  function boot() {
  // ── nav: solid once the hero is behind us (always solid on pages without one), phone menu ──
  var nav = $('#nav');
  var heroEl = $('.hero');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('solid', !heroEl || window.scrollY > window.innerHeight * 0.6); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var menuBtn = $('#menuBtn');
    if (menuBtn) {
      var setMenu = function (open) {
        nav.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.documentElement.classList.toggle('menu-open', open);
      };
      menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
      window.matchMedia('(min-width: 1101px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
    }
  }

  // ── contact form (Contact): opens a filled-in email to the pilot, like the live site ──
  var cform = $('#contactForm');
  if (cform) {
    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cform.reportValidity()) return;
      var f = new FormData(cform);
      var get = function (k) { return String(f.get(k) || '').trim(); };
      var body = ['Name: ' + get('name'), 'Email: ' + get('email'), 'Shoot: ' + get('service'), 'Location: ' + get('location'),
        'Preferred date: ' + get('date'), '', get('message')].join('\n');
      var subject = 'Drone shoot request: ' + get('service') + (get('location') ? ' in ' + get('location') : '');
      var href = 'mailto:' + cform.getAttribute('data-mailto') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      try { window.top.location.href = href; } catch (err) { window.location.href = href; }
    });
  }

  // ── before / after (works without GSAP) ────────────────────────────────────────────
  var ba = $('#ba'), handle = $('#baHandle'), baPos = 50, baDemo = null;
  function setPos(p) {
    baPos = Math.max(0, Math.min(100, p));
    ba.style.setProperty('--pos', baPos + '%');
    handle.setAttribute('aria-valuenow', String(Math.round(baPos)));
  }
  if (ba) {
    var posFromEvent = function (e) { var r = ba.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
    ba.addEventListener('pointerdown', function (e) {
      if (baDemo) { baDemo.kill(); baDemo = null; }
      ba.setPointerCapture(e.pointerId); ba.classList.add('dragging'); setPos(posFromEvent(e));
    });
    ba.addEventListener('pointermove', function (e) { if (ba.classList.contains('dragging')) setPos(posFromEvent(e)); });
    var endDrag = function () { ba.classList.remove('dragging'); };
    ba.addEventListener('pointerup', endDrag); ba.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setPos(baPos - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setPos(baPos + step); e.preventDefault(); }
      else if (e.key === 'Home') { setPos(0); e.preventDefault(); }
      else if (e.key === 'End') { setPos(100); e.preventDefault(); }
      if (baDemo) { baDemo.kill(); baDemo = null; }
    });
    var PAIRS = [
      { before: 'pair-gt40-close.jpg', after: 'pair-gt40-high.jpg', l: 'Up close', r: 'From altitude',
        beforeAlt: 'The Gulf GT40 straight down from just above, nose to tail', afterAlt: 'The Gulf GT40 from high above, centered in an industrial lot' },
      { before: 'pair-skogafoss-face.jpg', after: 'pair-skogafoss-top.jpg', l: 'Face on', r: 'Straight down',
        beforeAlt: 'Skogafoss seen face on from the air, mist rising', afterAlt: 'Skogafoss from directly above, the river cutting through moss' }
    ];
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var p = PAIRS[Number(t.getAttribute('data-pair'))];
        $$('.tab').forEach(function (o) { o.setAttribute('aria-selected', String(o === t)); });
        var b = $('.before', ba), a = $('.after', ba);
        var swap = function () {
          b.src = MEDIA + p.before + MEDIA_V; b.alt = p.beforeAlt; a.src = MEDIA + p.after + MEDIA_V; a.alt = p.afterAlt;
          $('#tagL').textContent = p.l; $('#tagR').textContent = p.r;
        };
        if (hasGsap && !RM) gsap.to([a, b], { opacity: 0, duration: 0.2, onComplete: function () { swap(); gsap.to([a, b], { opacity: 1, duration: 0.45, delay: 0.05 }); } });
        else swap();
      });
    });
  }

  if (!hasGsap) {
    // The CDN did not load: the page still reads, the slider still works, and the films still play.
    $$('.hero-media video.on, #stage video.on').forEach(function (v) { if (!RM) { v.loop = true; play(v); } });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  if (window.MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);
  // Phone address bars resize the viewport as they show and hide; refreshing every trigger on each
  // of those made pinned scenes jump. Only real width / orientation changes refresh now.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ── Lenis smooth scroll, wired into ScrollTrigger (MOTION.md) ───────────────────────
  var lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = $(id); if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.6, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
      else t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    });
  });

  // ── clip player: one set of stacked <video>s, paced by the playing clip's own clock ──
  // opts: videos, fade (s), onChange(i), bar(i) -> element to scale, enterFrom/leaveTo(dir) tween vars
  function ClipPlayer(opts) {
    var self = this, vids = opts.videos, i = 0, paused = false, inView = false, switching = false;
    vids.forEach(function (v) { v.loop = false; v.removeAttribute('loop'); });
    function cur() { return vids[i]; }
    // the progress bar follows the clip, so it stops when a slow link stalls the picture
    gsap.ticker.add(function () {
      var v = cur(), b = opts.bar(i);
      if (b && v.duration) gsap.set(b, { scaleX: Math.min(1, v.currentTime / v.duration) });
      if (!switching && inView && !paused && v.duration && v.currentTime >= v.duration - opts.fade) self.go(i + 1, 1);
    });
    vids.forEach(function (v, k) {
      // safety net if the tick missed the window (tab in the background): never sit on a dead frame
      v.addEventListener('ended', function () { if (k === i && !switching && !paused) self.go(i + 1, 1); });
    });
    this.index = function () { return i; };
    this.go = function (n, dir, instant) {
      var prev = cur();
      var next = (n + vids.length) % vids.length;
      if (next === i && !instant) return;
      i = next;
      var v = cur();
      opts.onChange(i, prev, v);
      if (v === prev) { queueNext(v); return; }
      switching = true;
      warm(v); rewind(v);
      if (inView && !paused && !RM) play(v);
      // fade in only once the clip has frames, so the picture never freezes on a poster mid-fade
      whenReady(v, function () {
        if (cur() !== v) return; // a newer pick took over; it does the fade
        v.classList.add('on');
        var d = instant || RM ? 0 : opts.fade;
        gsap.fromTo(v, opts.enterFrom(dir || 1), Object.assign({ opacity: 1, duration: d, overwrite: true }, opts.enterTo));
        // fade out whatever is showing (after quick clicks that can be more than one clip)
        var out = vids.filter(function (x) { return x !== v && x.classList.contains('on'); });
        if (!out.length || !d) {
          out.forEach(function (x) { gsap.set(x, { opacity: 0 }); x.classList.remove('on'); x.pause(); });
          switching = false;
        } else {
          gsap.to(out, Object.assign({ opacity: 0, duration: d, overwrite: true, onComplete: function () {
            out.forEach(function (x) { if (x !== cur()) { x.classList.remove('on'); x.pause(); } });
            if (cur() === v) switching = false;
          } }, opts.leaveTo(dir || 1)));
        }
      });
      queueNext(v);
    };
    // Buffer the next clip only once this one can play through, so two downloads never fight over
    // the connection while the visible clip is still loading (the reel also waits until it is in view).
    function queueNext(v) {
      var nx = vids[(vids.indexOf(v) + 1) % vids.length];
      var warmNext = function () { if (!opts.warmInViewOnly || inView) warm(nx); };
      if (v.readyState >= 4) warmNext(); else v.addEventListener('canplaythrough', warmNext, { once: true });
    }
    this.setPaused = function (p) { paused = p; if (p) cur().pause(); else if (inView && !RM) play(cur()); };
    this.setInView = function (on) {
      inView = on;
      if (on && opts.warmInViewOnly) { warm(cur()); if (cur().readyState >= 4) warm(vids[(i + 1) % vids.length]); }
      if (paused) return;
      if (on && !RM) play(cur()); else cur().pause();
    };
    this.isPaused = function () { return paused; };
  }

  // ── hero: background film (Home only) ───────────────────────────────────────────────
  var hero = heroEl, flight = null, heroPlayer = null;
  if (hero) {
    var hv = $$('.hero-media video'), chapters = $$('.chapter');
    heroPlayer = new ClipPlayer({
      // opacity only: scaling a playing 1080p layer while a second one decodes under it juddered
      videos: hv, fade: 1.4,
      bar: function (k) { return chapters[k] && $('.bar i', chapters[k]); },
      onChange: function (k) {
        chapters.forEach(function (c, j) { c.classList.toggle('on', j === k); if (j !== k) gsap.set($('.bar i', c), { scaleX: j < k ? 1 : 0 }); });
      },
      enterFrom: function () { return { opacity: 0 }; }, enterTo: { ease: 'power2.inOut' },
      leaveTo: function () { return { ease: 'power2.inOut' }; }
    });
    chapters.forEach(function (c, k) { c.addEventListener('click', function () { heroPlayer.go(k, 1); }); });
    var heroPauseBtn = $('#heroPause');
    var setHeroPaused = function (p) {
      heroPauseBtn.setAttribute('aria-pressed', String(p));
      $('span', heroPauseBtn).textContent = p ? 'Play film' : 'Pause film';
      heroPlayer.setPaused(p);
      if (flight) { if (p) flight.pause(); else flight.resume(); }
    };
    heroPauseBtn.addEventListener('click', function () { setHeroPaused(!heroPlayer.isPaused()); });

    // ── hero: drone flight path with depth (MotionPathPlugin math, CSS 3D tilt) ────────
    if (!RM && window.MotionPathPlugin) {
      var svg = $('.flight svg'), route = $('#flightPath'), trail = $('#flightTrail');
      var rig = $('.rig'), tilt = $('.tilt'), craft = $('.craft'), shade = $('.rig-shadow');
      var raw = MotionPathPlugin.getRawPath(route); MotionPathPlugin.cacheRawPathMeasurements(raw);
      var L = trail.getTotalLength();
      trail.style.strokeDasharray = L + ' ' + L; trail.style.strokeDashoffset = L;
      var last = null, bank = 0, started = performance.now();
      var altEl = $('#alt'), spdEl = $('#spd'), hdgEl = $('#hdg'), tcEl = $('#tc');
      var setRig = { x: gsap.quickSetter(rig, 'x', 'px'), y: gsap.quickSetter(rig, 'y', 'px') };
      var setCraft = { r: gsap.quickSetter(craft, 'rotation', 'deg'), s: gsap.quickSetter(craft, 'scale') };
      var setTilt = gsap.quickSetter(tilt, 'rotationY', 'deg');
      var state = { p: 0 };
      // svg -> hero coordinates, measured on resize only (no layout reads per frame); the HUD text
      // is redrawn ten times a second instead of every frame.
      var geo = null, hudAt = 0;
      var measure = function () {
        var m = svg.getScreenCTM(), hr = hero.getBoundingClientRect();
        geo = m && { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e - hr.left, f: m.f - hr.top };
      };
      window.addEventListener('resize', measure); ScrollTrigger.addEventListener('refresh', measure);
      var place = function () {
        var p = state.p;
        var pos = MotionPathPlugin.getPositionOnPath(raw, p, true);
        if (!geo) measure(); if (!geo) return;
        var x = geo.a * pos.x + geo.c * pos.y + geo.e, y = geo.b * pos.x + geo.d * pos.y + geo.f;
        // depth: far at the edges, sweeping close past the camera after the first waypoint
        var depth = 0.38 + 0.95 * Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.08)), 1.6);
        var turn = 0;
        if (last) { turn = pos.angle - last.angle; if (turn > 180) turn -= 360; if (turn < -180) turn += 360; }
        bank += (Math.max(-28, Math.min(28, turn * 18)) - bank) * 0.08;
        setRig.x(x); setRig.y(y);
        setCraft.r(pos.angle + 90); setCraft.s(depth);
        setTilt(bank);
        gsap.set(shade, { y: 34 + 70 * depth, scale: 0.6 + depth * 0.7, opacity: 0.25 + 0.35 * (1 - depth / 1.4) });
        trail.style.strokeDashoffset = String(L * (1 - p));
        var dist = last ? Math.hypot(x - last.x, y - last.y) : 0;
        var now = performance.now();
        if (now - hudAt > 100) {
          hudAt = now;
          altEl.textContent = pad(420 - 300 * (depth - 0.38) / 0.95, 3);
          spdEl.textContent = pad(Math.min(48, 14 + dist * 4.2), 2);
          hdgEl.textContent = pad(((pos.angle + 90) % 360 + 360) % 360, 3);
          var secs = (now - started) / 1000;
          tcEl.textContent = pad(secs / 3600) + ':' + pad((secs / 60) % 60) + ':' + pad(secs % 60);
        }
        last = { x: x, y: y, angle: pos.angle };
      };
      flight = gsap.timeline({ repeat: -1, paused: true })
        .to(state, { p: 1, duration: 15, ease: 'power1.inOut', onUpdate: place })
        .set(state, { p: 0 }).call(function () { last = null; trail.style.strokeDashoffset = L; });
    }

    // Pause the hero's work when it is off screen.
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top',
      onToggle: function (st) {
        heroPlayer.setInView(st.isActive);
        if (!flight) return;
        if (st.isActive) { if (!heroPlayer.isPaused()) flight.resume(); } else flight.pause();
      } });

    // ── hero entrance: split-text headline (SplitText, chars in masks) ─────────────────
    var heroEntrance = function () {
      heroPlayer.setInView(true);
      heroPlayer.go(0, 1, true);
      if (RM || !window.SplitText) return;
      var split = SplitText.create('#headline', { type: 'words,chars', mask: 'chars' });
      gsap.timeline({ delay: 0.15 })
        .from(split.chars, { yPercent: 118, duration: 1.05, ease: 'power4.out', stagger: 0.022 }, 0.2)
        .from('[data-hero-rise]', { y: 26, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.75)
        .from('.hud', { opacity: 0, duration: 0.8 }, 1.1)
        .to('.rig', { opacity: 1, duration: 0.6 }, 1)
        .call(function () { flight && flight.play(); }, null, 0.9);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(heroEntrance); else heroEntrance();
  }

  // ── cursor follower: camera reticle in the hero only ───────────────────────────────
  if (FINE && hero) {
    var ret = $('.reticle'), dot = $('.reticle-dot');
    var lag = RM ? 0.01 : 0.38;
    var rx = gsap.quickTo(ret, 'x', { duration: lag, ease: 'power3' }), ry = gsap.quickTo(ret, 'y', { duration: lag, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.05 }), dy = gsap.quickTo(dot, 'y', { duration: 0.05 });
    var inHero = false, lastY = -1;
    var checkHero = function () {
      var r = hero.getBoundingClientRect();
      var now = lastY >= r.top && lastY <= r.bottom;
      if (now !== inHero) { inHero = now; gsap.to([ret, dot], { opacity: now ? 1 : 0, duration: 0.2, overwrite: 'auto' }); }
    };
    window.addEventListener('pointermove', function (e) {
      lastY = e.clientY; checkHero();
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    window.addEventListener('scroll', checkHero, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { inHero = false; gsap.to([ret, dot], { opacity: 0, duration: 0.2 }); });
    $$('.hero a, .hero button').forEach(function (el) {
      el.addEventListener('pointerenter', function () { gsap.to(ret, { scale: 1.7, rotation: 45, duration: 0.25, ease: 'power2.out' }); });
      el.addEventListener('pointerleave', function () { gsap.to(ret, { scale: 1, rotation: 0, duration: 0.25, ease: 'power2.out' }); });
    });
  }

  // ── magnetic buttons ───────────────────────────────────────────────────────────────
  if (!RM && FINE) {
    var mags = $$('[data-magnetic]');
    var S = 0.32, REACH = 70, MAX = 16;
    var clamp = function (v) { return Math.max(-MAX, Math.min(MAX, v)); };
    var release = function (b) { b._in = false; gsap.to([b, b.firstElementChild], { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }); };
    window.addEventListener('pointermove', function (e) {
      // only the nearest button in reach leans, so neighbours never pile into each other
      var best = null, bestD = Infinity;
      mags.forEach(function (b) {
        var r = b.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
        var ox = e.clientX - (r.left + r.width / 2), oy = e.clientY - (r.top + r.height / 2);
        var edge = Math.hypot(Math.max(0, Math.abs(ox) - r.width / 2), Math.max(0, Math.abs(oy) - r.height / 2));
        if (edge < REACH && edge < bestD) { best = { b: b, ox: ox, oy: oy }; bestD = edge; }
      });
      mags.forEach(function (b) { if (b._in && (!best || best.b !== b)) release(b); });
      if (best) {
        var x = clamp(best.ox * S), y = clamp(best.oy * S);
        gsap.to(best.b, { x: x, y: y, duration: 0.4, ease: 'power3.out' });
        gsap.to(best.b.firstElementChild, { x: x * 0.35, y: y * 0.35, duration: 0.4, ease: 'power3.out' });
        best.b._in = true;
      }
    }, { passive: true });
    window.addEventListener('scroll', function () { mags.forEach(function (b) { if (b._in) release(b); }); }, { passive: true });
  }

  // ── reveals: section copy rises in once, statement words light up with scroll ──────
  if (!RM) {
    $$('[data-reveal]').forEach(function (s) {
      if (s.closest('.hero')) return;
      gsap.from(s.children, { y: 48, opacity: 0, duration: 0.95, ease: 'expo.out', stagger: 0.07,
        scrollTrigger: { trigger: s, start: 'top 82%', once: true } });
    });
    if ($('#say') && window.SplitText) {
      var say = SplitText.create('#say', { type: 'words' });
      gsap.fromTo(say.words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: '#say', start: 'top 78%', end: 'bottom 42%', scrub: true } });
    }
    if ($('.close img')) gsap.fromTo('.close img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.close', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  // ── work: pinned horizontal scroll (Portfolio) ─────────────────────────────────────
  if ($('.work')) {
    var mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', function () {
      var track = $('.work-track'), frames = $$('.frame'), count = $('#workCount'), n = frames.length;
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: '.work', scrub: 1, start: 'top top', end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: function (st) {
            gsap.set('.work-meta .prog i', { scaleX: st.progress });
            count.textContent = pad(1 + Math.round(st.progress * (n - 1))) + ' / ' + pad(n);
          } } });
      frames.forEach(function (f) {
        gsap.fromTo($('img', f), { xPercent: -6 }, { xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: f, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
    });
  }

  // ── reel: drone reel, drag / swipe / arrows / pick (Portfolio) ─────────────────────
  var stage = $('#stage');
  if (stage) {
    var rv = $$('video', stage), thumbs = $$('.thumb');
    var reel = new ClipPlayer({
      videos: rv, fade: 1, warmInViewOnly: true,
      bar: function (k) { return thumbs[k] && $('.bar i', thumbs[k]); },
      onChange: function (k, prev, v) {
        thumbs.forEach(function (t, j) {
          t.classList.toggle('on', j === k); t.setAttribute('aria-selected', String(j === k));
          if (j !== k) gsap.set($('.bar i', t), { scaleX: 0 });
        });
        $('#reelMove').textContent = thumbs[k].getAttribute('data-move');
        $('#reelTitle').textContent = thumbs[k].getAttribute('data-title');
        if (v !== prev && !RM) gsap.fromTo('.stage-info > div:first-child', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', delay: 0.25 });
      },
      // a short slide in the direction of travel; no scale, so the decoder is not also resampling a zoom
      enterFrom: function (dir) { return { opacity: 0, xPercent: RM ? 0 : 4 * dir }; }, enterTo: { xPercent: 0, ease: 'power3.inOut' },
      leaveTo: function (dir) { return { xPercent: RM ? 0 : -4 * dir, ease: 'power3.inOut' }; }
    });
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { reel.go(k, k >= reel.index() ? 1 : -1); }); });
    $('#reelPrev').addEventListener('click', function () { reel.go(reel.index() - 1, -1); });
    $('#reelNext').addEventListener('click', function () { reel.go(reel.index() + 1, 1); });
    var reelPauseBtn = $('#reelPause');
    reelPauseBtn.addEventListener('click', function () {
      var p = !reel.isPaused();
      reel.setPaused(p);
      reelPauseBtn.setAttribute('aria-pressed', String(p));
      reelPauseBtn.setAttribute('aria-label', p ? 'Play reel' : 'Pause reel');
      reelPauseBtn.innerHTML = p
        ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="1.8"/></svg>';
    });
    // drag / swipe: the clip follows the finger, a long enough drag changes the shot
    var dragX = null, dragged = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      dragX = e.clientX; dragged = 0; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    });
    stage.addEventListener('pointermove', function (e) {
      if (dragX === null) return;
      dragged = e.clientX - dragX;
      gsap.to(rv[reel.index()], { x: dragged * 0.35, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    });
    var dragEnd = function () {
      if (dragX === null) return;
      stage.classList.remove('dragging');
      var d = dragged; dragX = null;
      gsap.to(rv[reel.index()], { x: 0, duration: 0.5, ease: 'power3.out' });
      if (Math.abs(d) > 60) reel.go(reel.index() + (d < 0 ? 1 : -1), d < 0 ? 1 : -1);
    };
    stage.addEventListener('pointerup', dragEnd); stage.addEventListener('pointercancel', dragEnd);
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') reel.go(reel.index() + 1, 1); else if (e.key === 'ArrowLeft') reel.go(reel.index() - 1, -1);
    });
    reel.go(0, 1, true);
    ScrollTrigger.create({ trigger: stage, start: 'top 85%', end: 'bottom 10%', onToggle: function (st) { reel.setInView(st.isActive); } });
  }

  // ── before / after: one automated sweep when it first comes into view ──────────────
  if (ba && !RM) {
    var o = { p: 50 };
    ScrollTrigger.create({ trigger: ba, start: 'top 70%', once: true, onEnter: function () {
      baDemo = gsap.timeline({ onComplete: function () { baDemo = null; } })
        .to(o, { p: 82, duration: 1.1, ease: 'power3.inOut', onUpdate: function () { setPos(o.p); } })
        .to(o, { p: 18, duration: 1.4, ease: 'power3.inOut', onUpdate: function () { setPos(o.p); } })
        .to(o, { p: 50, duration: 1.0, ease: 'power3.inOut', onUpdate: function () { setPos(o.p); } });
    } });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  // with the page already loaded by the time the films are in, refresh the triggers now too
  if (document.readyState === 'complete') ScrollTrigger.refresh();
  }

  preloadFilms(boot);
})();
