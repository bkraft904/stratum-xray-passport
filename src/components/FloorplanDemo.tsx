import { useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import { Container, SectionHeading, Badge } from './ui'
import { XrayFloorplan } from './XrayFloorplan'
import { HotspotPanel } from './HotspotPanel'
import { LayerToggle } from './LayerToggle'
import { DEMO_FLOORPLAN, type Hotspot, type Layer } from '../lib/floorplan'

export function FloorplanDemo() {
  const [selected, setSelected] = useState<Hotspot | null>(null)
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['structural', 'plumbing', 'electrical', 'hvac']))

  return (
    <section id="behind-the-wall" className="relative py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="Live demo"
          icon={<MousePointerClick className="size-3" />}
          title="Click a wall. See what's inside."
          description="This is a real Building Passport for a sample property. Toggle layers, click any glowing point, and see the exact record an owner or trade would see before touching that wall."
          align="center"
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="glass overflow-hidden rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-4">
              <LayerToggle active={activeLayers} onChange={setActiveLayers} />
              <Badge tone="green">Passport #A118 — verified</Badge>
            </div>
            <div className="aspect-[8/6] w-full overflow-hidden rounded-xl border border-hair bg-ink">
              <XrayFloorplan
                floorplan={DEMO_FLOORPLAN}
                activeLayers={activeLayers}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            </div>
          </div>

          <div className="min-h-[420px]">
            <HotspotPanel hotspot={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      </Container>
    </section>
  )
}
