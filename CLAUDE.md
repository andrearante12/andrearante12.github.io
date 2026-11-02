# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio site for Andre Arante (Robotics & Computer Vision Engineer). Pure static HTML/CSS/JS — no build system, no package manager, no frameworks. Served via GitHub Pages from the repo root, so **all asset paths are relative and case-sensitive** (it builds on Linux; macOS won't catch casing mistakes). Open `index.html` over a local HTTP server (e.g. `python3 -m http.server`) to preview — it uses ES modules, so `file://` won't load them.

## File Structure

- `index.html`, `portfolio.html`, `publications.html` — the main site, in a plain academic (AcademicPages-style) layout: masthead tabs (CV · Portfolio · Publications · Photography), sticky left author sidebar, one content column. All three share `assets/site.css` (own light/dark tokens; loads `assets/theme.js` but **not** `theme.css`). The nav + sidebar markup is duplicated in each page, so edit all three together.
  - `index.html` is the **CV**: hand-extracted from `resume/resume.tex` (education, experience, publications, selected projects, skills). Update it when the resume changes; CI only rebuilds the PDF.
  - `portfolio.html` renders `projects.json` (title → `site` write-up or `projects/<slug>.html`, context from `type`, `cardBlurb`, optional `thumb` image/video; a missing image is hidden). Image slots: `assets/projects/<slug>.jpg`.
  - Headshot: drop a square photo at `assets/headshot.jpg` to replace the "AA" avatar.
  - The previous editorial hero (starfield, SO-101 arm, card grid) is in git history; Theming notes below about the hero describe that version and the pages that still use `theme.css`.
- `index-classic.html` — The previous single-scroll portfolio (hero / about / project grid with slide-in modal / timeline / contact). Kept as a fallback; not linked from the live site.
- `photography.html` — Standalone photography gallery: masonry grid, category filter bar, lightbox viewer.
- `room/` — ES modules that build and drive the 3D room (see below).
- `photos/` — Curated, web-sized photos used by the in-room gallery modal (separate from the larger `photography/` set used by `photography.html`).

## Architecture

`index.html` is a thin shell: inline `<style>` for all HUD/overlay/panel CSS, an `<script type="importmap">` pinning Three.js from the unpkg CDN (`three@0.160.0`), and `<script type="module" src="room/main.js">` to boot the scene. The only other external dependency is Google Fonts.

### `room/` modules

- `main.js` — entry point: scene, renderer, camera, OrbitControls, lighting, render loop; wires the other modules together.
- `lib.js` — geometry/material helpers (`box`, `cyl`, `sphere`, `cone`, `capsule`, `group`, `mat`, `COL`, `tagInteractive`).
- `buildRoom.js` — static environment: floor, walls, L-desk, shelves, plants, capybaras, paintings, lamps.
- `buildObjects.js` — the interactive project props (arm, PiCrawler, monitor, phone, Switch, IoT hub) and `buildCamera` (the DSLR). Monitor/Switch screens are in-scene video textures (`videos/minecraft_envs.mp4`, `videos/vgc_demo.webm`).
- `data.js` — `PROJECTS` metadata + `PROJECT_ORDER`. See "Adding/editing projects" below.
- `interaction.js` — raycasting against invisible AABB hover proxies, detection-box drawing, idle auto-cycle, click-to-focus camera pans, the research-view entry hook.
- `ui.js` — renders the detail panel, the LUMINA app (mapped onto the phone's 3D screen via CSS homography), and the screen-app overlay.
- `lamps.js` — lamp controller the LUMINA app drives in real time.
- `gallery.js` — the photography modal (reads from `photos/`).
- `exterior.js` — the research-view front-yard scene (house, driveway, helipad) and the drone-delivery animation.

## Theming (cream light ⇄ dark)

Every page ships both themes. **Cream light is the default**; dark is an explicit
opt-in remembered in `localStorage` under `aa-theme` (a visitor who picked dark
before keeps it). Note the CSS is still written dark-first: `:root` holds the
dark palette and `theme.css` overrides it under `:root[data-theme="light"]` —
only the seed value in `theme.js` decides which one a new visitor lands on.

- `assets/theme.js` — loaded **synchronously in `<head>`** on every page so
  `data-theme` lands on `<html>` before first paint (no flash). It injects the
  nav toggle button and fires a `themechange` event on `window`.
- `assets/theme.css` — loaded **after** each page's own styles. Holds the light
  palette (`:root[data-theme="light"]`) plus the light-only component overrides;
  the dark theme is left completely untouched.

Cream palette (sampled from the standalone project write-up sites):
paper `#d8d2c4` · card `#efe9db` · ink `#1c1a16` · muted `#5c574e` ·
terracotta `#9c5a22` · deep teal `#2a6d5d` · gold `#b8934a`.

Notes when adding UI:
- Prefer the CSS variables (`--bg`, `--card`, `--text`, `--muted`, `--border`,
  `--text-soft`, `--accent`, `--accent2`) over literal colors — anything
  hardcoded needs a matching override in `theme.css`.
- Per-project accents in `projects.json` are tuned for a black page. On cream,
  use `--card-ink` / `--project-ink` (accent blended toward ink) wherever the
  accent carries text or fine linework.
- The canvas backgrounds (`hero-bg.js` starfield, `project-bg.js`
  constellations) are night skies: they hide and stop their render loop under
  the light theme, and resume on `themechange`.

The two themes carry different visual motifs, swapped inside `.scene` at the
bottom of the hero:

| | Dark | Cream |
|---|---|---|
| Background | Three.js starfield + shooting stars | blueprint grid (16px minor / 96px major), masked out toward the page bottom |
| Hero scene | `.observatory` — haze, horizon, telescope | `.plate` — hatched datum rule + a live 3D SO-ARM101 (`assets/so101.js`), with `.arm-plate` (the hand-drawn elevation) as its fallback |
| Wordmark frame | CV detection brackets | hairline crop marks + a `1140` dimension line |
| Spotlight card label | `◉ Title · 0.94` confidence readout | `FIG. 02 · TITLE` |

The card label text is built by `labelTag()` in `index.html` and re-rendered on
`themechange`; everything else is pure CSS.

### The 3D SO-ARM101 (`assets/so101.js` + `models/so101.glb`)

`models/so101.glb` (~1.8 MB) is baked by `tools/build_so101.py` from
`tools/so101.urdf` plus the SO-101 print STLs (the source STLs are **not** in
this repo — they come from `helium_final_presentation.zip`; point `SRC` in the
script at an extraction of it to rebuild). The script:

- welds and quadric-decimates each part to ~10% of its triangles (326k → 120k),
- bakes the URDF kinematic tree into the glTF node hierarchy — one node per
  link, **named after the joint that drives it**, every joint rotating about
  its local Z, so the page poses the arm with
  `joints.elbow_flex.rotation.z = …` and needs no URDF loader at runtime,
- keeps printed parts and `sts3215` servo bodies as separate nodes so the page
  can shade each group, and strips normals (three recomputes them on load).

`assets/so101.js` renders it as a **static shot** — one render per change, no
animation loop. Everything about the shot (camera, exposure, robot placement,
the six joint angles, and the layout vars) lives in the `CONF` block at the top
of the file.

**Tuning it:** a full-height slider panel appears on the left **automatically
when the site is served from localhost** — no flag needed. (On the deployed
site it only appears with `?debug`.) Every slider re-renders live, and the panel
prints a paste-ready `CONF` block: Copy it over `CONF` in `assets/so101.js` to
make the shot permanent. `Hide` dismisses the panel and that choice sticks in
`localStorage`; `Shift+D` toggles it back. `window.__so101.set({ fov: 24 })`
does the same from the console.

The robot stands on the datum rule, which sits alongside the hero header at
`--datum-top` (a `vh` value). Alignment is automatic: `alignToDatum()` projects
the model's ground plane and offsets the canvas so the base always meets the
rule, whatever the camera is doing — so changing camera values never breaks the
contact.

Other behaviour worth knowing: the GLB is **fetched on demand** — never for a
dark-theme visitor, never below `MIN_WIDTH` (760px, where the whole plate is
hidden so the robot can't crowd the hero copy), and otherwise as soon as the
cream theme is active. Since cream is now the default, that means most
desktop visitors fetch it on first load. `--arm-w`/`--arm-h` scale down with viewport width. If WebGL
or the fetch fails, `.plate` gets `model-failed` and the hand-drawn SVG
elevation is shown instead. The skill tags (`.hero-stack`) live
inside the hero, above the horizon/datum rule that closes the scene; each theme
sets its own hero `padding-bottom` to clear its illustration.

### Design system (CSS variables)

`index.html` and `photography.html` use a warm dark palette. `index.html`'s `:root`:

| Variable | Value | Role |
|---|---|---|
| `--bg` | `#130f0a` | Warm near-black background |
| `--text` / `--muted` | `#f1eadf` / `#b6a78f` | Text hierarchy |
| `--teal` | `#00d4aa` | Teal accent (scan button, gallery) |
| `--mono` | `'DM Mono'` | Monospace labels, HUD, tags |
| `--display` | `'Syne'` | Display headings |
| `--body` | `'DM Sans'` | Body copy |

Per-project accent colors live in each `PROJECTS` entry's `accent` field and drive the detection box + panel via the `--accent` CSS variable, set at runtime.

### Adding photos

There are two independent photo galleries:

- **In-room gallery** (the DSLR prop in `index.html`) — edit the `PHOTOS` array at the top of `room/gallery.js`. Each entry: `{ src: 'photos/dc-01.jpg', title, location, category }`. Images live in `photos/` (curated, web-sized). Category filter buttons are generated from the unique `category` values.
- **Standalone `photography.html`** — edit its own `PHOTOS` array in the inline `<script>`; images live in the larger `photography/` directory.

### Adding/editing projects (`index.html` / the 3D room)

Each project needs **two pieces**:

1. **Metadata** — an entry in `PROJECTS` in `room/data.js`, keyed by `id`. Fields: `title`, `type`, `accent` (hex, drives the detection box/panel color), `tag` (label shown in the detection box), `blurb`, `highlights` (bullets), `stack` (tags), `detail`/`github` links, and optional `docs`. Add the `id` to `PROJECT_ORDER` so it joins the idle auto-cycle and chip nav. `app: 'lumina'` flags the IoT phone app.
2. **A clickable object** — a prop built in `room/buildObjects.js` and registered with the same `id` (via `tagInteractive`), plus an invisible AABB hover proxy so the detection box is stable and easy to hit. Screen-based props (monitor/Switch) use a video texture from `videos/`.

The old grid/modal `PROJECTS` array now lives only in `index-classic.html`.

## Standalone project write-up subsites (retired)

ImitationArm and MalmoRL (Minecraft) each used to have their own multi-page
microsite mounted at `projects/<name>/`, authored externally with a distinct
layout system (Bricolage Grotesque / Source Serif 4 / IBM Plex Mono, cream
paper + dark console panels) instead of the main site's look. Both were
folded back into the standard `projects/<slug>.html` shell (see "Adding/editing
projects" above) so every project now shares one template and theme — no
project keeps a separate design anymore.

`projects.json`'s `site` and `docs` fields, which used to point a project
card or detail page at one of these subsites, are gone along with them; a
project's card and CV/portfolio links always resolve to `projects/<slug>.html`
now.
