import { motion } from 'framer-motion'
import { Download, Eye, Lock, ShieldCheck, History, UserCheck } from 'lucide-react'
import { Container, SectionHeading } from './ui'

const POINTS = [
  { icon: UserCheck, title: 'Owner-controlled access', body: 'Nothing is visible to a trade, buyer or agent until the current owner grants it.' },
  { icon: Lock, title: 'Encrypted at rest & in transit', body: 'Every scan, document and diagram is encrypted the moment it enters the record.' },
  { icon: History, title: 'Full audit log', body: 'Every view, edit and access grant is timestamped and attached to the passport.' },
  { icon: Eye, title: 'Revoke anytime', body: 'Access expires automatically at the end of a job, or the owner can pull it early.' },
  { icon: Download, title: 'Your data, portable', body: 'Export the full record at any time. The passport belongs to the property owner — not to us.' },
  { icon: ShieldCheck, title: 'Verified contributions', body: 'Every entry is tied to the licensed pro or inspector who made it — no anonymous edits.' },
]

export function Trust() {
  return (
    <section className="relative border-y border-hair bg-surface/30 py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Security & permissioning" title="Built to be trusted with your walls" align="center" />

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="flex items-start gap-4"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-hair-strong bg-void text-cyan-soft">
                <Icon className="size-4" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-medium text-fg">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-dim">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
