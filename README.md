# Portfolio

Source for [amantripathii.netlify.app](https://amantripathii.netlify.app): a static site, no build step.

- `index.html`: home page
- `work/`: case-study pages
- `assets/css/site.css`: design tokens and all styles (Paper and Scope themes)
- `assets/js/`: `core.js` (theme, pause, animation loop), `previews.js` (signal drawings), `home.js` (hero and page wiring)
- `assets/data/`: small JSON signals exported from the project repos (WRIST PPG, GlucoTrace CGM days, mobile EEG sensor quality)

Run locally with `python3 -m http.server` and open http://localhost:8000.
