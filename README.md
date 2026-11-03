<div align="center">

# Aman Tripathi · Portfolio

**An interactive portfolio you drive through: a 3D road with one landmark per project,<br>
live signal previews built from real project data, and an in-browser "Ask about Aman" assistant.**

[![Live site](https://img.shields.io/badge/Live%20site-amantripathii.netlify.app-00C7B7?logo=netlify&logoColor=white)](https://amantripathii.netlify.app)
![three.js](https://img.shields.io/badge/three.js-0.160-000000?logo=threedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20modules-F7DF1E?logo=javascript&logoColor=black)
![No build](https://img.shields.io/badge/build%20step-none-success)
![Static](https://img.shields.io/badge/hosting-static-informational)

[**Visit the site**](https://amantripathii.netlify.app) · [Resume (PDF)](images/Resume.pdf)

</div>

---

## Overview

The home page is a drive: a car on a fixed road, one landmark per stop. Scroll, swipe, use the arrow
keys or click the stop dots to move between projects; the car always stays on the road. Every stop opens
a project card with a small hands-on demo, and the deeper projects link to full case-study pages.

There is no framework and no build step. The site is plain HTML, CSS and ES modules, with three.js
loaded from a CDN through an import map.

## Features

| Feature | How it works |
|---|---|
| **3D drive** | three.js scene with one landmark per stop; scroll, swipe, arrow keys, A/D or a sideways swipe to steer |
| **List view** | A plain list of every project for visitors who prefer it, and a fallback when 3D is not wanted |
| **Live signal previews** | Real data exported from the project repos: wrist PPG, GlucoTrace CGM days, mobile EEG sensor quality; clearly illustrative drawings where a project has no public data |
| **Hands-on labs** | Small interactive demos inside the project cards; changing a lab updates the landmark in the scene |
| **"Ask about Aman" chat** | Answers questions from a curated knowledge base with BM25 keyword retrieval, light stemming and typo tolerance, entirely in the browser: no model, no server |
| **Synthesised sound** | Engine hum, road noise and stop chimes made with the Web Audio API (no audio files); off until the visitor turns it on |
| **Two themes** | Case studies come in *Paper* (ECG chart paper) and *Scope* (oscilloscope phosphor) |
| **Accessible by default** | Respects `prefers-reduced-motion`, a pause control, ARIA labels and live regions throughout |

## Stops

Temple (sleep onset and offset) · GlucoTrace · Mobile EEG · Wrist PPG · Chat-to-Pay · GNN-DDI ·
Forecasting · IEEE paper · Open source · Contact

Case studies live in [`work/`](work/):

| Page | Project |
|---|---|
| [`work/temple-sleep.html`](work/temple-sleep.html) | Sleep onset and offset detection at Temple |
| [`work/glucotrace.html`](work/glucotrace.html) | [GlucoTrace](https://github.com/Aman-Tripathi27/GlucoTrace) |
| [`work/mobile-eeg.html`](work/mobile-eeg.html) | [Mobile EEG signal quality](https://github.com/Aman-Tripathi27/mobile-eeg-signal-quality) |
| [`work/wrist-ppg.html`](work/wrist-ppg.html) | [Wrist PPG motion cleaning](https://github.com/Aman-Tripathi27/ppg-motion-artifact-cleaning) |

## Run locally

```bash
git clone https://github.com/Aman-Tripathi27/Portfolio.git
cd Portfolio
python3 -m http.server
```

Open <http://localhost:8000>. A local server is needed (rather than opening the file directly) because
the scripts are ES modules.

## Project structure

```text
Portfolio/
├── index.html            # home page: the 3D drive, with a list-view fallback
├── work/                 # case-study pages
├── assets/
│   ├── css/
│   │   ├── drive.css     # home page styles
│   │   └── site.css      # case-study styles (Paper and Scope themes)
│   ├── js/
│   │   ├── core.js       # theme, pause, the single animation loop, canvas helpers
│   │   ├── drive.js      # the 3D home page
│   │   ├── previews.js   # signal drawings
│   │   ├── labs.js       # hands-on demos in the project cards
│   │   ├── chat.js       # "Ask about Aman" panel
│   │   ├── retrieve.js   # in-browser BM25 retrieval
│   │   ├── kb.js         # the chat's knowledge base
│   │   └── sound.js      # Web Audio sound design
│   ├── data/             # small JSON signals exported from the project repos (PPG, CGM, EEG)
│   └── img/              # figures used on the case-study pages
└── images/               # resume, logo and other images
```

## Deployment

The site is static and deploys as-is: the repository root is the site root. It is served from
[Netlify](https://amantripathii.netlify.app) and also published with GitHub Pages.

## Updating content

- **Project facts:** edit the stop cards in `index.html` and the matching entry in `assets/js/kb.js`, so
  the chat and the page always agree.
- **Signal data:** replace the JSON in `assets/data/` with a fresh export from the project repo.
- **Case studies:** each page in `work/` is self-contained HTML using `assets/css/site.css`.

---

<div align="center">
<sub><a href="https://github.com/Aman-Tripathi27">GitHub</a> · <a href="https://www.linkedin.com/in/aman-tripathi27/">LinkedIn</a> · <a href="mailto:amantripathi3273@gmail.com">amantripathi3273@gmail.com</a></sub>
</div>
