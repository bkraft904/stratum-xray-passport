import type { Layer } from '../lib/floorplan'
import { LAYER_META } from '../lib/floorplan'

const ORDER: Layer[] = ['structural', 'plumbing', 'electrical', 'hvac']

export function LayerToggle({ active, onChange }: { active: Set<Layer>; onChange: (next: Set<Layer>) => void }) {
  function toggle(layer: Layer) {
    const next = new Set(active)
    if (next.has(layer)) next.delete(layer)
    else next.add(layer)
    onChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ORDER.map((layer) => {
        const meta = LAYER_META[layer]
        const isOn = active.has(layer)
        return (
          <button
            key={layer}
            onClick={() => toggle(layer)}
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all duration-150"
            style={{
              borderColor: isOn ? `${meta.color}66` : 'var(--color-hair)',
              background: isOn ? `${meta.color}14` : 'transparent',
              color: isOn ? meta.color : 'var(--color-fg-faint)',
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: isOn ? meta.color : '#3a4051', boxShadow: isOn ? `0 0 6px ${meta.color}` : 'none' }} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
