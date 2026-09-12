# Aerial Capture Photography — Static Site (cinematic rebuild, 2026-09-12)

Pure static HTML/CSS/JS. No framework, no bundler. The one build step regenerates the gallery
grid from a manifest and validates the site; see **Build** below.

Rebuilt 2026-09-12 as a scroll-driven cinematic portfolio (v2). The 2026-08-15 v1 was a
conventional dark portfolio; every photo, alt text, and piece of copy carried over.

## Contents

| Path | What it is |
|---|---|
| `index.html` | Home: letterboxed hero, scroll-lit statement, pinned 3D fly-through, horizontal filmstrip, sticky-media chapters, services index, location marquee, CTA |
| `about.html` | About: three editorial rows with curtain-reveal images, brand band, CTA |
| `gallery.html` | Gallery: 46-photo masonry grid with category filters and a lightbox. **Grid is generated** between the `GALLERY:START/END` markers, do not hand-edit it |
| `contact.html` | Contact: underline form + direct email + Instagram |
| `css/style.css` | All styling. Dark cinematic theme, Inter + Instrument Serif, reduced-motion safe |
| `js/main.js` | Scroll engine: header, custom cursor, reveals, statement words, GSAP scenes, chapters, filters, lightbox, mail-client form fallback |
| `assets/hero.jpg` | Home hero (2200px, the Gulf GT40) |
| `assets/logo*.png` | Badge mark, stacked lockup, full lockup |
| `assets/full/*.jpg` | 46 photos at max 1600px wide (lightbox, feature sections) |
| `assets/thumb/*.jpg` | Same 46 at 480px wide (grids) |
| `sitemap.xml`, `robots.txt` | The 4 real pages |

## Motion model

- **GSAP 3.12 + ScrollTrigger** load from cdnjs (`defer`). They drive: hero parallax, the
  statement word-lighting, the pinned fly-through (`.depth`), and the pinned horizontal
  filmstrip (`.filmstrip`, desktop only).
- **If the CDN fails or `prefers-reduced-motion` is on**, `main.js` detects it and the page
  falls back to IntersectionObserver reveals, a quiet static collage for the fly-through, and a
  natively scrollable filmstrip. Nothing is hidden behind JS.
- Everything else (line-mask headings, curtain images, chapter swaps, filters, lightbox) is
  vanilla JS + CSS.

## Build

Source of truth for the photos: `..\_build\photos.json` (file, category, place, alt).

```powershell
node ..\_build\build.mjs          # validate + regenerate the gallery grid in site/
node ..\_build\build.mjs --sync   # ...and mirror site/ into ..\..\_deploy\aerialcapture-live\
```

The script reads real JPEG dimensions, writes the grid with correct width/height and
`data-cat` tags, checks every local `src`/`href`/`url()` resolves, checks each page has the
shared shell, and (with `--sync`) copies changed files into the GitHub Pages checkout while
leaving `.git`, `CNAME`, and `.nojekyll` alone. Logs from the 2026-09-12 rebuild are in
`..\_build\build-2026-09-12.log`.

## Contact form — currently a mail-client handoff

No form backend yet. On submit, `js/main.js` opens the visitor's mail app prefilled to
aerialcapturephotography@gmail.com. To upgrade: create a form at formspree.io, set
`action="https://formspree.io/f/<id>"` in `contact.html`, and delete `data-mailto-fallback`.

## Deploy — LIVE on GitHub Pages

Production checkout: `C:\ClaudeCode\websites\_deploy\aerialcapture-live\`, pushed to the public
repo **mwb05/aerialcapture-live**, served by GitHub Pages with a `CNAME` for
`aerialcapturephotography.com`. Publish: run the build with `--sync`, then in that folder
`git add -A && git commit -m "..." && git push`. Pages rebuilds in under a minute.

DNS at Hostinger (nameservers stay ns1/ns2.dns-parking.com):

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | mwb05.github.io |

## Content notes

- First-person singular voice site-wide (solo operator).
- Photo categories in the manifest: automotive 6, cities 6, alpine 17, coast 9, wild 8.
- og:image is the Varenna / Lake Como aerial.
- External dependencies: Google Fonts (Inter, Instrument Serif) and cdnjs (GSAP).
