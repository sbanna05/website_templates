# Design For You

A 3D studio in the browser for planning a room or putting together an outfit. Place blocks, drag them where you want, resize them, and paint them with your own colours and materials.

It is free to use, needs no account, and keeps your work in your own browser.

## Run it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run check` | Verify image licences, alt text, the third-party audit list and that no code calls outside services |
| `npm run textures` | Rebuild the optimised textures in `public/textures/` from `texture-sources/` |

## What you can do

- **Build from blocks.** Kitchen units, furniture and garments are made of parts that rebuild at their real size: a wider cabinet gains doors instead of stretching one.
- **Drag freely.** Move blocks with the pointer or the arrow keys. They snap to a 5 cm grid (hold Shift to skip it) and stay inside the room.
- **Resize, turn and lift.** Set width, height, depth, rotation and height off the floor for any block.
- **Paint with your own colours.** Pick a working colour, then use its tints, shades and tones, or the colours suggested to go well with it.
- **Save your own palettes.** Collect colours, name the palette, and it is there next time.
- **Apply materials.** Six patterns drawn by the app and five CC0 photo textures. A block's colour tints its material.
- **Look around.** Orbit, pan, zoom, jump to a top-down plan view, and export the view as a high-resolution PNG.
- **Undo anything.** 60 steps of undo and redo.

## Keyboard

The whole studio works without a mouse. Press `?` in the app for the full list.

| Keys | Action |
| --- | --- |
| `Page Down` / `Page Up` | Select the next or previous block |
| Arrow keys | Move the selected block 5 cm (with `Shift`, 25 cm). With nothing selected, orbit the view |
| `[` / `]` | Turn the block 15° |
| `Ctrl` + `D` | Duplicate |
| `Delete` | Delete |
| `+` / `-` / `0` | Zoom in, zoom out, reset the view |
| `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | Undo, redo |

## Privacy, cost and licences

- **Cost:** nothing. There is no paid tier, trial, watermark or payment step in the app.
- **Your data:** scenes, palettes and preferences are stored in your browser's `localStorage` and nowhere else. The "Privacy, data and licences" dialog shows what is stored and deletes any part of it, or all of it.
- **Outside services:** none. The page makes no third-party requests. Fonts are bundled with the site, and there are no analytics or cookies.
- **Images:** every photo texture is CC0 from [Poly Haven](https://polyhaven.com); the rest are drawn in the browser. Sources and authors are recorded in [src/config/textures.js](src/config/textures.js).
- **Libraries:** the audit list is in [src/config/thirdParty.js](src/config/thirdParty.js).

`npm run check` fails the build if an image ships without a licence record and alt text, if an installed package is missing from the audit list, or if source code calls an outside service.

## Project layout

```text
src/
  config/        Block catalogue, palettes, texture licences, third-party audit
  studio/        3D engine, geometry, colour maths, procedural textures (no Vue)
  composables/   App state, undo history, saved palettes, storage
  components/    Interface panels and controls
  style.css      Design tokens and shared component styles
scripts/         Texture optimiser and release checks
texture-sources/ Full-size texture originals (not shipped)
```

### Add a block

Add an entry to [src/config/catalog.js](src/config/catalog.js). Its `build(w, h, d)` function returns the boxes, cylinders and spheres that make up the block at that size. The library card, thumbnail, resize limits and keyboard support follow automatically.

### Add a texture

1. Put the full-size image in `texture-sources/`.
2. Add its entry, with source URL and licence, to [src/config/textures.js](src/config/textures.js).
3. Run `npm run textures`, then `npm run check`.

## Built with

[Vue 3](https://vuejs.org/), [three.js](https://threejs.org/) and [Vite](https://vite.dev/).
