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

## Formspree placeholder — ACTION REQUIRED before launch

The contact form posts to `https://formspree.io/f/PLACEHOLDER`. Create a free form at
formspree.io (point it at aerialcapturephotography@gmail.com), then replace `PLACEHOLDER`
in `contact.html` with the real form ID. Until then the form will not deliver.

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

## Deploy notes

- Any static host works: Hostinger's plain static hosting, Netlify, Cloudflare Pages,
  GitHub Pages, S3. Upload the contents of this folder as the web root.
- DNS stays at Hostinger — just point the domain (A/CNAME) at wherever this is hosted.
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
