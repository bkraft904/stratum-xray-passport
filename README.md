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
- **AI Scan Lab** (`#scan-lab`) — drop in a walkthrough video or photo (any size) and get real findings back.
  Has two modes:
  - **Real mode** (when `VITE_ANALYZE_API_URL` is set): frames are extracted client-side, sent to the Lambda
    backend in `backend/`, and analyzed by Claude's vision API. Findings — plumbing, electrical, structural,
    HVAC, materials — are genuinely grounded in what's visible in your upload, with confidence levels and the
    specific evidence for each one. Nothing is fabricated; if the model can't identify something, it says so.
  - **Simulated mode** (default, no backend configured): a scripted, clearly-labeled client-side preview —
    frame extraction and a generated illustrative floor plan, no real analysis, nothing leaves the browser.

## Stack

Frontend: Vite + React 19 + TypeScript, Tailwind CSS v4, Framer Motion, lucide-react.
Backend (optional, for real Scan Lab analysis): a single AWS Lambda function + API Gateway, calling the
Claude API — see `backend/README.md` to deploy it. Without it deployed, the site still works fully in
simulated mode.

## Development

```bash
npm install
npm run dev       # start dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
```

To run the Scan Lab in real mode locally, deploy the backend (`backend/README.md`) and add
`VITE_ANALYZE_API_URL=<your endpoint>` to a `.env.local` file before running `npm run dev` / `npm run build`.

## Project structure

```
src/
  components/     UI sections (Hero, ScanLab, FloorplanDemo, BusinessModel, ...)
  lib/
    floorplan.ts        fixed demo floor plan + procedural "AI scan" generator (simulated mode)
    useScanPipeline.ts  drives both real and simulated Scan Lab flows
    frameExtractor.ts   client-side video/image → JPEG frame extraction
    analyzeApi.ts        client for the real backend
    random.ts           seeded PRNG so a given file always generates the same demo diagram
    format.ts           byte/duration formatting helpers
backend/
  template.yaml   AWS SAM template (API Gateway + Lambda)
  analyze/        Lambda handler — calls Claude's vision API, returns structured findings
```
