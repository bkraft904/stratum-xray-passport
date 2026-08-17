import { ScanLine } from 'lucide-react'
import { Container } from './ui'

const COLUMNS = [
  {
    title: 'Product',
    links: ['How it works', 'Live demo', 'Scan Lab', 'Pricing'],
  },
  {
    title: 'For',
    links: ['Contractors', 'Homeowners', 'Trade professionals', 'Restoration companies'],
  },
  {
    title: 'Company',
    links: ['About', 'Pilot program', 'Careers', 'Contact'],
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-hair py-16">
      <Container>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
                <ScanLine className="size-4.5" strokeWidth={2} />
              </span>
              <span className="font-display text-[17px] font-medium tracking-tight text-fg">Stratum</span>
            </a>
            <p className="mt-4 max-w-[240px] text-[13px] leading-relaxed text-fg-faint">
              The permanent X-ray record for every building. Captured before the walls close, transferable for life.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-faint">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="text-[13.5px] text-fg-dim transition-colors hover:text-fg">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-hair pt-6 text-[12px] text-fg-faint sm:flex-row">
          <span>© {new Date().getFullYear()} Stratum. All rights reserved.</span>
          <span>Every building has a story. We make sure it doesn't get erased.</span>
        </div>
      </Container>
    </footer>
  )
}
