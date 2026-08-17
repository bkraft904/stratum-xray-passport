import { useEffect, useState } from 'react'
import { Menu, ScanLine, X } from 'lucide-react'
import { Container, Button } from './ui'

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#behind-the-wall', label: 'Live demo' },
  { href: '#scan-lab', label: 'Scan Lab' },
  { href: '#pricing', label: 'Pricing' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-hair bg-void/80 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'}`}>
      <Container className="flex h-[68px] items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
            <ScanLine className="size-4.5" strokeWidth={2} />
          </span>
          <span className="font-display text-[17px] font-medium tracking-tight text-fg">Stratum</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13.5px] text-fg-dim transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" onClick={() => document.getElementById('scan-lab')?.scrollIntoView({ behavior: 'smooth' })}>
            Try the Scan Lab
          </Button>
          <Button variant="primary" onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}>
            Get early access
          </Button>
        </div>

        <button className="p-2 text-fg md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-hair bg-void/95 backdrop-blur-xl md:hidden">
          <Container className="flex flex-col gap-4 py-5">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-fg-dim hover:text-fg">
                {l.label}
              </a>
            ))}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setOpen(false)
                document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Get early access
            </Button>
          </Container>
        </div>
      )}
    </header>
  )
}
