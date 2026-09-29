# Deploying the PAIMANA-PRISM prototype

The prototype is a **static website**: HTML, JavaScript and JSON only, with no server, database
or secrets. `npm run build` in `web/` produces the complete site in `web/out/`, which any
static host can serve.

## 1. Build and check (every time)

```bash
cd web
npm install
npm run build        # copies pipeline/data/export → src/data, then exports to out/
npm test             # Ask PRISM question matching (24 checks)
npm run serve        # http://localhost:4173 — open it and click through the demo
npm run qa:links     # every internal link resolves, one <h1> per page, no NaN/undefined leaks
npm run qa:e2e       # 46 checks in headless Chrome: demo interactions, mobile layout, axe-core WCAG 2.1 AA
```

`npm run qa:e2e` needs `npm run serve` running in another terminal (and Google Chrome or
Microsoft Edge installed; set `CHROME_PATH` if it is elsewhere).

If the analysis data changed, regenerate it first:

```bash
cd pipeline
.venv\Scripts\python -m prism_pipeline.cli              # only if new Flash Reports were added
.venv\Scripts\python -m prism_pipeline.analytics.run    # scores, drivers, Advisor, Ask PRISM
.venv\Scripts\python -m pytest -q
```

## 2. Publish — choose one

### Option A — Vercel (recommended; free, public HTTPS URL)

1. Put the repository on GitHub (private or public), including `web/src/data/`.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repository.
3. Set **Root Directory** to `web`. Leave the framework (Next.js) and build command
   (`npm run build`) as detected. Vercel serves the static export automatically.
4. **Deploy**. The URL looks like `https://<project>.vercel.app`; every push redeploys.

Without GitHub: `cd web && npx vercel --prod` (asks you to log in in the browser the first time).

### Option B — Netlify Drop (fastest, no Git)

1. `cd web && npm run build`
2. Open [app.netlify.com/drop](https://app.netlify.com/drop), log in, and drag the **`web/out`** folder
   onto the page. You get a public URL in seconds; rename it under *Site settings*.

### Option C — GitHub Pages

1. Build with the repository name as base path, e.g. for `github.com/<user>/paimana-prism`:
   `PAGES_BASE_PATH=/paimana-prism npm run build` (PowerShell: `$env:PAGES_BASE_PATH="/paimana-prism"; npm run build`).
2. Publish the contents of `web/out/` to the `gh-pages` branch (or via a Pages workflow).
   `out/.nojekyll` is included so GitHub does not drop the `_next/` folder.

## 3. After publishing

- Open the URL on a laptop (1366–1440 px) and a phone; run the demo route in `docs/demo-script.md`.
- Check the deep links: `/advisor/?scenario=R005`, `/ask/?q=Why%20is%20project%20618706%20high%20risk%3F`.
- Put the URL in the PPT and the video description.

## What is public

Only official PAIMANA Flash Report figures (already public on paimana-proj.mospi.gov.in) and
PRISM's own analysis. The site states on every page that it is an SIH prototype and not an
official Government of India website, and that no fund transfers are performed.
