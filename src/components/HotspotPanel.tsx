import { Calendar, ShieldCheck, X, Radar } from 'lucide-react'
import type { Hotspot } from '../lib/floorplan'
import { LAYER_META } from '../lib/floorplan'

export function HotspotPanel({ hotspot, onClose }: { hotspot: Hotspot | null; onClose: () => void }) {
  if (!hotspot) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hair-strong bg-surface/40 p-8 text-center">
        <Radar className="size-6 text-fg-faint" strokeWidth={1.5} />
        <p className="max-w-[220px] text-sm text-fg-faint">Click any glowing point on the floor plan to see what&rsquo;s behind that wall.</p>
      </div>
    )
  }

  const meta = LAYER_META[hotspot.layer]

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-hair-strong bg-surface-2/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
            style={{ color: meta.color, borderColor: `${meta.color}4d`, background: `${meta.color}1a` }}
          >
            {meta.label}
          </span>
          <h4 className="mt-2.5 font-display text-lg font-medium text-fg">{hotspot.title}</h4>
          <p className="mt-0.5 text-xs text-fg-faint">{hotspot.subtitle}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-fg-faint transition hover:bg-white/5 hover:text-fg" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {hotspot.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 border-b border-hair py-2 text-sm last:border-0">
            <span className="text-fg-faint">{item.label}</span>
            <span className="font-mono text-[13px] text-fg">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-hair pt-3 text-xs text-fg-dim">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5 text-fg-faint" /> {hotspot.installDate}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-green" /> {hotspot.warranty}
        </span>
        {typeof hotspot.confidence === 'number' && (
          <span className="ml-auto font-mono text-[11px] text-cyan-soft">{Math.round(hotspot.confidence * 100)}% confidence</span>
        )}
      </div>
    </div>
  )
}
