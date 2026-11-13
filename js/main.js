/* Aerial Capture Photography — main.js
   Cinematic scroll engine. Vanilla JS; GSAP + ScrollTrigger (CDN, deferred) add the
   scrubbed pinning effects when present. Everything degrades: no GSAP → IntersectionObserver
   reveals only; reduced motion → static page. */
(function () {
  'use strict';

  var body = document.body;
  var header = document.querySelector('.site-header');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // WCAG 2.2.2: every looping video can be paused with the hero's pause button (motion-toggle).
  var motionPaused = reduced;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 821px)').matches;
  var hasGsap = !reduced && typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Phone browsers resize the viewport as the address bar shows/hides; refreshing pins on every
    // one of those makes the pinned scenes jump. Only refresh on real orientation/width changes.
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------------- Smooth scroll (Lenis, desktop pointers only) ---------------------- */
  // Touch devices keep native momentum scrolling; Lenis only eases wheel/trackpad input and is
  // driven off GSAP's ticker so every ScrollTrigger scene stays in lockstep with it.
  var lenis = null;
  if (hasGsap && finePointer && typeof window.Lenis === 'function') {
    try {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } catch (err) { lenis = null; }
  }
  function lockScroll(on) { if (lenis) { if (on) lenis.stop(); else lenis.start(); } }
  // Same-page anchors (#book, index.html#services ...) glide instead of jumping.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.target === '_blank') return;
    var url = new URL(a.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash || url.hash === '#main') return;
    var target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', url.hash);
  });

  /* ---------------- Loaded state: letterbox bars open once the hero paints ------------ */
  function markLoaded() {
    if (body.classList.contains('is-loaded')) return;
    body.classList.add('is-loaded');
    // once the HUD's 1.1s + 1.2s load fade is done, drop its transition so the scroll fade is 1:1
    var hud = document.querySelector('.hud');
    if (hud) setTimeout(function () { hud.classList.add('is-scrubbing'); }, 2500);
  }
  var heroImg = document.querySelector('.hero-img img');
  var heroVideo = document.querySelector('.vhero-video');
  var heroPhoto = document.querySelector('.vhero-photo');
  if (heroVideo) {
    if (reduced) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
    if (heroVideo.readyState >= 2) setTimeout(markLoaded, 150);
    else {
      heroVideo.addEventListener('loadeddata', markLoaded);
      heroVideo.addEventListener('error', markLoaded);
      setTimeout(markLoaded, 1400); // the poster is already painted; never wait long on the video
    }
  } else if (heroPhoto && !heroPhoto.complete) {
    heroPhoto.addEventListener('load', markLoaded);
    heroPhoto.addEventListener('error', markLoaded);
    setTimeout(markLoaded, 1400);
  } else if (heroImg && !heroImg.complete) {
    heroImg.addEventListener('load', markLoaded);
    heroImg.addEventListener('error', markLoaded);
    setTimeout(markLoaded, 1800); // never hold the page hostage to a slow image
  } else {
    setTimeout(markLoaded, 200);
  }

  /* ---------------- Header: glass on scroll, hide on scroll-down, progress bar -------- */
  var progress = document.querySelector('.progress');
  var lastY = window.scrollY;
  var solid = header.classList.contains('solid');
  var mqMobile = window.matchMedia('(max-width: 820px)');
  var navOpen = false;
  var idleTimer = 0;
  function revealHeader() { header.classList.remove('is-hidden'); }
  function onScroll() {
    var y = window.scrollY;
    if (!solid) header.classList.toggle('scrolled', y > 24);
    // Never pull the header (and the menu button with it) off-screen while the menu is open.
    if (!navOpen) {
      if (y > lastY + 8 && y > 480) header.classList.add('is-hidden');
      else if (y < lastY - 8 || y <= 480) revealHeader();
      // On phones the hamburger is the ONLY way to navigate, so it can't stay hidden:
      // bring the header back as soon as the finger stops moving.
      if (mqMobile.matches) { clearTimeout(idleTimer); idleTimer = setTimeout(revealHeader, 220); }
    }
    lastY = y;
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile nav ----------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  function setNav(open) {
    navOpen = open;
    header.classList.toggle('nav-open', open);
    body.classList.toggle('nav-lock', open);
    lockScroll(open);
    // The open panel is anchored to the header, so the header must be parked at the top.
    clearTimeout(idleTimer);
    if (open) revealHeader();
    lastY = window.scrollY;
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeNav() { setNav(false); }
  if (toggle) {
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      setNav(!header.classList.contains('nav-open'));
    });
    document.querySelectorAll('.site-nav a').forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) { closeNav(); toggle.focus(); }
    });
    // Rotating to landscape / resizing past the desktop breakpoint hides the panel but used to
    // leave body.nav-lock on, freezing the page. Close it when we leave the mobile layout.
    var onMq = function () { if (!mqMobile.matches && navOpen) closeNav(); };
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', onMq);
    else if (mqMobile.addListener) mqMobile.addListener(onMq);
  }

  /* ---------------- Custom cursor (desktop only) ----------------------------------------- */
  var cursor = document.querySelector('.cursor');
  if (cursor && finePointer && !reduced) {
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy, shown = false;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cx = tx; cy = ty; body.classList.add('has-cursor'); }
    }, { passive: true });
    document.addEventListener('mouseleave', function () { body.classList.remove('has-cursor'); shown = false; });
    (function tick() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(tick);
    })();
    document.addEventListener('mouseover', function (e) {
      var play = e.target.closest('.reel-item');
      var view = play || e.target.closest('[data-lightbox], a.frame, .depth-layer');
      var link = e.target.closest('a, button, [role="button"], input, textarea, label');
      cursor.setAttribute('data-label', play ? 'Play' : 'View');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
    });
  }

  /* ---------------- Hero title: split into characters for the staggered rise -------------- */
  var charIndex = 0;
  document.querySelectorAll('.vhero-title .split').forEach(function (line) {
    var text = line.textContent;
    line.textContent = '';
    text.split('').forEach(function (c) {
      if (c === ' ') { line.appendChild(document.createTextNode(' ')); return; }
      var s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--d', charIndex++);
      s.textContent = c;
      line.appendChild(s);
    });
  });

  /* ---------------- Hero HUD: running timecode (video clock, or a plain clock over a still) */
  var hudTc = document.querySelector('.hud-tc');
  var hudAlt = document.querySelector('.hud-alt-n');
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  if ((heroVideo || heroPhoto) && hudTc && !reduced) {
    var tcClock = 0, tcLast = performance.now();
    (function tc() {
      var now = performance.now();
      if (!motionPaused) tcClock += (now - tcLast) / 1000;
      tcLast = now;
      if (window.scrollY < window.innerHeight * 2) {
        var t = heroVideo ? (heroVideo.currentTime || 0) : tcClock, s = Math.floor(t);
        hudTc.textContent = '00:' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60) + ':' + pad2(Math.floor((t - s) * 24));
      }
      requestAnimationFrame(tc);
    })();
  }

  /* ---------------- Hero scene: the camera pulls back and the frame tilts away ------------ */
  // Created before every other ScrollTrigger so its pin spacing is in place when the scenes
  // further down the page measure their start/end positions.
  var vhero = document.querySelector('.vhero');
  if (vhero && hasGsap) {
    var vFrame = vhero.querySelector('.vhero-frame');
    var vTl = window.gsap.timeline({ defaults: { ease: 'none' } });
    vTl.to('.vhero-content', { y: -110, opacity: 0, duration: 0.45 }, 0)
      .to('.vhero-scroll', { opacity: 0, duration: 0.15 }, 0)
      .fromTo(vFrame,
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', rotateX: 0, scale: 1, y: 0, transformPerspective: 1400 },
        { clipPath: desktop ? 'inset(10% 8% 3% 8% round 28px)' : 'inset(14% 5% 3% 5% round 18px)',
          rotateX: desktop ? 16 : 9, scale: 0.9, y: -30, duration: 1 }, 0)
      // The HUD's own opacity belongs to its CSS load fade; scroll drives a separate variable.
      .fromTo('.hud', { '--hud-fade': 1 }, { '--hud-fade': 0, duration: 0.35 }, 0.55);
    window.ScrollTrigger.create({
      trigger: vhero, start: 'top top', end: desktop ? '+=95%' : '+=60%',
      pin: true, scrub: 0.8, animation: vTl, anticipatePin: 1,
      onUpdate: function (self) { if (hudAlt) hudAlt.textContent = String(Math.round(120 + Math.min(1, self.progress / 0.55) * 280)); }
    });
  }

  /* ---------------- Reveal on enter (IntersectionObserver) -------------------------------- */
  var revealables = document.querySelectorAll('[data-reveal], .lines, .curtain, .gallery-grid .ph, .frame');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- Statement: split into words, light them up with scroll --------------- */
  var statement = document.querySelector('.statement');
  var statementText = document.querySelector('.statement-text');
  if (statementText) {
    var walker = document.createTreeWalker(statementText, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    var words = statementText.querySelectorAll('.w');
    if (hasGsap) {
      window.ScrollTrigger.create({
        trigger: statement,
        start: 'top 75%',
        end: 'bottom 55%',
        scrub: true,
        onUpdate: function (self) {
          var lit = Math.round(self.progress * words.length);
          words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
        }
      });
    } else {
      statement.classList.add('no-scrub');
    }
  }

  /* ---------------- GSAP scenes: hero parallax, depth fly-through, filmstrip ------------- */
  if (hasGsap) {
    var gsap = window.gsap, ST = window.ScrollTrigger;

    // Hero: the photo drifts and the copy lifts away
    var hero = document.querySelector('.hero');
    if (hero) {
      gsap.to('.hero-img', { yPercent: 16, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-content', { y: -80, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true } });
    }

    // Sections swing up into place: a short 3D tilt-and-rise scrubbed to the scroll.
    var sceneIn = function (el) {
      gsap.fromTo(el,
        { y: desktop ? 90 : 50, rotateX: desktop ? 10 : 6, scale: 0.97, opacity: 0.2, transformPerspective: 1400, transformOrigin: '50% 0%' },
        { y: 0, rotateX: 0, scale: 1, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 58%', scrub: 0.6 } });
    };
    var depthEl = document.querySelector('.depth');
    var belowPins = function (el) { return depthEl && (depthEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING); };
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    // Scenes above the pinned fly-through are created now; the rest after its pins (below).
    scenes.filter(function (el) { return !belowPins(el); }).forEach(sceneIn);

    // Parallax drift on single media blocks
    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-parallax')) || 8;
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Services: each card sinks back into the stack as the next one slides over it
    var cards = Array.prototype.slice.call(document.querySelectorAll('.stack-card'));
    cards.forEach(function (card, i) {
      var dim = document.createElement('div'); dim.className = 'stack-dim'; card.appendChild(dim);
      var next = cards[i + 1];
      if (!next) return;
      var st = { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true };
      gsap.to(card, { scale: 0.9 + i * 0.02, rotateX: desktop ? 7 : 4, transformPerspective: 1600, transformOrigin: '50% 0%', ease: 'none', scrollTrigger: st });
      gsap.to(dim, { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true } });
    });

    // Reel: each clip drifts inside its tile (the frame is 118% tall), alternating direction, so
    // the grid reads as layered depth without tiles ever crossing their gutters.
    var reelGrid = document.querySelector('.reel-grid');
    if (reelGrid) {
      reelGrid.querySelectorAll('.reel-item').forEach(function (el, i) {
        var v = el.querySelector('video'); if (!v) return;
        var s = (i % 2 ? -1 : 1) * (desktop ? 7 : 5);
        gsap.fromTo(v, { yPercent: -s, scale: 1.02 }, { yPercent: s, scale: 1.02, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    // Part 107 badge: the ring turns with the scroll instead of spinning on its own
    var ring = document.querySelector('.license-badge .ring');
    if (ring) {
      gsap.fromTo(ring, { rotation: -60, svgOrigin: '60 60' }, { rotation: 120, svgOrigin: '60 60', ease: 'none',
        scrollTrigger: { trigger: ring.closest('.license'), start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    // Depth: seven frames fly past the camera while the section is pinned
    var depth = document.querySelector('.depth');
    if (depth) {
      var layers = Array.prototype.slice.call(depth.querySelectorAll('.depth-layer'));
      var title = depth.querySelector('.depth-title');
      gsap.set(layers, { transformPerspective: 1100, xPercent: -50, yPercent: -50, force3D: true });
      var tl = gsap.timeline({ defaults: { ease: 'none' } });
      // Title lands in the first 12% of the pin (was 25%) so the hand-off from the statement above
      // isn't a long stretch of empty dark before anything appears.
      tl.fromTo(title, { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .12 }, 0)
        .to(title, { opacity: 0, scale: 1.04, duration: .2 }, .8);
      layers.forEach(function (layer, i) {
        var offset = i * 0.09;
        tl.fromTo(layer, { z: -1800, opacity: 0 }, {
          keyframes: [
            { z: -500, opacity: 1, duration: .38 },
            { z: 250, duration: .3 },
            { z: 820, opacity: 0, duration: .12 }
          ]
        }, offset);
      });
      // Phones get a shorter pin: the same seven frames at 2.6 screens of scroll was a long dark stretch.
      ST.create({ trigger: depth, start: 'top top', end: desktop ? '+=260%' : '+=170%', pin: true, scrub: 1.1, animation: tl, anticipatePin: 1 });
    } else {
      // no-op
    }

    // Filmstrip: vertical scroll becomes horizontal travel (desktop only; mobile swipes natively)
    var strip = document.querySelector('.filmstrip');
    if (strip && desktop) {
      var viewport = strip.querySelector('.filmstrip-viewport');
      var track = strip.querySelector('.filmstrip-track');
      var bar = strip.querySelector('.filmstrip-bar i');
      var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: viewport, start: 'top top', end: function () { return '+=' + distance(); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress + ')'; }
        }
      });
      // frames reveal as they travel into view: the IntersectionObserver above already
      // watches .frame, and it measures post-transform rects, so nothing extra is needed here.
    } else if (strip) {
      strip.classList.add('no-scrub');
    }

    // Everything below the pins, now that their spacing exists
    scenes.filter(belowPins).forEach(sceneIn);
    var bookBg = document.querySelector('.book-bg');
    if (bookBg) {
      gsap.fromTo(bookBg, { yPercent: -8 }, { yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: bookBg.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    window.addEventListener('load', function () { ST.refresh(); });
  } else {
    var d = document.querySelector('.depth'); if (d) d.classList.add('is-static');
    var s = document.querySelector('.filmstrip'); if (s) s.classList.add('no-scrub');
    document.querySelectorAll('.frame').forEach(function (f) { f.classList.add('is-in'); });
  }

  /* ---------------- In-page video: load when near, play while visible -------------------- */
  // Every clip ships preload="none" with its source in data-src, so the page only pulls the
  // few megabytes of footage the visitor actually scrolls to. Reduced motion keeps the posters.
  var autoVids = Array.prototype.slice.call(document.querySelectorAll('video[data-autoplay]'));
  function loadVid(v) {
    if (v.getAttribute('data-loaded')) return;
    v.querySelectorAll('source[data-src]').forEach(function (s) { s.src = s.getAttribute('data-src'); });
    v.setAttribute('data-loaded', '1');
    v.load();
  }
  function playVid(v) { if (motionPaused) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  if (autoVids.length && 'IntersectionObserver' in window && !reduced) {
    var vIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { loadVid(v); playVid(v); } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '150px 0px', threshold: 0.01 });
    autoVids.forEach(function (v) { vIo.observe(v); });
  }

  /* ---------------- Pause / play all background video (WCAG 2.2.2) ------------------------ */
  var motionBtn = document.querySelector('.motion-toggle');
  if (motionBtn) {
    var motionLabel = motionBtn.querySelector('.mt-label');
    var syncMotion = function () {
      motionLabel.textContent = motionPaused ? 'Play motion' : 'Pause motion';
      body.classList.toggle('motion-paused', motionPaused);
    };
    syncMotion();
    motionBtn.addEventListener('click', function () {
      motionPaused = !motionPaused;
      [heroVideo].concat(autoVids).forEach(function (v) {
        if (!v) return;
        if (motionPaused) v.pause();
        else if (v === heroVideo || v.getAttribute('data-loaded')) playVid(v);
      });
      syncMotion();
    });
  }

  /* ---------------- Video viewer for the reel -------------------------------------------- */
  var reelItems = Array.prototype.slice.call(document.querySelectorAll('.reel-item[data-full]'));
  if (reelItems.length) {
    var vlb = null, vlbVideo, vlbCap, vlbClose, vlbLast = null;
    var buildVlb = function () {
      vlb = document.createElement('div');
      vlb.className = 'vlb';
      vlb.setAttribute('role', 'dialog');
      vlb.setAttribute('aria-modal', 'true');
      vlb.setAttribute('aria-label', 'Video viewer');
      vlb.innerHTML =
        '<figure><video controls playsinline muted loop></video><figcaption></figcaption></figure>' +
        '<button type="button" class="lb-btn lb-close" aria-label="Close video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      document.body.appendChild(vlb);
      vlbVideo = vlb.querySelector('video');
      vlbCap = vlb.querySelector('figcaption');
      vlbClose = vlb.querySelector('.lb-close');
      vlbClose.addEventListener('click', closeVlb);
      vlb.addEventListener('click', function (e) { if (e.target === vlb || e.target.tagName === 'FIGURE') closeVlb(); });
    };
    var onVlbKey = function (e) {
      if (e.key === 'Escape') closeVlb();
      if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === vlbClose ? vlbVideo : vlbClose).focus(); }
    };
    var openVlb = function (item) {
      if (!vlb) buildVlb();
      vlbLast = item;
      vlbVideo.src = item.getAttribute('data-full');
      vlbVideo.poster = (item.querySelector('video') || {}).poster || '';
      vlbCap.textContent = '';
      var cat = document.createElement('span'); cat.textContent = item.getAttribute('data-cat') || '';
      vlbCap.appendChild(cat);
      vlbCap.appendChild(document.createTextNode(item.getAttribute('data-title') || ''));
      vlb.classList.add('open');
      body.classList.add('lb-lock');
      lockScroll(true);
      playVid(vlbVideo);
      vlbClose.focus();
      document.addEventListener('keydown', onVlbKey);
    };
    var closeVlb = function () {
      vlb.classList.remove('open');
      body.classList.remove('lb-lock');
      lockScroll(false);
      vlbVideo.pause();
      document.removeEventListener('keydown', onVlbKey);
      setTimeout(function () { if (!vlb.classList.contains('open')) { vlbVideo.removeAttribute('src'); vlbVideo.load(); } }, 450);
      if (vlbLast) vlbLast.focus();
    };
    reelItems.forEach(function (item) {
      var label = (item.getAttribute('data-title') || 'clip');
      item.setAttribute('aria-label', 'Play video: ' + label);
      item.addEventListener('click', function () { openVlb(item); });
    });
  }

  /* ---------------- Gallery filters ------------------------------------------------------- */
  var filterBtns = document.querySelectorAll('.filters [data-filter]');
  var photos = Array.prototype.slice.call(document.querySelectorAll('.gallery-grid .ph'));
  var emptyNote = document.querySelector('.gallery-empty');
  var total = document.querySelector('.gallery-total');
  if (total) total.textContent = String(photos.length);
  if (filterBtns.length && photos.length) {
    filterBtns.forEach(function (b) {
      var f = b.getAttribute('data-filter');
      var n = f === 'all' ? photos.length : photos.filter(function (p) { return p.getAttribute('data-cat') === f; }).length;
      var small = b.querySelector('small'); if (small) small.textContent = n;
      b.addEventListener('click', function () {
        filterBtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        var shown = 0;
        photos.forEach(function (p, i) {
          var hit = f === 'all' || p.getAttribute('data-cat') === f;
          p.classList.toggle('is-hidden', !hit);
          if (hit) { shown++; p.classList.remove('is-in'); setTimeout(function () { p.classList.add('is-in'); }, 30 + (shown % 12) * 45); }
        });
        if (emptyNote) emptyNote.classList.toggle('is-shown', shown === 0);
        if (hasGsap) window.ScrollTrigger.refresh();
      });
    });
  }

  /* ---------------- Contact form: mail-client fallback ----------------------------------- */
  var contactForm = document.querySelector('form[data-mailto-fallback]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = contactForm.getAttribute('data-mailto-fallback');
      var name = (contactForm.querySelector('#name') || {}).value || '';
      var email = (contactForm.querySelector('#email') || {}).value || '';
      var message = (contactForm.querySelector('#message') || {}).value || '';
      var service = (contactForm.querySelector('input[name="service"]:checked') || {}).value || '';
      var where = (contactForm.querySelector('#location') || {}).value || '';
      var when = (contactForm.querySelector('#date') || {}).value || '';
      var subject = (service ? service + ' inquiry' : 'Shoot inquiry') + (name ? ' from ' + name : '');
      var details = [service && 'Service: ' + service, where && 'Location: ' + where, when && 'Preferred date: ' + when].filter(Boolean).join('\n');
      var bodyText = (details ? details + '\n\n' : '') + message + '\n\n—\n' + (name ? name + '\n' : '') + email;
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText);
      var note = contactForm.querySelector('.form-sent');
      if (!note) { note = document.createElement('p'); note.className = 'form-sent'; contactForm.appendChild(note); }
      note.textContent = 'Opening your email app. Send the message from there and it lands in my inbox.';
    });
  }

  /* ---------------- Lightbox -------------------------------------------------------------- */
  var allLinks = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (!allLinks.length) return;

  var lb, lbImg, lbCaption, lbCounter, lbPlace, btnPrev, btnNext, btnClose;
  var links = allLinks, current = -1, lastFocus = null;

  function visibleLinks() {
    return allLinks.filter(function (a) { return !a.classList.contains('is-hidden'); });
  }

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<figure>' +
      '  <img alt="">' +
      '  <figcaption><span class="lb-counter"></span><span class="lb-place"></span><span class="lb-text"></span></figcaption>' +
      '</figure>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close viewer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
    document.body.appendChild(lb);

    lbImg = lb.querySelector('img');
    lbCaption = lb.querySelector('.lb-text');
    lbCounter = lb.querySelector('.lb-counter');
    lbPlace = lb.querySelector('.lb-place');
    btnClose = lb.querySelector('.lb-close');
    btnPrev = lb.querySelector('.lb-prev');
    btnNext = lb.querySelector('.lb-next');

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(current - 1); });
    btnNext.addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });
    lbImg.addEventListener('load', function () { lbImg.classList.add('is-ready'); });

    var touchX = null, touchY = null;
    lb.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
      touchX = touchY = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });
  }

  function altFor(link) { var img = link.querySelector('img'); return (img && img.getAttribute('alt')) || ''; }

  function show(index) {
    current = (index + links.length) % links.length;
    var link = links[current];
    lbImg.classList.remove('is-ready');
    lbImg.src = link.getAttribute('href');
    lbImg.alt = altFor(link);
    lbCaption.textContent = altFor(link);
    lbPlace.textContent = link.getAttribute('data-place') || '';
    lbCounter.textContent = (current + 1) + ' / ' + links.length;
    [current + 1, current - 1].forEach(function (i) {
      var n = links[(i + links.length) % links.length];
      var pre = new Image(); pre.src = n.getAttribute('href');
    });
  }

  function open(link) {
    if (!lb) buildLightbox();
    links = visibleLinks();
    lastFocus = document.activeElement;
    show(links.indexOf(link));
    lb.classList.add('open');
    body.classList.add('lb-lock');
    lockScroll(true);
    btnClose.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    lb.classList.remove('open');
    body.classList.remove('lb-lock');
    lockScroll(false);
    setTimeout(function () { if (!lb.classList.contains('open')) { lbImg.src = ''; lbImg.classList.remove('is-ready'); } }, 450);
    document.removeEventListener('keydown', onKey);
    if (lastFocus) lastFocus.focus();
  }

  function onKey(e) {
    switch (e.key) {
      case 'Escape': close(); break;
      case 'ArrowLeft': show(current - 1); break;
      case 'ArrowRight': show(current + 1); break;
      case 'Tab': trapFocus(e); break;
    }
  }

  function trapFocus(e) {
    var focusables = [btnClose, btnPrev, btnNext];
    var idx = focusables.indexOf(document.activeElement);
    if (e.shiftKey) { if (idx <= 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); } }
    else if (idx === focusables.length - 1 || idx === -1) { e.preventDefault(); focusables[0].focus(); }
  }

  allLinks.forEach(function (link) {
    link.addEventListener('click', function (e) { e.preventDefault(); open(link); });
  });
})();
