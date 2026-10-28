# Simeon's Portfolio

Portfolio site for Jose Simeon — freelance video editor.

Static site, no build step and no dependencies. Open `index.html` or serve the folder.

- `index.html` — markup and the intro sequence (inline on purpose: the page must reveal itself even if `main.js` fails to load)
- `styles.css` — design system and the choreography of the intro
- `main.js` — the 3D point field, plain WebGL, no libraries

The intro reads as two keyframes: the lit one sends light down a line to the unlit one, the line
then cuts the screen and opens it. `prefers-reduced-motion` skips straight to the page.
