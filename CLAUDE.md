# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # Type-check, build, and copy chunks to dist/
npm run lint       # ESLint — zero warnings allowed (--max-warnings 0)
npm run preview    # Serve the production build locally
```

There is no test suite.

## Architecture

This is a React + TypeScript + Vite single-page app that visualizes US baby name popularity trends from 1880–2022, using data from the Social Security Administration.

### Data pipeline

The raw dataset lives in `data/data.json`. At runtime it is **not** loaded as a single file. Instead, `public/chunks/` contains seven pre-split JSON files (20-year spans each) plus a `manifest.json` that lists them. `App.tsx` fetches the manifest on mount, then fetches all chunk files in parallel and merges them into a single in-memory `NameData` object.

The build command (`npm run build`) copies `public/chunks/` into `dist/` so the chunks are available after deployment.

`scripts/split-data.js` is a utility that reads the existing chunk files and regenerates `manifest.json`; run it manually if the chunk files change.

### Data shape

```ts
// NameData (types.ts)
{ [name: string]: { M: { [year: string]: number }; F: { [year: string]: number } } }

// NameSelection (what the UI tracks per selected name)
{ name: string; gender: 'M' | 'F' | 'All'; isRegex?: boolean; matches?: string[] }
```

Years with fewer than 5 births are omitted from the SSA data and represented in the chart as `< 5` at count 0 (any year after the name's first appearance with a zero count is treated this way).

### Component responsibilities

- **`App.tsx`** — data loading, top-level state (`selectedNames`, URL hash permalink, "interesting names" shuffler), layout.
- **`NameSearch.tsx`** — search input with a custom dropdown (not a Mantine `Select`). Supports both prefix matching and `/regex/` patterns. Regex selections expand to multiple matching names and are stored as a single `NameSelection` with `isRegex: true` and a `matches` array.
- **`NameChart.tsx`** — Chart.js `Line` chart via `react-chartjs-2` with `chartjs-plugin-zoom`. Exposes `clearTooltip` via `useImperativeHandle`/`forwardRef` so `App` can clear persistent tooltips when names are removed. Dataset colors are generated with a golden-angle HSL formula (`index * 137.5 + 200`). Supports chart download and clipboard copy, both of which temporarily paint any persistent tooltip onto the canvas before exporting.

### URL state / permalinks

Current selections are serialized as `JSON.stringify({ names: selectedNames })`, URL-encoded, and stored as the URL hash. The app reads this hash on mount to restore state, then clears the hash from the URL with `history.replaceState`.

### Deployment

Pushes to `main` trigger a GitHub Actions workflow that runs `npm run build` and deploys `dist/` to GitHub Pages. The Vite base path is `/baby-name-charts/` (matches the repo name). `netlify.toml` is also present as an alternative deployment target with an SPA redirect rule.
