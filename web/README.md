# PAIMANA-PRISM — web prototype

Static Next.js app (TypeScript, Tailwind CSS v4, Recharts, Lucide). It reads only the
precomputed JSON in `src/data/` (copied from `pipeline/data/export/` by `npm run sync-data`,
which runs automatically before `dev` and `build`). No backend, no model at runtime.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/ (deploy anywhere — see docs/deployment.md)
npm run serve      # serve out/ at http://localhost:4173
npm test           # Ask PRISM question matching (24 checks)
npm run qa:links   # internal links, headings, no NaN/undefined in any page
npm run qa:e2e     # 46 headless-Chrome checks: interactions, mobile, axe-core WCAG 2.1 AA (needs `npm run serve`)
npm run typecheck
```

| Path | Contents |
|---|---|
| `src/app/` | Routes: `/`, `/command-center`, `/projects`, `/projects/[code]`, `/advisor`, `/evidence`, `/ask`, `/methodology`, `/design-system` |
| `src/components/ui/` | Design system: cards, badges, buttons, tooltips, risk badge / score bar / gauge, evidence labels, KPI tiles, meters, table and chart styles |
| `src/components/layout/` | Government identity strip, header + navigation, footer |
| `src/lib/` | Typed data access (`data.ts`, `types.ts`), Indian number formatting, labels |

Design rules: light-first, WCAG AA contrast, visible keyboard focus, risk always shown with a
word and an icon (never colour alone), every number labelled OFFICIAL / DERIVED / MODEL ESTIMATE /
ILLUSTRATIVE, every chart states the question it answers and has a screen-reader summary.
