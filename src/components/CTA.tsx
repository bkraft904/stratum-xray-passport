import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ScanLine } from 'lucide-react'
import { Container, Button } from './ui'

export function CTA() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'owner' | 'contractor' | 'trade'>('owner')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <section id="cta" className="relative py-24 md:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] border border-hair bg-gradient-to-b from-surface to-surface/40 px-6 py-16 text-center md:px-16 md:py-20">
          <div className="pointer-events-none absolute inset-0 bp-grid-fine opacity-40" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/20 blur-[130px]" />

          <div className="relative flex flex-col items-center gap-6">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">
              <ScanLine className="size-5" />
            </span>
            <h2 className="max-w-xl font-display text-3xl font-medium leading-[1.1] tracking-tight text-fg md:text-[40px]">
              Stop building on top of secrets.
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-fg-dim">
              Join the early access list — as an owner, a contractor, or a trade pro. Pilot slots are opening in a
              handful of markets first.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-full border border-green/30 bg-green/10 px-5 py-3 text-sm text-green"
              >
                <CheckCircle2 className="size-4" /> You're on the list — we'll be in touch.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3">
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="flex-1 rounded-full border border-hair-strong bg-void px-4 py-3 text-sm text-fg placeholder:text-fg-faint focus:border-cyan/50 focus:outline-none"
                  />
                  <Button type="submit" variant="primary" className="shrink-0">
                    Get early access <ArrowRight className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-fg-faint">
                  {(['owner', 'contractor', 'trade'] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`rounded-full border px-3 py-1.5 capitalize transition-colors ${
                        role === r ? 'border-cyan/40 bg-cyan/10 text-cyan-soft' : 'border-hair text-fg-faint hover:text-fg-dim'
                      }`}
                    >
                      {r === 'trade' ? 'Trade pro' : r}
                    </button>
                  ))}
                </div>
              </form>
            )}

            <p className="text-[11px] text-fg-faint">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </Container>
    </section>
  )
}
