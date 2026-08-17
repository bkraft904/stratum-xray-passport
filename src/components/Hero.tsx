import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react'
import { Container, Button, Eyebrow } from './ui'
import { XrayFloorplan } from './XrayFloorplan'
import { HotspotPanel } from './HotspotPanel'
import { DEMO_FLOORPLAN, type Hotspot, type Layer } from '../lib/floorplan'

const ALL_LAYERS = new Set<Layer>(['structural', 'plumbing', 'electrical', 'hvac'])

export function Hero() {
  const [selected, setSelected] = useState<Hotspot | null>(null)

  return (
    <section id="top" className="relative overflow-hidden pb-24 pt-40 md:pb-32 md:pt-48">
      <div className="pointer-events-none absolute inset-0 bp-grid mask-fade-b opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-160px] top-[280px] h-[380px] w-[380px] rounded-full bg-violet/15 blur-[120px]" />

      <Container className="relative grid grid-cols-1 items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col items-start gap-7"
        >
          <Eyebrow icon={<Sparkles className="size-3" />}>The building passport company</Eyebrow>

          <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-tight text-fg sm:text-[52px] lg:text-[58px]">
            Every wall keeps a secret.
            <br />
            <span className="text-cyan text-glow-cyan">We record it before it closes.</span>
          </h1>

          <p className="max-w-lg text-[16px] leading-relaxed text-fg-dim md:text-[17px]">
            Stratum is the permanent X-ray record for buildings — exact locations of pipes, wiring, ducts and
            structure, captured before drywall goes up. Click a wall. See what&rsquo;s behind it. Forever.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => document.getElementById('scan-lab')?.scrollIntoView({ behavior: 'smooth' })}>
              Upload a walkthrough <ArrowRight className="size-4" />
            </Button>
            <Button variant="secondary" onClick={() => document.getElementById('behind-the-wall')?.scrollIntoView({ behavior: 'smooth' })}>
              <PlayCircle className="size-4" /> See a live X-ray
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-6 border-t border-hair pt-6">
            {[
              ['1,200+', 'components logged per home'],
              ['<24 hrs', 'from scan to passport'],
              ['100%', 'transferable at sale'],
            ].map(([stat, label]) => (
              <div key={label}>
                <div className="font-display text-xl font-medium text-fg md:text-2xl">{stat}</div>
                <div className="mt-1 text-[11.5px] leading-snug text-fg-faint">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-cyan/15 via-transparent to-violet/15 blur-2xl" />
          <div className="glass relative overflow-hidden rounded-2xl p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red/60" />
                <span className="size-2.5 rounded-full bg-amber/60" />
                <span className="size-2.5 rounded-full bg-green/60" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-fg-faint">142 Birchwood Ln — Passport #A118</span>
            </div>
            <div className="aspect-[8/6] w-full overflow-hidden rounded-xl border border-hair bg-ink">
              <XrayFloorplan
                floorplan={DEMO_FLOORPLAN}
                activeLayers={ALL_LAYERS}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                sweeping
              />
            </div>
            <div className="mt-3 px-1 pb-1">
              <HotspotPanel hotspot={selected} onClose={() => setSelected(null)} />
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="glass absolute -left-8 top-10 hidden rounded-xl px-3.5 py-2.5 shadow-lg lg:block"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">Live scan</div>
            <div className="mt-0.5 text-sm font-medium text-cyan-soft">7 layers mapped</div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="glass absolute -right-6 bottom-16 hidden rounded-xl px-3.5 py-2.5 shadow-lg lg:block"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">Warranty tracked</div>
            <div className="mt-0.5 text-sm font-medium text-green">22 active</div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  )
}
