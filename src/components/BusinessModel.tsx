import { motion } from 'framer-motion'
import { Building2, Check, HardHat, Home } from 'lucide-react'
import { Container, SectionHeading, Button, Badge } from './ui'

const TIERS = [
  {
    icon: Home,
    name: 'Homeowners',
    price: '$49',
    period: 'one-time / property',
    tagline: 'First scan free — pay only once you know it’s worth keeping',
    features: [
      'Full X-ray record for one property',
      'Unlimited scans after unlocking',
      'Transfers free when you sell',
      'Export or share a public link anytime',
    ],
    cta: 'Start a property',
    highlight: false,
  },
  {
    icon: HardHat,
    name: 'Contractors — Crew',
    price: '$99',
    period: '/ month',
    tagline: 'For a small crew running scans across many jobs',
    features: [
      'Unlimited properties',
      '100 scans included per month',
      'No per-property unlock fee',
      'Cancel anytime',
    ],
    cta: 'Subscribe',
    highlight: true,
  },
  {
    icon: Building2,
    name: 'Contractors — Company',
    price: '$249',
    period: '/ month',
    tagline: 'For larger operations running scans daily',
    features: [
      'Unlimited properties',
      'Unlimited scans',
      'No per-property unlock fee',
      'Cancel anytime',
    ],
    cta: 'Subscribe',
    highlight: false,
  },
]

export function BusinessModel() {
  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="Business model"
          title="Aligned with everyone who touches the building"
          description="Homeowners pay once, per property, only after the first free scan proves the value. Contractors running scans across many jobs subscribe instead — a monthly plan with no per-property fee. A Solo plan ($39/mo, 20 scans) is also available inside Vault for individual contractors."
          align="center"
        />

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map(({ icon: Icon, name, price, period, tagline, features, cta, highlight }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                highlight ? 'border-cyan/40 bg-gradient-to-b from-cyan/[0.07] to-surface shadow-[0_0_0_1px_rgba(46,230,255,0.15),0_30px_60px_-24px_rgba(46,230,255,0.25)]' : 'border-hair bg-surface/50'
              }`}
            >
              {highlight && (
                <span className="absolute -top-3 left-7">
                  <Badge tone="cyan">Most common</Badge>
                </span>
              )}
              <div className={`flex size-10 items-center justify-center rounded-xl border ${highlight ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-hair-strong bg-void text-fg-dim'}`}>
                <Icon className="size-4.5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-lg font-medium text-fg">{name}</h3>
              <p className="mt-1 text-[13px] text-fg-dim">{tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-medium text-fg">{price}</span>
                <span className="text-sm text-fg-faint">{period}</span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-fg-dim">
                    <Check className={`mt-0.5 size-3.5 shrink-0 ${highlight ? 'text-cyan' : 'text-fg-faint'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={highlight ? 'primary' : 'secondary'}
                className="mt-7 w-full"
                onClick={() => document.getElementById('vault')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {cta}
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-lg text-center text-[12px] text-fg-faint">
          Live pricing — sign in to Stratum Vault above to start a property or subscribe.
        </p>

        <div className="mx-auto mt-14 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-hair bg-surface/40 px-8 py-7 text-center">
          <Badge tone="amber">Pilot phase</Badge>
          <p className="text-[14px] leading-relaxed text-fg-dim">
            We're working with an early group of homeowners and contractors while the product takes shape. If
            you've got a project breaking ground or opening walls, we'd like to document it.
          </p>
        </div>
      </Container>
    </section>
  )
}
