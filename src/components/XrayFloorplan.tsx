import { useState } from 'react'
import type { FloorPlan, Hotspot, Layer, ScanLine, WallSeg } from '../lib/floorplan'
import { LAYER_META } from '../lib/floorplan'

const LAYER_STROKE: Record<Layer, string> = {
  structural: '#ffb02e',
  plumbing: '#2ee6ff',
  electrical: '#ffe14d',
  hvac: '#8b7bff',
}

export function XrayFloorplan({
  floorplan,
  activeLayers,
  lines = [],
  studs = [],
  selectedId,
  onSelect,
  sweeping = false,
  dim = false,
}: {
  floorplan: FloorPlan
  activeLayers: Set<Layer>
  lines?: ScanLine[]
  studs?: WallSeg[]
  selectedId: string | null
  onSelect: (h: Hotspot | null) => void
  sweeping?: boolean
  dim?: boolean
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [vbX, vbY, vbW, vbH] = floorplan.viewBox

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="h-full w-full select-none"
      role="img"
      aria-label="X-ray floor plan diagram"
    >
      <defs>
        <pattern id="fp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(210,222,255,0.05)" strokeWidth="1" />
        </pattern>
        <linearGradient id="fp-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ee6ff" stopOpacity="0" />
          <stop offset="50%" stopColor="#2ee6ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#2ee6ff" stopOpacity="0" />
        </linearGradient>
        {(['structural', 'plumbing', 'electrical', 'hvac'] as Layer[]).map((l) => (
          <filter id={`glow-${l}`} key={l} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#fp-grid)" />

      {/* Rooms */}
      {floorplan.rooms.map((r, i) => (
        <g key={i}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill="rgba(255,255,255,0.015)"
            stroke="none"
          />
          <text
            x={r.x + 14}
            y={r.y + 26}
            fill="rgba(238,241,248,0.38)"
            fontSize="13"
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="0.5"
          >
            {r.label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Overlay run lines (pipes / wires / ducts) */}
      {lines
        .filter((l) => activeLayers.has(l.layer))
        .map((l, i) => (
          <polyline
            key={i}
            points={l.points.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke={LAYER_STROKE[l.layer]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 7"
            opacity={0.75}
            filter={`url(#glow-${l.layer})`}
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.1s" repeatCount="indefinite" />
          </polyline>
        ))}

      {/* Studs */}
      {activeLayers.has('structural') &&
        studs.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#ffb02e" strokeWidth={2} opacity={0.55} />
        ))}

      {/* Walls */}
      {floorplan.walls.map((w, i) => (
        <line
          key={i}
          x1={w.x1}
          y1={w.y1}
          x2={w.x2}
          y2={w.y2}
          stroke={w.exterior ? 'rgba(238,241,248,0.55)' : 'rgba(238,241,248,0.3)'}
          strokeWidth={w.exterior ? 4 : 2.5}
          strokeLinecap="square"
        />
      ))}

      {/* Scan sweep */}
      {sweeping && (
        <rect x={vbX} y={vbY} width={vbW} height="90" fill="url(#fp-fade)">
          <animate attributeName="y" from={vbY - 90} to={vbY + vbH} dur="2.6s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Hotspots */}
      {floorplan.hotspots
        .filter((h) => activeLayers.has(h.layer))
        .map((h) => {
          const isSelected = selectedId === h.id
          const isHover = hoverId === h.id
          const color = LAYER_META[h.layer].color
          return (
            <g
              key={h.id}
              transform={`translate(${h.x}, ${h.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoverId(h.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelect(isSelected ? null : h)}
            >
              <circle r={isSelected ? 15 : 11} fill={color} opacity={0.12} className={isSelected ? '' : 'animate-pulse-soft'} />
              <circle r={isSelected || isHover ? 6.5 : 5} fill={color} filter={`url(#glow-${h.layer})`} stroke="#04050a" strokeWidth={1.5} />
              {(isHover || isSelected) && (
                <text
                  x={0}
                  y={-16}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="12"
                  fontWeight={600}
                  fill="#eef1f8"
                  className="pointer-events-none"
                >
                  {h.title}
                </text>
              )}
            </g>
          )
        })}

      {dim && <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#04050a" opacity={0.55} />}
    </svg>
  )
}
