# ilac360

Open-source drug interaction checker for the Turkish pharmaceutical market. Live at [ilac360.com](https://ilac360.com).

Turkey has more than 20,000 registered drug products, but no free tool that understands Turkish brand names well. Most existing solutions rely on US or UK naming, which often does not match what is prescribed here.

ilac360 lets you search the Turkish market, select up to 10 drugs, and see possible interactions instantly — risk levels, active ingredients, ATC codes, and a printable report.

The app runs entirely in the browser. No backend, no accounts, no tracking. The drug data is loaded once and queried locally.

![ilac360 screenshot](client/public/screenshot.png)

---

## Features

- Search across ~20,000 drug products in the Turkish market (by brand name, active ingredient, or barcode)
- Condition-based search with 80+ mapped indications and prospectus fallback
- Interaction analysis with clear risk levels (critical, high, medium, low, unknown, info) and a severity legend
- Rule engine: 219 sourced ingredient-pair rules + 130+ ATC-class rules, matched on salt-stripped ingredient components with a synonym table (no substring false positives)
- Printable interaction report
- Installable PWA with offline caching of previously viewed data
- Optional cookie-free error reporting and analytics (off by default — see [docs/telemetry.md](docs/telemetry.md))
- Dark mode

---

## Stack

- React 19, Vite 8, Tailwind CSS 4
- Pure client-side: a single static bundle plus JSON data files
- No server, no database, no API keys

---

## Data

Source data lives in `data/`:

| File                       | Content                                                            |
|----------------------------|--------------------------------------------------------------------|
| `ilaclar-dataset.json`     | ~20.000 drug records from the Turkish drug database (Git LFS)      |
| `interactions.json`        | 219 curated ingredient-pair rules, each with a `source` field      |
| `ingredient-synonyms.json` | Canonical ingredient names ↔ real-world dataset spellings          |
| `condition-mapping.json`   | Condition → drug-class mapping for indication search               |

`scripts/build-data.mjs` reads these and writes content-hashed JSON into `client/public/data/` (resolved via `manifest.json`):

- `drugs-index.<hash>.json` — slim records for in-memory search
- `drugs-desc-NN.<hash>.json` — leaflet text split into 64 hash buckets (~180 KB gzip each; a drug card fetches exactly one)
- `usage-sections.<hash>.json` — "ne için kullanılır" excerpts for free-text condition search
- `condition-desc-matches.<hash>.json` — precomputed condition ↔ leaflet matches
- `interactions.<hash>.json`, `condition-mapping.<hash>.json`, `ingredient-synonyms.<hash>.json`

The build also backfills missing ATC codes by mapping each drug's active ingredient to the most common ATC seen elsewhere in the dataset. `npm run rules-coverage` reports which rule ingredients actually match dataset components (currently 98.6%).

---

## Local Development

Requires Node.js 20+ and [Git LFS](https://git-lfs.com) (the 55 MB source dataset `data/ilaclar-dataset.json` is stored in LFS — run `git lfs install` before cloning/pulling).

```bash
npm run setup                  # npm ci in client/
npm run build:data             # generates client/public/data/* (hashed files + manifest.json)
npm run dev                    # starts Vite dev server on :5173
npm test                       # unit tests (Vitest)
npm run smoke-test             # data integrity checks on generated files
```

---

## Production Build

```bash
npm run build
```

This regenerates the data files, builds the client into `client/dist/`, and mirrors the output to `dist/` at the repo root for static deployment. `dist/` is **not** committed — it is produced locally by the build (CI also uploads it as an artifact).

The contents of `dist/` can be uploaded to any static host (Netlify, Vercel, Hostinger static, GitHub Pages, plain S3 + CloudFront, etc.). No runtime is needed. A `.htaccess` with cache/gzip/SPA-rewrite rules for Apache/LiteSpeed hosts (e.g. Hostinger) ships inside the build; data files use content-hashed names resolved through `data/manifest.json`, so they can be cached immutably at the edge.

---

## Project Layout

```
client/        React app (Vite)
data/          Source data (drug records via Git LFS, interaction rules, synonyms, conditions)
scripts/       Data build + smoke test scripts
dist/          Production build output (generated; not in git)
```

---

## Contributing

Pull requests are welcome — especially for:

- New interaction rules in `data/interactions.json`
- Additional condition mappings in `data/condition-mapping.json`
- UI fixes and accessibility improvements

Please keep the rule engine and the UI separate. Interaction logic lives in [`client/src/data/interactionEngine.js`](client/src/data/interactionEngine.js).

---

## Disclaimer

This tool is for informational purposes only. It is not medical advice and not a substitute for professional clinical judgment. Always consult your doctor or pharmacist before making decisions about medications.

---

## License

[MIT](LICENSE) © 2026 Ahmet Yiğit
