# Stratum — The X-Ray Record for Every Building

A concept marketing site for **Stratum**, a permanent "X-ray record" for buildings. Every pipe, wire, duct,
stud and shutoff gets documented before the drywall closes, and lives on as a transferable **Building
Passport** for the life of the property.

## What's in here

- **Landing site** — problem framing, how-it-works, the full record checklist, business model
  (contractors / owners / trade pros), the Building Passport concept, and security/permissioning.
- **Live "Behind the Wall" demo** — a clickable X-ray floor plan (`#behind-the-wall`). Click any glowing
  point to see exactly what's behind that wall: pipe runs, wire gauges, stud spacing, shutoff distance,
  install dates and warranty status. Toggle structural / plumbing / electrical / HVAC layers independently.
- **AI Scan Lab** (`#scan-lab`) — drop in any walkthrough video (any length, any file size) and watch a
  simulated multi-stage pipeline (frame extraction → object/material detection → depth reconstruction →
  diagram synthesis) turn it into a generated X-ray floor plan you can explore the same way. This runs
  entirely client-side and is clearly labeled as a demo simulation — no video is uploaded anywhere, and the
  output is a seeded procedural illustration rather than real computer-vision analysis of the footage.

## Stack

Vite + React 19 + TypeScript, Tailwind CSS v4, Framer Motion, lucide-react. No backend — everything,
including the Scan Lab pipeline, runs in the browser.

## Development

```bash
npm install
npm run dev       # start dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
```

## Project structure

```
src/
  components/     UI sections (Hero, ScanLab, FloorplanDemo, BusinessModel, ...)
  lib/
    floorplan.ts        fixed demo floor plan + procedural "AI scan" generator
    useScanPipeline.ts  simulated upload + processing pipeline state machine
    random.ts           seeded PRNG so a given file always generates the same diagram
    format.ts           byte/duration formatting helpers
```
