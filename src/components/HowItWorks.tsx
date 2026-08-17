import { motion } from 'framer-motion'
import { Camera, FileStack, KeyRound, Workflow } from 'lucide-react'
import { Container, SectionHeading } from './ui'

const STEPS = [
  {
    icon: Camera,
    tag: '01 — Before close-in',
    title: 'Contractor documents the open walls',
    body: 'Walk every stud bay with a phone. Photos, 3D scans, serials and shutoffs — captured in the minutes before drywall goes up, on the job you’re already doing.',
  },
  {
    icon: Workflow,
    tag: '02 — Processed',
    title: 'Stratum builds the X-ray record',
    body: 'AI stitches footage into a floor-accurate diagram, layered by trade — structural, plumbing, electrical, HVAC — cross-checked against permits and inspection reports.',
  },
  {
    icon: FileStack,
    tag: '03 — Delivered',
    title: 'Owner receives a Building Passport',
    body: 'A living, transferable record of the property: materials, install dates, warranties, and every modification made after — tied to the address, not the owner.',
  },
  {
    icon: KeyRound,
    tag: '04 — Ongoing',
    title: 'Trades get permissioned access',
    body: 'Plumbers, electricians and restoration crews request access for the job at hand. The owner approves. No more blind drilling, ever.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-y border-hair bg-surface/30 py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From open stud bay to permanent record"
          description="One capture pass on site. A record that outlives the renovation, the sale, and the next three owners."
          align="center"
        />

        <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-hair-strong to-transparent lg:block" />
          {STEPS.map(({ icon: Icon, tag, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col gap-4"
            >
              <div className="relative flex size-[52px] items-center justify-center rounded-2xl border border-cyan/25 bg-void text-cyan">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-faint">{tag}</div>
                <h3 className="mt-2 font-display text-[17px] font-medium leading-snug text-fg">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fg-dim">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
