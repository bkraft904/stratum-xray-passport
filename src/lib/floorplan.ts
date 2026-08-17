import { mulberry32, seedFromString } from './random'

export type Layer = 'structural' | 'plumbing' | 'electrical' | 'hvac'

export interface DetailItem {
  label: string
  value: string
}

export interface Hotspot {
  id: string
  x: number
  y: number
  layer: Layer
  title: string
  subtitle: string
  installDate: string
  warranty: string
  confidence?: number
  items: DetailItem[]
}

export interface Room {
  x: number
  y: number
  w: number
  h: number
  label: string
}

export interface WallSeg {
  x1: number
  y1: number
  x2: number
  y2: number
  exterior?: boolean
}

export interface FloorPlan {
  viewBox: [number, number, number, number]
  rooms: Room[]
  walls: WallSeg[]
  hotspots: Hotspot[]
}

export const LAYER_META: Record<Layer, { label: string; color: string; glow: string }> = {
  structural: { label: 'Structural', color: '#ffb02e', glow: 'rgba(255,176,46,0.55)' },
  plumbing: { label: 'Plumbing', color: '#2ee6ff', glow: 'rgba(46,230,255,0.55)' },
  electrical: { label: 'Electrical', color: '#ffe14d', glow: 'rgba(255,225,77,0.55)' },
  hvac: { label: 'HVAC', color: '#8b7bff', glow: 'rgba(139,123,255,0.55)' },
}

// -------- Fixed showcase floor plan used in the "Behind the Wall" demo --------

export const DEMO_FLOORPLAN: FloorPlan = {
  viewBox: [0, 0, 800, 560],
  rooms: [
    { x: 40, y: 40, w: 360, h: 280, label: 'Living Room' },
    { x: 400, y: 40, w: 360, h: 280, label: 'Kitchen' },
    { x: 40, y: 360, w: 280, h: 160, label: 'Bedroom A' },
    { x: 320, y: 360, w: 160, h: 160, label: 'Bathroom' },
    { x: 480, y: 360, w: 280, h: 160, label: 'Bedroom B' },
  ],
  walls: [
    { x1: 40, y1: 40, x2: 760, y2: 40, exterior: true },
    { x1: 760, y1: 40, x2: 760, y2: 520, exterior: true },
    { x1: 760, y1: 520, x2: 40, y2: 520, exterior: true },
    { x1: 40, y1: 520, x2: 40, y2: 40, exterior: true },
    { x1: 400, y1: 40, x2: 400, y2: 320 },
    { x1: 40, y1: 320, x2: 760, y2: 320 },
    { x1: 40, y1: 360, x2: 760, y2: 360 },
    { x1: 320, y1: 360, x2: 320, y2: 520 },
    { x1: 480, y1: 360, x2: 480, y2: 520 },
  ],
  hotspots: [
    {
      id: 'kitchen-supply',
      x: 570,
      y: 300,
      layer: 'plumbing',
      title: 'Kitchen Sink Supply & Drain',
      subtitle: 'Behind the wall, 14" below counter line',
      installDate: 'Mar 12, 2023',
      warranty: 'Manufacturer — 10 yr, expires 2033',
      confidence: 0.98,
      items: [
        { label: 'Supply lines', value: '1/2" PEX-A, hot + cold' },
        { label: 'Drain', value: '2" ABS, 1/4" slope to stack' },
        { label: 'Shutoff', value: 'Quarter-turn, 18" under sink' },
        { label: 'Main shutoff', value: '22 ft away — utility closet' },
      ],
    },
    {
      id: 'bath-stack',
      x: 400,
      y: 522,
      layer: 'plumbing',
      title: 'Bathroom Drain Stack',
      subtitle: 'South exterior wall, full-height run',
      installDate: 'Mar 14, 2023',
      warranty: 'Install workmanship — 2 yr, expires 2025',
      confidence: 0.95,
      items: [
        { label: 'Toilet drain', value: '3" ABS, vented to roof' },
        { label: 'Vent stack', value: '2" ABS, ties in at 8ft' },
        { label: 'Supply lines', value: '1/2" PEX-A, hot + cold' },
        { label: 'Shutoff', value: 'Behind access panel, tub side' },
      ],
    },
    {
      id: 'living-electrical',
      x: 40,
      y: 180,
      layer: 'electrical',
      title: 'Living Room Circuit Run',
      subtitle: 'West exterior wall, outlet chain',
      installDate: 'Mar 20, 2023',
      warranty: 'Panel + breakers — 5 yr, expires 2028',
      confidence: 0.97,
      items: [
        { label: 'Wire', value: '12/2 Romex, 20A circuit' },
        { label: 'Circuit', value: 'Panel slot 7 — AFCI protected' },
        { label: 'Outlets served', value: '3 duplex, 1 switched' },
        { label: 'Stud spacing', value: '16" O.C., 2x6 exterior' },
      ],
    },
    {
      id: 'bedroomA-electrical',
      x: 40,
      y: 440,
      layer: 'electrical',
      title: 'Bedroom A Circuit + Insulation',
      subtitle: 'West exterior wall',
      installDate: 'Mar 21, 2023',
      warranty: 'Insulation — lifetime, R-value guaranteed',
      confidence: 0.93,
      items: [
        { label: 'Wire', value: '14/2 Romex, 15A circuit' },
        { label: 'Circuit', value: 'Panel slot 11' },
        { label: 'Insulation', value: 'R-21 batt, full cavity fill' },
        { label: 'Window header', value: 'Double 2x10, 6ft span' },
      ],
    },
    {
      id: 'hallway-beam',
      x: 400,
      y: 340,
      layer: 'structural',
      title: 'Load-Bearing Header',
      subtitle: 'Hallway wall — verified structural',
      installDate: 'Feb 02, 2023',
      warranty: 'Engineering sign-off on file',
      confidence: 0.99,
      items: [
        { label: 'Member', value: 'LVL 1.75" x 11.25", double ply' },
        { label: 'Span', value: '9ft 4in, bears on 2x6 king studs' },
        { label: 'Joists above', value: '2x10 @ 16" O.C.' },
        { label: 'Inspection', value: 'Framing — passed, Feb 09 2023' },
      ],
    },
    {
      id: 'kitchen-duct',
      x: 400,
      y: 180,
      layer: 'hvac',
      title: 'Kitchen Supply Duct',
      subtitle: 'Dividing wall, ceiling cavity',
      installDate: 'Mar 05, 2023',
      warranty: 'HVAC system — 10 yr parts, expires 2033',
      confidence: 0.9,
      items: [
        { label: 'Duct', value: '6" round flex, insulated R-6' },
        { label: 'Damper', value: 'Balancing damper at branch' },
        { label: 'Return path', value: 'Hallway ceiling, 14"x8" trunk' },
        { label: 'Filter', value: 'MERV 11, change every 90 days' },
      ],
    },
    {
      id: 'panel',
      x: 760,
      y: 150,
      layer: 'electrical',
      title: 'Main Electrical Panel',
      subtitle: 'East exterior wall, utility side',
      installDate: 'Feb 18, 2023',
      warranty: 'Panel — 20 yr, expires 2043',
      confidence: 0.99,
      items: [
        { label: 'Service', value: '200A, Square D QO' },
        { label: 'Breakers', value: '30 slots, 22 active' },
        { label: 'Grounding', value: 'Ground rod, 8ft copper, verified' },
        { label: 'Permit', value: '#EL-2023-3391 — closed, inspected' },
      ],
    },
  ],
}

// -------- Procedural "AI scan output" generator --------

export interface ScanLine {
  points: [number, number][]
  layer: Layer
}

export interface ScanResult {
  seed: number
  floorplan: FloorPlan
  lines: ScanLine[]
  studs: WallSeg[]
  stats: {
    wallsMapped: number
    fixturesFound: number
    circuitsTraced: number
    confidence: number
    sqft: number
  }
}

const PIPE_MATERIALS = ['1/2" PEX-A', '3/4" Copper Type L', '2" ABS drain', '3" cast iron', '1/2" CPVC']
const WIRE_SPECS = ['12/2 Romex, 20A', '14/2 Romex, 15A', '10/3 Romex, 30A', '12/3 Romex, MWBC']
const DUCT_SPECS = ['6" round flex R-6', '8" round flex R-8', '10x6 rigid trunk', '4" bath exhaust']
const STRUCT_SPECS = ['2x6 @ 16" O.C.', 'LVL double header', '2x10 joists @ 16" O.C.', 'Steel I-beam, engineered']
const BRANDS = ['Kohler', 'Moen', 'Rheem', 'Carrier', 'Square D', 'Generac', 'Delta', 'A.O. Smith']

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length) % arr.length]
}

function buildLayoutTemplate(rand: () => number): { rooms: Room[]; walls: WallSeg[] } {
  const templates: Room[][] = [
    [
      { x: 40, y: 40, w: 360, h: 280, label: 'Living Room' },
      { x: 400, y: 40, w: 360, h: 280, label: 'Kitchen' },
      { x: 40, y: 360, w: 280, h: 160, label: 'Bedroom' },
      { x: 320, y: 360, w: 160, h: 160, label: 'Bath' },
      { x: 480, y: 360, w: 280, h: 160, label: 'Primary Bed' },
    ],
    [
      { x: 40, y: 40, w: 460, h: 240, label: 'Living Room' },
      { x: 500, y: 40, w: 260, h: 240, label: 'Kitchen' },
      { x: 40, y: 280, w: 230, h: 240, label: 'Bedroom' },
      { x: 270, y: 280, w: 150, h: 120, label: 'Bath' },
      { x: 270, y: 400, w: 150, h: 120, label: 'Utility' },
      { x: 420, y: 280, w: 340, h: 240, label: 'Primary Bed' },
    ],
    [
      { x: 40, y: 40, w: 300, h: 220, label: 'Office' },
      { x: 340, y: 40, w: 420, h: 220, label: 'Living Room' },
      { x: 40, y: 260, w: 340, h: 260, label: 'Kitchen' },
      { x: 380, y: 260, w: 190, h: 260, label: 'Bath' },
      { x: 570, y: 260, w: 190, h: 130, label: 'Bedroom' },
      { x: 570, y: 390, w: 190, h: 130, label: 'Primary Bed' },
    ],
  ]
  const rooms = templates[Math.floor(rand() * templates.length) % templates.length]
  const walls: WallSeg[] = [
    { x1: 40, y1: 40, x2: 760, y2: 40, exterior: true },
    { x1: 760, y1: 40, x2: 760, y2: 520, exterior: true },
    { x1: 760, y1: 520, x2: 40, y2: 520, exterior: true },
    { x1: 40, y1: 520, x2: 40, y2: 40, exterior: true },
  ]
  for (const r of rooms) {
    walls.push({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y })
    walls.push({ x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h })
    walls.push({ x1: r.x + r.w, y1: r.y + r.h, x2: r.x, y2: r.y + r.h })
    walls.push({ x1: r.x, y1: r.y + r.h, x2: r.x, y2: r.y })
  }
  return { rooms, walls }
}

function jitterPath(rand: () => number, from: [number, number], to: [number, number], segments: number): [number, number][] {
  const pts: [number, number][] = [from]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const x = from[0] + (to[0] - from[0]) * t + (rand() - 0.5) * 14
    const y = from[1] + (to[1] - from[1]) * t + (rand() - 0.5) * 14
    pts.push([x, y])
  }
  pts.push(to)
  return pts
}

export function generateScan(seedInput: string): ScanResult {
  const seed = seedFromString(seedInput || 'stratum')
  const rand = mulberry32(seed)
  const { rooms, walls } = buildLayoutTemplate(rand)

  const hub: [number, number] = [rand() * 60 + 60, rand() * 60 + 460]
  const lines: ScanLine[] = []
  const layers: Layer[] = ['plumbing', 'electrical', 'hvac']

  rooms.forEach((r, i) => {
    const target: [number, number] = [r.x + r.w * (0.3 + rand() * 0.4), r.y + r.h * (0.3 + rand() * 0.4)]
    const layer = layers[i % layers.length]
    lines.push({ layer, points: jitterPath(rand, hub, target, 4 + Math.floor(rand() * 3)) })
    if (rand() > 0.5) {
      const layer2 = layers[(i + 1) % layers.length]
      lines.push({ layer: layer2, points: jitterPath(rand, hub, target, 4) })
    }
  })

  const studs: WallSeg[] = []
  for (const w of walls) {
    if (!w.exterior) continue
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
    const count = Math.floor(len / 32)
    for (let i = 1; i < count; i++) {
      const t = i / count
      const x = w.x1 + (w.x2 - w.x1) * t
      const y = w.y1 + (w.y2 - w.y1) * t
      const nx = -(w.y2 - w.y1) / len
      const ny = (w.x2 - w.x1) / len
      studs.push({ x1: x - nx * 6, y1: y - ny * 6, x2: x + nx * 6, y2: y + ny * 6 })
    }
  }

  const interiorWalls = walls.filter((w) => !w.exterior)
  const hotspotCount = 4 + Math.floor(rand() * 3)
  const hotspots: Hotspot[] = []
  const layerPool: Layer[] = ['plumbing', 'electrical', 'structural', 'hvac']
  for (let i = 0; i < hotspotCount; i++) {
    const wallPool = i % 2 === 0 && interiorWalls.length ? interiorWalls : walls
    const w = pick(rand, wallPool)
    const t = 0.25 + rand() * 0.5
    const x = w.x1 + (w.x2 - w.x1) * t
    const y = w.y1 + (w.y2 - w.y1) * t
    const layer = layerPool[i % layerPool.length]
    const room = pick(rand, rooms).label
    const dateMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const install = `${pick(rand, dateMonths)} ${1 + Math.floor(rand() * 27)}, 2024`
    const brand = pick(rand, BRANDS)

    let items: DetailItem[] = []
    let title = ''
    if (layer === 'plumbing') {
      title = `${room} Supply & Drain`
      items = [
        { label: 'Line', value: pick(rand, PIPE_MATERIALS) },
        { label: 'Shutoff', value: `${4 + Math.floor(rand() * 20)} ft to nearest valve` },
        { label: 'Fixture brand', value: brand },
        { label: 'Pressure test', value: rand() > 0.5 ? 'Passed — 80 psi static' : 'Passed — 72 psi static' },
      ]
    } else if (layer === 'electrical') {
      title = `${room} Circuit Run`
      items = [
        { label: 'Wire', value: pick(rand, WIRE_SPECS) },
        { label: 'Breaker slot', value: `Panel slot ${1 + Math.floor(rand() * 30)}` },
        { label: 'Protection', value: rand() > 0.5 ? 'AFCI' : 'GFCI + AFCI' },
        { label: 'Fixture brand', value: brand },
      ]
    } else if (layer === 'hvac') {
      title = `${room} Duct Branch`
      items = [
        { label: 'Duct', value: pick(rand, DUCT_SPECS) },
        { label: 'Damper', value: rand() > 0.5 ? 'Balancing damper present' : 'No damper detected' },
        { label: 'System', value: brand },
        { label: 'Airflow test', value: `${60 + Math.floor(rand() * 80)} CFM measured` },
      ]
    } else {
      title = `${room} Framing`
      items = [
        { label: 'Member', value: pick(rand, STRUCT_SPECS) },
        { label: 'Load path', value: rand() > 0.6 ? 'Load-bearing — verified' : 'Non-load-bearing' },
        { label: 'Spacing', value: '16" O.C.' },
        { label: 'Inspection', value: rand() > 0.5 ? 'Framing passed' : 'Pending final inspection' },
      ]
    }

    hotspots.push({
      id: `scan-${i}`,
      x,
      y,
      layer,
      title,
      subtitle: `Detected in ${room.toLowerCase()}`,
      installDate: install,
      warranty: rand() > 0.5 ? `${brand} — ${2 + Math.floor(rand() * 8)} yr warranty` : 'Workmanship — 1 yr',
      confidence: 0.82 + rand() * 0.17,
      items,
    })
  }

  const sqft = Math.round(rooms.reduce((sum, r) => sum + (r.w * r.h) / 144, 0))

  return {
    seed,
    floorplan: { viewBox: [0, 0, 800, 560], rooms, walls, hotspots },
    lines,
    studs,
    stats: {
      wallsMapped: walls.length,
      fixturesFound: hotspots.length,
      circuitsTraced: lines.filter((l) => l.layer === 'electrical').length,
      confidence: Math.round((0.9 + rand() * 0.09) * 100) / 100,
      sqft,
    },
  }
}
