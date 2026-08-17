import { motion } from 'framer-motion'
import {
  Barcode,
  CalendarClock,
  Camera,
  Droplets,
  History,
  Layers3,
  Palette,
  ShieldCheck,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react'
import { Container, SectionHeading } from './ui'

const FEATURES = [
  {
    icon: Layers3,
    title: 'Every hidden system, mapped',
    body: 'Exact locations of pipes, wiring, drains, ducts, blocking and structural members — logged to the inch, not the memory of whoever framed it.',
    span: 'lg:col-span-2',
    chips: [Droplets, Zap, Wind],
  },
  {
    icon: Camera,
    title: 'Photos & 3D scans',
    body: 'Full visual coverage of every stud bay, captured before the walls close.',
    span: '',
  },
  {
    icon: Wrench,
    title: 'Shutoff locations',
    body: 'Water, gas and electrical shutoffs pinned and one tap away in an emergency.',
    span: '',
  },
  {
    icon: Barcode,
    title: 'Product models & serials',
    body: 'Every fixture, appliance and system logged with make, model and serial for instant lookup.',
    span: '',
  },
  {
    icon: Palette,
    title: 'Material specifications',
    body: 'Paint codes, flooring runs and finish specs — so a touch-up matches the first time.',
    span: '',
  },
  {
    icon: CalendarClock,
    title: 'Installation dates',
    body: 'Know exactly how old every system is before it fails, not after.',
    span: '',
  },
  {
    icon: ShieldCheck,
    title: 'Warranties, permits & inspections',
    body: 'Every warranty, permit and inspection report attached to the exact component it covers.',
    span: 'lg:col-span-2',
  },
  {
    icon: History,
    title: 'A living modification history',
    body: 'Every future renovation, repair and system swap appends to the record instead of replacing it — so the passport only ever gets more complete.',
    span: 'lg:col-span-3',
  },
]

export function FeatureGrid() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="What gets recorded"
          title="Everything a wall would tell you, if it could talk"
          description="Stratum captures the full picture once, at the moment it's cheapest and most complete to capture — before it disappears behind finish materials."
          align="center"
        />

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, span, chips }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className={`group relative overflow-hidden rounded-2xl border border-hair bg-surface/50 p-6 transition-colors duration-300 hover:border-cyan/30 hover:bg-surface-2/60 ${span}`}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-cyan/0 blur-2xl transition-all duration-500 group-hover:bg-cyan/10" />
              <div className="flex size-10 items-center justify-center rounded-xl border border-hair-strong bg-void text-cyan-soft">
                <Icon className="size-4.5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 font-display text-[16px] font-medium text-fg">{title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-dim">{body}</p>
              {chips && (
                <div className="mt-4 flex gap-2">
                  {chips.map((C, ci) => (
                    <span key={ci} className="flex size-7 items-center justify-center rounded-lg border border-hair bg-void text-fg-faint">
                      <C className="size-3.5" strokeWidth={1.75} />
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
