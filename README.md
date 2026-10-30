# Portfolio

Source for [amantripathii.netlify.app](https://amantripathii.netlify.app): a static site, no build step.

- `index.html`: home page, a 3D drive (three.js) past one landmark per project, with a list view fallback
- `work/`: case-study pages
- `assets/css/drive.css`: home page styles
- `assets/css/site.css`: case-study styles (Paper and Scope themes)
- `assets/js/`: `core.js` (theme, pause, animation loop), `previews.js` (signal drawings), `drive.js` (the 3D home page)
- `assets/data/`: small JSON signals exported from the project repos (WRIST PPG, GlucoTrace CGM days, mobile EEG sensor quality)

Run locally with `python3 -m http.server` and open http://localhost:8000.
