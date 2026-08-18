import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, ShieldCheck } from 'lucide-react'
import { Container, Badge, CardShell } from './ui'
import { getPublicProperty, type PublicScan } from '../lib/vaultApi'

export function PublicPropertyView({ propertyId }: { propertyId: string }) {
  const [address, setAddress] = useState<string | null>(null)
  const [scans, setScans] = useState<PublicScan[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPublicProperty(propertyId)
      .then(({ address: a, scans: s }) => {
        setAddress(a)
        setScans(s)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this property.'))
  }, [propertyId])

  return (
    <div className="relative min-h-screen bg-void">
      <Container className="flex flex-col gap-8 py-24">
        <div className="flex items-center gap-2 text-cyan-soft">
          <ShieldCheck size={16} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Stratum property record</span>
        </div>

        {error ? (
          <p className="text-fg-dim">{error}</p>
        ) : !address ? (
          <p className="text-fg-dim">Loading…</p>
        ) : (
          <>
            <h1 className="flex items-center gap-3 font-display text-3xl text-fg">
              <Building2 className="text-cyan-soft" size={26} />
              {address}
            </h1>
            <p className="text-fg-dim">
              {scans.length} recorded scan{scans.length === 1 ? '' : 's'} — shared by the property owner as a documented history of what's behind the walls.
            </p>
            <div className="flex flex-col gap-3">
              {scans.map((scan) => (
                <motion.div key={scan.scanId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <CardShell className="p-5">
                    <div className="flex items-center justify-between">
                      <Badge tone="cyan">{scan.imageType.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-fg-dim">{new Date(scan.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-fg">{scan.summary}</p>
                    {scan.findings.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-1 text-xs text-fg-dim">
                        {scan.findings.map((f, i) => (
                          <li key={i}>
                            <span className="text-fg">{f.label}</span> — {f.description}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </CardShell>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </Container>
    </div>
  )
}
