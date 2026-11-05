# Aerial Capture Photography - Static Site (video rebuild v5, 2026-11-04)

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

## v5 video rebuild (2026-11-04)

Home page rebuilt around motion: full-bleed video hero with a drone-camera HUD (live timecode, altitude
that climbs to 400 ft as you scroll) that pulls back into a tilted 3D frame, an FAA Part 107 credential
strip and panel, three stacked sticky service cards (aerial photography, drone videography, real estate &
commercial), a 9-clip video reel with a full-screen viewer, the existing 3D photo fly-through and
filmstrip, a process section and an on-page booking form (service, location, date). Lenis smooth scroll
(jsdelivr CDN) drives desktop wheel scrolling in step with GSAP; touch devices keep native scrolling.
All 46 photos and every original asset are untouched.

### Video assets - STOCK STAND-INS, replace with Matt's footage

`assets/video/` holds compressed (H.264, no audio, 10-14 s, faststart) clips from Mixkit's free
license (free for commercial use, no attribution). They are placeholders until Matt sends his own
footage. Each clip is an `.mp4` + same-name `.jpg` poster. To swap one, keep the file name (or update
the reel tile's `data-full`, `data-src`, `poster` and title in `index.html`, and drop its `data-stock`).

| File | Used for | Mixkit id |
|---|---|---|
| hero-1080.mp4 / hero-720.mp4 / hero-1080.jpg | Hero (720 on phones) | 4998 |
| alpine-valley | Videography card + reel | 15919 |
| neighborhood-topdown | Real estate card + reel | 48394 |
| mountain-road, coast-topdown, property-reveal, construction-progress, tower-orbit, city-establishing, lagoon-reveal | Reel | 41537, 51502, 27543, 42333, 49861, 42338, 5008 |

Encode new footage the same way (ffmpeg):
`-an -vf scale=1280:-2,fps=24 -c:v libx264 -preset slow -crf 27 -movflags +faststart`
(hero: 1920 wide, crf 22). Keep clips around 1-4 MB.

QA harness for this rebuild: `_qa/v5/shots.mjs` (desktop + phone viewport shots, overflow sweep, JS
errors). Design audit notes: `../design-audit.md`.
