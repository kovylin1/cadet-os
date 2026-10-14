# CADET OS

Personal preparation dashboard for the Air Astana Ab-Initio pilot assessment (5 November 2026).
Plan training on a calendar, record practice results, watch per-category trends, log how sessions felt, keep a short journal.

All data stays in the browser (LocalStorage). Nothing is uploaded.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (metrics, import validation, question generator)
```

## Aptitude Lab (Study → Mathematics / Physics)

Generated practice tests for the maths and physics papers. Everything runs offline; no AI is involved at runtime.

- **Engine** (`src/lab/`): 61 parameterised templates — 29 maths (mental arithmetic, fractions/percentages/ratios, speed–distance–time, fuel, unit conversions, time zones, algebra, averages, charts/tables, geometry & 1-in-60) and 32 physics (Newton, force/weight, motion, energy/power, momentum, pressure/density, aerodynamics, electricity, heat/ISA, waves, levers/pulleys, particles). Each draws its own numbers, computes the answer from them, and lists wrong answers that come from real mistakes (forgetting the reserve, decimal hours read as minutes, statute vs nautical miles, °C instead of kelvin…). Choices are built and validated before display: four unique options, one correct, clear numeric gaps, A–D balanced across a test.
- **Reproducible**: a question is stored only as `{templateId, difficulty, seed, slot}` and rebuilt from it, so results stay small and every test can be replayed.
- **Difficulty**: Basic (one step), Intermediate (two steps, conversions), Advanced (multi-step, combined formulas, assumptions). *Adaptive mixed* weights topics and levels by your recent accuracy, pace and exposure.
- **Test screen**: timer against an absolute deadline (survives reloads, auto-submits), question grid, flag for review, A–D / ←→ / F keys, optional calculator, *Check answer* with worked solution in untimed practice. In-progress tests are saved under `cadet-os:lab-active`.
- **Results**: score, time, accuracy by subject/topic/difficulty, fastest/slowest, flagged, full review with step-by-step working, *Practise my weak areas*, add to calendar, journal reflection. History and trends (accuracy, pace, consistency, topic mastery) per subject; also shown on Performance as a separate "Aptitude Lab" panel.
- Lab accuracy is its own scale: never merged with recorded provider scores, never converted to sten, no selection predictions. Time limits are practice settings, not official ADAPT limits. Questions are original; no affiliation with Symbiotics, PilotSphere or Air Astana.
- Tests: `src/lab/engine.test.ts` generates 20,000+ questions across every template and level, re-derives answers independently from the question text for key templates, and checks variety, A–D balance, difficulty progression and weak-area weighting.

## Filling a result from a file

In **Record a result**, upload a screenshot or PDF, or paste the results text. It's read in the browser (PDF text via pdf.js, screenshots via Tesseract OCR — its English data, ~10 MB, downloads once on first use) and the fields it recognises next to a label (percentage, sten, scaled score, marks, time on target, duration, date, category) are filled in. Anything it can't read stays empty; check before saving.

## Working with another AI

**Work with AI** (Calendar, Journal, Settings) is a copy-paste bridge for any chat AI:

1. **Copy for AI** copies the rules, the reply format and a snapshot of your data. Paste it into ChatGPT/Claude/Gemini and ask for a plan, notes, or attach a result screenshot.
2. Paste the AI's whole reply back. CADET OS extracts the `{"cadetos": 1, …}` block, validates it with the same rules as a backup import, skips duplicates, shows a preview, and adds tasks / journal notes / results only when you confirm. Results without a real score are refused.

The AI never changes the app itself, and nothing is sent anywhere automatically.

## How scores are handled

Practice tests report different kinds of numbers, so each one is stored in its own field and unit:

| Scale | Example | Compared with |
|---|---|---|
| Percentage | 88% | other percentages |
| Sten | 9/10 | other stens |
| Scaled score | 200 | other scaled scores |
| Raw | 80/180 s on target | raw scores with the **same unit and maximum** |

Latest, best, average, change and trend are computed per category **and** per scale. Nothing is ever averaged across scales or categories; the "All" view shows small multiples, one per category. A trend is only reported from three attempts on the same scale. APQ (personality) and Rest are tracked in the calendar and journal but never scored as performance.

The fatigue view (energy before/after, concentration, fatigue vs score) is explicitly exploratory: with a handful of personal data points a correlation is not evidence of cause.

## Project layout

```
src/
  types.ts               data model (AppData, Task, Attempt, Session, JournalEntry, Settings)
  lib/
    metrics.ts           scales, per-scale stats, trend, streak/hours summary
    validate.ts          strict validation for import and stored data
    storage.ts           DataStore interface + LocalStorageStore
    seed.ts              13 Oct 2026 practice results (editable/removable)
  lab/                   Aptitude Lab: rng, build/validation, math & physics templates, engine, stats, session
    categories.ts        9 categories (icon + label, scorable flag)
  state/                 store (React context + actions), toasts
  components/
    ui/                  Button, Card, Dialog (native <dialog>), Field, RatingInput, Segmented…
    forms/               Task, Attempt, Session check-in, Journal
    charts/              ScoreChart, EnergyChart, FatigueScatter, Sparkline
    layout/              AppShell (sidebar on desktop, bottom tabs on mobile)
  pages/                 Overview, Calendar, Study (Aptitude Lab), Performance, Journal, Settings
design_instructions/     design guidance the UI follows (kept locally, not in the repo)
```

### Adding a backend later

The UI never touches LocalStorage directly — it goes through the `DataStore` interface in `src/lib/storage.ts`. To move to a server with accounts, implement that interface against an API (and make `StoreProvider` load asynchronously); pages and components don't need to change. Export files carry `schemaVersion` so future migrations can upgrade old backups.

## Design notes

Direction and tokens are documented at the top of `src/index.css`: navy plane `#101C2C`, surface `#1D3046`, one accent `#71C5EB`, green for progress, amber for attention. Geist for UI, JetBrains Mono for every number. Multi-series chart colours were validated for colour-blind separation and 3:1 contrast against the surface. Categories are identified by icon and label rather than nine colours.

Keyboard: every control is reachable; dialogs close on Escape; in the calendar, arrow keys move by day/week, Home/End jump within the week, PageUp/PageDown change month. Reduced-motion preferences are respected.
