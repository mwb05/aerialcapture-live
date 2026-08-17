# Aerial Capture Photography — Static Site

Rebuilt 2026-08-15 from the old Hostinger website-builder site. Pure static HTML/CSS/JS —
no frameworks, no build step. Open `index.html` in a browser or drop the whole folder on
any static host.

## Contents

| Path | What it is |
|---|---|
| `index.html` | Home — full-viewport hero, intro/services, 7-photo teaser mosaic, contact CTA |
| `about.html` | About — Background / Featured Projects / Recent Projects, editorial layout |
| `gallery.html` | Gallery — 40-photo masonry grid with lightbox |
| `contact.html` | Contact — form + direct email + Instagram |
| `css/style.css` | All styling (dark cinematic theme, mobile-first, Inter via Google Fonts) |
| `js/main.js` | Header scroll state, mobile nav, lightbox (vanilla JS) |
| `assets/hero.jpg` | Home hero (2200px, the Gulf GT40 shot the old site also led with) |
| `assets/logo.png` | Original 200×200 logo, unchanged |
| `assets/full/*.jpg` | 46 photos at max 1600px wide, JPEG q82 — loaded only by the lightbox / content sections |
| `assets/thumb/*.jpg` | Same 46 photos at 480px wide, q78 — what the grids actually load |
| `favicon.svg` | Drone mark, dark rounded square + sky-blue glyph (works on light and dark tabs) |
| `sitemap.xml` | The 4 real pages only — the 6 leftover Hostinger pottery demo pages are gone |
| `robots.txt` | Allows all, points at the sitemap |

## Contact form — currently a mail-client handoff

There is no form backend yet, so the form does **not** post anywhere. On submit, `js/main.js`
opens the visitor's own email app with the subject and message prefilled to
aerialcapturephotography@gmail.com, and shows a line telling them to hit send. No message is
silently lost, but it does require the visitor to have a working mail client.

To upgrade to a real backend: create a free form at formspree.io pointed at
aerialcapturephotography@gmail.com, then in `contact.html` set
`action="https://formspree.io/f/<id>"` and delete the `data-mailto-fallback` attribute
(that attribute is what activates the fallback handler).

## Image optimization report

ImageMagick/ffmpeg weren't installed, so resizing was done with Windows' built-in GDI+
(System.Drawing, high-quality bicubic, EXIF orientation honored). Originals are untouched
in `..\assets\`.

| | Before | After |
|---|---|---|
| Source photos (46 + logo) | ~56 MB | — |
| Shipped `full/` tier (1600px, q82) | — | 16.8 MB |
| Shipped `thumb/` tier (480px, q78) | — | 1.6 MB |
| Hero (2200px) + logo | — | 0.55 MB |
| **Total site folder** | **56 MB source** | **≈19 MB** |

What a visitor actually downloads: the gallery page grid is ~1.6 MB of thumbnails
(lazy-loaded); full-size images load one at a time only when the lightbox opens. Home
first paint is the hero (~540 KB) + logo.

Filenames were normalized (hash suffixes stripped): e.g.
`dji_fly_20250421_184918_677_..._photo-m2Wq4gxKywT7v2oE.jpg` → `dji-fly-20250421-184918.jpg`.
The three 2022 hash-named uploads became `aerial-2022-01` … `aerial-2022-04`.

## Deploy — LIVE on GitHub Pages (as of 2026-08-16)

Production copy lives in `C:\ClaudeCode\websites\_deploy\aerialcapture-live\`, pushed to the
public repo **mwb05/aerialcapture-live**, served by GitHub Pages with a `CNAME` file claiming
`aerialcapturephotography.com`. To publish a change: copy the changed files into that folder,
then `git add -A && git commit -m "..." && git push` — Pages rebuilds in under a minute.

DNS to set at Hostinger (nameservers stay ns1/ns2.dns-parking.com):

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | mwb05.github.io |

Remove the old Hostinger A records (148.135.128.150, 92.112.198.193) and the old
`www → *.cdn.hstgr.net` CNAME. After propagation, GitHub issues a Let's Encrypt cert
automatically; then turn on "Enforce HTTPS" (or `gh api -X PUT repos/mwb05/aerialcapture-live/pages -F https_enforced=true`).

- Verified pre-cutover by resolving the domain to a GitHub Pages IP: home, gallery, and
  assets all returned 200 with the correct page title.
- Any other static host also works (Netlify, Cloudflare Pages, S3) — upload this folder as the web root.
- Canonical URLs and the sitemap assume `https://aerialcapturephotography.com` at the root.
- Old URLs `/about-us` and `/gallery` → if the host supports redirects, add
  `/about-us → /about.html`, `/gallery → /gallery.html`, `/contact → /contact.html`.
  (On Netlify: a `_redirects` file; on Apache: `.htaccess`.)
- Google Fonts (Inter) is the only external dependency.

## Content notes

- Voice normalized to first-person singular ("I") site-wide — the old home page said
  "our team" while About said "I"; it's clearly a solo operator.
- The old footer newsletter form was dropped intentionally (no evidence of a mailing list).
- og:image is the Varenna / Lake Como aerial (`assets/full/dji-fly-20250421-184918.jpg`) —
  the old site shipped an empty og:image tag.
- Alt text was written for every photo from actual image content (the old site had none).
