/* Aerial Capture Photography — main.js
   Header scroll state, mobile nav, gallery lightbox. Vanilla JS, no deps. */
(function () {
  'use strict';

  /* ---------------- Header: solid background after scrolling past the top ---- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Contact form: mail-client fallback ----------------------
     No form backend is wired up yet, so hand the message to the visitor's mail
     client rather than posting it into a void. Delete this block once the form
     action points at a real endpoint. */
  var contactForm = document.querySelector('form[data-mailto-fallback]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = contactForm.getAttribute('data-mailto-fallback');
      var name = (contactForm.querySelector('#name') || {}).value || '';
      var email = (contactForm.querySelector('#email') || {}).value || '';
      var message = (contactForm.querySelector('#message') || {}).value || '';
      var subject = name ? 'Shoot inquiry from ' + name : 'Shoot inquiry';
      var body = message + '\n\n—\n' + (name ? name + '\n' : '') + email;
      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      var note = contactForm.querySelector('.form-sent');
      if (!note) {
        note = document.createElement('p');
        note.className = 'form-sent';
        contactForm.appendChild(note);
      }
      note.textContent = 'Opening your email app — send the message from there and it lands in my inbox.';
    });
  }

  /* ---------------- Mobile nav toggle --------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close the menu when a link is chosen or focus leaves via Escape
    document.querySelectorAll('.site-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------------- Lightbox ------------------------------------------------ */
  // Works on any page: collects anchors marked data-lightbox (gallery grid and
  // home mosaic). Full-size image loads only when the lightbox opens.
  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (!links.length) return;

  var lb, lbImg, lbCaption, lbCounter, btnPrev, btnNext, btnClose;
  var current = -1;
  var lastFocus = null;

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<figure>' +
      '  <img alt="">' +
      '  <figcaption><span class="lb-counter"></span><span class="lb-text"></span></figcaption>' +
      '</figure>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close viewer">' +
      '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous photo">' +
      '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next photo">' +
      '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' +
      '</button>';
    document.body.appendChild(lb);

    lbImg = lb.querySelector('img');
    lbCaption = lb.querySelector('.lb-text');
    lbCounter = lb.querySelector('.lb-counter');
    btnClose = lb.querySelector('.lb-close');
    btnPrev = lb.querySelector('.lb-prev');
    btnNext = lb.querySelector('.lb-next');

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(current - 1); });
    btnNext.addEventListener('click', function () { show(current + 1); });

    // Click on the dark backdrop (not the photo or buttons) closes
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.tagName === 'FIGURE') close();
    });

    // Touch swipe: horizontal swipe changes photo, ignores mostly-vertical moves
    var touchX = null, touchY = null;
    lb.addEventListener('touchstart', function (e) {
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      touchX = touchY = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        show(dx < 0 ? current + 1 : current - 1);
      }
    }, { passive: true });
  }

  function altFor(link) {
    var img = link.querySelector('img');
    return (img && img.getAttribute('alt')) || '';
  }

  function show(index) {
    current = (index + links.length) % links.length; // wrap around
    var link = links[current];
    var alt = altFor(link);
    lbImg.src = link.getAttribute('href');
    lbImg.alt = alt;
    lbCaption.textContent = alt;
    lbCounter.textContent = (current + 1) + ' / ' + links.length;

    // Preload neighbours so prev/next feel instant
    [current + 1, current - 1].forEach(function (i) {
      var n = links[(i + links.length) % links.length];
      var pre = new Image();
      pre.src = n.getAttribute('href');
    });
  }

  function open(index) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    show(index);
    lb.classList.add('open');
    document.body.classList.add('lb-lock');
    btnClose.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    lb.classList.remove('open');
    document.body.classList.remove('lb-lock');
    lbImg.src = '';
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

  // Keep Tab cycling inside the dialog while it is open
  function trapFocus(e) {
    var focusables = [btnClose, btnPrev, btnNext];
    var idx = focusables.indexOf(document.activeElement);
    if (e.shiftKey) {
      if (idx <= 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
    } else {
      if (idx === focusables.length - 1 || idx === -1) { e.preventDefault(); focusables[0].focus(); }
    }
  }

  links.forEach(function (link, i) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      open(i);
    });
  });
})();
