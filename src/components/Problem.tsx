import { motion } from 'framer-motion'
import { AlertTriangle, DollarSign, HardHat, Hourglass } from 'lucide-react'
import { Container, SectionHeading } from './ui'

const COSTS = [
  { icon: Hourglass, stat: 'Days', label: 'lost opening walls to find what’s inside before work can even start' },
  { icon: DollarSign, stat: '$$$', label: 'in unplanned demo, patching and re-permitting when a line is cut blind' },
  { icon: HardHat, stat: '0', label: 'records handed to the next owner, contractor or trade on the job' },
]

export function Problem() {
  return (
    <section className="relative py-24 md:py-32">
      <Container className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <SectionHeading
          eyebrow="The problem"
          icon={<AlertTriangle className="size-3" />}
          title={
            <>
              Drywall goes up. <span className="text-fg-faint">Every memory of what&rsquo;s inside the wall goes with it.</span>
            </>
          }
          description="Every renovation, leak repair and equipment swap starts the same way: guessing. Studs get drilled through live wires. Slabs get cut over buried drains. The plans — if they ever existed — are in a drawer three owners ago."
        />

        <div className="flex flex-col gap-3">
          {COSTS.map(({ icon: Icon, stat, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass flex items-center gap-4 rounded-2xl p-5"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red/25 bg-red/10 text-red">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-display text-lg font-medium text-fg">{stat}</div>
                <div className="text-[13.5px] leading-snug text-fg-dim">{label}</div>
              </div>
            </motion.div>
          ))}
          <p className="mt-1 px-1 text-[12.5px] leading-relaxed text-fg-faint">
            Commercial builds solve this with BIM and enterprise documentation. Homes, renovations and small
            commercial buildings — the vast majority of what gets built — get nothing.
          </p>
        </div>
      </Container>
    </section>
  )
}
