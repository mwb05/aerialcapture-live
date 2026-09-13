/* Aerial Capture Photography — main.js
   Cinematic scroll engine. Vanilla JS; GSAP + ScrollTrigger (CDN, deferred) add the
   scrubbed pinning effects when present. Everything degrades: no GSAP → IntersectionObserver
   reveals only; reduced motion → static page. */
(function () {
  'use strict';

  var body = document.body;
  var header = document.querySelector('.site-header');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 821px)').matches;
  var hasGsap = !reduced && typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Phone browsers resize the viewport as the address bar shows/hides; refreshing pins on every
    // one of those makes the pinned scenes jump. Only refresh on real orientation/width changes.
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------------- Loaded state: letterbox bars open once the hero paints ------------ */
  function markLoaded() { body.classList.add('is-loaded'); }
  var heroImg = document.querySelector('.hero-img img');
  if (heroImg && !heroImg.complete) {
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
  function onScroll() {
    var y = window.scrollY;
    if (!solid) header.classList.toggle('scrolled', y > 24);
    if (y > lastY + 8 && y > 480) header.classList.add('is-hidden');
    else if (y < lastY - 8 || y <= 480) header.classList.remove('is-hidden');
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
  function closeNav() {
    header.classList.remove('nav-open');
    body.classList.remove('nav-lock');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      body.classList.toggle('nav-lock', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.site-nav a').forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) { closeNav(); toggle.focus(); }
    });
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
      var view = e.target.closest('[data-lightbox], .frame, .depth-layer');
      var link = e.target.closest('a, button, [role="button"], input, textarea, label');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
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

    window.addEventListener('load', function () { ST.refresh(); });
  } else {
    var d = document.querySelector('.depth'); if (d) d.classList.add('is-static');
    var s = document.querySelector('.filmstrip'); if (s) s.classList.add('no-scrub');
    document.querySelectorAll('.frame').forEach(function (f) { f.classList.add('is-in'); });
  }

  /* ---------------- Chapters: sticky image follows the active chapter --------------------- */
  var chapters = document.querySelectorAll('.chapter');
  var chMedia = document.querySelector('.chapters-media');
  if (chapters.length && chMedia && 'IntersectionObserver' in window) {
    var chImgs = chMedia.querySelectorAll('img');
    var chNum = chMedia.querySelector('.ch-num');
    var chName = chMedia.querySelector('.ch-name');
    var setChapter = function (i) {
      chImgs.forEach(function (img) {
        var on = img.getAttribute('data-chapter') === String(i);
        if (on && img.loading === 'lazy') img.loading = 'eager'; // make sure the swap never shows a blank frame
        img.classList.toggle('is-active', on);
      });
      var next = chImgs[i + 1]; if (next && next.loading === 'lazy') next.loading = 'eager';
      if (chNum) chNum.textContent = String(i + 1).padStart(2, '0');
      if (chName) chName.textContent = chapters[i].getAttribute('data-name') || '';
    };
    var chIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setChapter(+en.target.getAttribute('data-index')); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    chapters.forEach(function (c) { chIo.observe(c); });
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
      var subject = name ? 'Shoot inquiry from ' + name : 'Shoot inquiry';
      var bodyText = message + '\n\n—\n' + (name ? name + '\n' : '') + email;
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
    btnClose.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    lb.classList.remove('open');
    body.classList.remove('lb-lock');
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
