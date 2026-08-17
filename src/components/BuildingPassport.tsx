import { motion } from 'framer-motion'
import { ArrowRightLeft, BadgeCheck, FileStack, ScanLine } from 'lucide-react'
import { Container, SectionHeading, Badge } from './ui'

const TRANSFER_EVENTS = [
  { who: 'Meridian Builders', what: 'Ground-up construction record', date: '2023' },
  { who: 'The Alvarez Family', what: 'Purchased — passport transferred', date: '2024' },
  { who: 'CoolFlow HVAC', what: 'System replacement, permitted', date: '2025' },
  { who: 'Owner-pending', what: 'Next transfer appends here', date: '—' },
]

function FakeQr() {
  const cells = Array.from({ length: 49 }, (_, i) => (i * 928371 + 17) % 5 < 2)
  return (
    <div className="grid grid-cols-7 gap-[3px] rounded-md bg-void p-2">
      {cells.map((on, i) => (
        <div key={i} className={`aspect-square rounded-[1.5px] ${on ? 'bg-fg' : 'bg-transparent'}`} />
      ))}
    </div>
  )
}

export function BuildingPassport() {
  return (
    <section className="relative overflow-hidden border-y border-hair bg-surface/30 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bp-grid opacity-40" />
      <Container className="relative grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <SectionHeading
          eyebrow="The Building Passport"
          icon={<FileStack className="size-3" />}
          title="A record that belongs to the building, not the owner"
          description="Every property gets one passport for life. It moves with the sale, absorbs every renovation, and grants nothing to anyone without the current owner's permission — encryption and access control included, not bolted on."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="glass relative overflow-hidden rounded-2xl p-6 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.7)]">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-cyan/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan">
                <ScanLine className="size-4" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em]">Building Passport</span>
              </div>
              <Badge tone="green">
                <BadgeCheck className="size-3" /> Verified
              </Badge>
            </div>

            <div className="mt-5">
              <div className="font-display text-xl font-medium text-fg">142 Birchwood Lane</div>
              <div className="text-xs text-fg-faint">Passport #A118 &middot; Issued Feb 2023</div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <div className="text-fg-faint">Components logged</div>
                  <div className="mt-0.5 font-mono text-sm text-fg">1,284</div>
                </div>
                <div>
                  <div className="text-fg-faint">Active warranties</div>
                  <div className="mt-0.5 font-mono text-sm text-fg">22</div>
                </div>
                <div>
                  <div className="text-fg-faint">Trades w/ access</div>
                  <div className="mt-0.5 font-mono text-sm text-fg">3</div>
                </div>
                <div>
                  <div className="text-fg-faint">Transfers</div>
                  <div className="mt-0.5 font-mono text-sm text-fg">1</div>
                </div>
              </div>
              <FakeQr />
            </div>

            <div className="mt-6 border-t border-hair pt-4">
              <div className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-fg-faint">
                <ArrowRightLeft className="size-3.5" /> Chain of record
              </div>
              <div className="flex flex-col gap-2.5">
                {TRANSFER_EVENTS.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className={`size-1.5 shrink-0 rounded-full ${i === TRANSFER_EVENTS.length - 1 ? 'bg-fg-faint' : 'bg-cyan'}`} />
                    <span className="flex-1 truncate text-fg-dim">{ev.who} — {ev.what}</span>
                    <span className="shrink-0 font-mono text-fg-faint">{ev.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
