import { useEffect, useMemo, useState } from 'react'
import { getAdminStats, type AdminStats, type AdminEvent } from '../lib/vaultApi'
import { CardShell, Button } from './ui'

// Fixed categorical order, validated against the site's dark surface with
// scripts/validate_palette.js (dataviz skill) — never reorder or recolor
// without re-running it. Darkened/re-saturated from the raw brand accents
// (--color-cyan etc.) since those sit too light for a chart mark on this
// surface; kept in the same hue family so they still read as "Stratum."
const SERIES: { key: string; label: string; color: string; match: (t: string) => boolean }[] = [
  { key: 'sign_in_completed', label: 'Sign-ins', color: '#008ea7', match: (t) => t === 'sign_in_completed' },
  { key: 'paywall_hit', label: 'Paywall hits', color: '#d7284d', match: (t) => t === 'paywall_hit' },
  { key: 'property_created', label: 'Properties created', color: '#735de6', match: (t) => t === 'property_created' },
  {
    key: 'revenue',
    label: 'Revenue events',
    color: '#009757',
    match: (t) => t === 'checkout_completed' || t === 'subscription_started',
  },
  { key: 'scan_completed', label: 'Scans completed', color: '#b26400', match: (t) => t === 'scan_completed' },
]

const MUTED = '#626b82' // --color-fg-faint, the de-emphasis hue for crosshairs/baselines
const SURFACE = '#0a0c14' // --color-surface, used for marker rings so dots stay legible on overlap

const DAY_PRESETS = [7, 30, 90]

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function buildDailySeries(events: AdminEvent[], days: number, match: (t: string) => boolean): { date: string; count: number }[] {
  const buckets = new Map<string, number>()
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const e of events) {
    if (!match(e.type)) continue
    const key = dayKey(e.createdAt)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
}

function Sparkline({
  data,
  color,
  accentColor = color,
  label,
}: {
  data: { date: string; count: number }[]
  color: string
  accentColor?: string
  label: string
}) {
  const width = 280
  const height = 64
  const padTop = 8
  const max = Math.max(1, ...data.map((d) => d.count))
  const n = data.length
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * width)
  const y = (v: number) => padTop + (1 - v / max) * (height - padTop)

  const [hover, setHover] = useState<number | null>(null)

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${height} L 0 ${height} Z`

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const hovered = hover !== null ? data[hover] : null

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * width
    const idx = Math.round((relX / width) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, idx)))
  }

  return (
    <CardShell className="relative p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-fg">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </div>
        <span className="font-display text-lg text-fg">{total.toLocaleString()}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={0} y1={height} x2={width} y2={height} stroke={MUTED} strokeOpacity={0.35} strokeWidth={1} />
        <path d={areaPath} fill={color} fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null ? (
          <line x1={x(hover)} y1={padTop} x2={x(hover)} y2={height} stroke={MUTED} strokeWidth={1} />
        ) : null}
        {n > 0 ? (
          <circle cx={x(n - 1)} cy={y(data[n - 1].count)} r={5} fill={accentColor} stroke={SURFACE} strokeWidth={2} />
        ) : null}
        {hover !== null ? (
          <circle cx={x(hover)} cy={y(data[hover].count)} r={5} fill={accentColor} stroke={SURFACE} strokeWidth={2} />
        ) : null}
      </svg>
      {hovered ? (
        <div
          className="pointer-events-none absolute top-3 rounded-lg border border-hair-strong bg-surface-3 px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${Math.min(78, Math.max(2, (hover! / Math.max(1, n - 1)) * 100))}%` }}
        >
          <div className="font-display text-sm font-medium text-fg">{hovered.count}</div>
          <div className="text-fg-dim">{new Date(hovered.date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
        </div>
      ) : null}
    </CardShell>
  )
}

export function AdminDashboard() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getAdminStats(days)
      .then((s) => setStats(s))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load stats.'))
      .finally(() => setLoading(false))
  }, [days])

  const series = useMemo(() => {
    if (!stats) return []
    return SERIES.map((s) => ({ ...s, data: buildDailySeries(stats.events, days, s.match) }))
  }, [stats, days])

  const visits = useMemo(() => {
    if (!stats) return { total: 0, uniqueVisitors: 0, data: [] as { date: string; count: number }[] }
    const pageViews = stats.events.filter((e) => e.type === 'page_view')
    return {
      total: pageViews.length,
      uniqueVisitors: new Set(pageViews.map((e) => e.visitorId).filter(Boolean)).size,
      data: buildDailySeries(stats.events, days, (t) => t === 'page_view'),
    }
  }, [stats, days])

  const topUsers = useMemo(() => {
    if (!stats) return []
    const byEmail = new Map<string, { email: string; count: number; first: string; last: string }>()
    for (const e of stats.events) {
      if (e.email === 'unknown') continue
      const entry = byEmail.get(e.email) || { email: e.email, count: 0, first: e.createdAt, last: e.createdAt }
      entry.count += 1
      if (e.createdAt < entry.first) entry.first = e.createdAt
      if (e.createdAt > entry.last) entry.last = e.createdAt
      byEmail.set(e.email, entry)
    }
    return Array.from(byEmail.values()).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [stats])

  const uniqueUsers = useMemo(() => {
    if (!stats) return 0
    return new Set(stats.events.filter((e) => e.email !== 'unknown').map((e) => e.email)).size
  }, [stats])

  const funnel = useMemo(() => {
    const c = stats?.counts || {}
    const signIn = c.sign_in_completed || 0
    const property = c.property_created || 0
    const scan = c.scan_completed || 0
    const revenue = (c.checkout_completed || 0) + (c.subscription_started || 0)
    const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : '—')
    return [
      { label: 'Signed in', value: signIn, rate: null as string | null },
      { label: 'Created a property', value: property, rate: pct(property, signIn) },
      { label: 'Completed a scan', value: scan, rate: pct(scan, property) },
      { label: 'Paid (one-time or subscription)', value: revenue, rate: pct(revenue, scan) },
    ]
  }, [stats])

  if (error) {
    return <CardShell className="p-5 text-sm text-red">{error}</CardShell>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-dim">Admin dashboard {loading ? '— refreshing…' : ''}</p>
        <div className="flex gap-2">
          {DAY_PRESETS.map((d) => (
            <Button key={d} variant={d === days ? 'primary' : 'secondary'} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {!stats || stats.events.length === 0 ? (
        <CardShell className="p-5 text-sm text-fg-dim">No activity recorded in this range yet.</CardShell>
      ) : (
        <>
          <CardShell className="p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs text-fg-dim">Site visits</p>
                <p className="font-display text-3xl text-fg">
                  {visits.total.toLocaleString()}
                  <span className="ml-2 text-sm font-normal text-fg-dim">{visits.uniqueVisitors.toLocaleString()} unique visitors</span>
                </p>
              </div>
            </div>
            <svg viewBox="0 0 560 48" className="w-full">
              {(() => {
                const width = 560
                const height = 48
                const max = Math.max(1, ...visits.data.map((d) => d.count))
                const n = visits.data.length
                const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * width)
                const y = (v: number) => 4 + (1 - v / max) * (height - 4)
                const line = visits.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(' ')
                const area = `${line} L ${x(n - 1).toFixed(1)} ${height} L 0 ${height} Z`
                return (
                  <>
                    <path d={area} fill={MUTED} fillOpacity={0.08} stroke="none" />
                    <path d={line} fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    {n > 0 ? <circle cx={x(n - 1)} cy={y(visits.data[n - 1].count)} r={5} fill="#2ee6ff" stroke={SURFACE} strokeWidth={2} /> : null}
                  </>
                )
              })()}
            </svg>
          </CardShell>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CardShell className="p-4">
              <p className="text-xs text-fg-dim">Unique users</p>
              <p className="font-display text-2xl text-fg">{uniqueUsers}</p>
            </CardShell>
            {funnel.map((f) => (
              <CardShell key={f.label} className="p-4">
                <p className="text-xs text-fg-dim">{f.label}</p>
                <p className="font-display text-2xl text-fg">
                  {f.value}
                  {f.rate ? <span className="ml-1.5 text-sm font-normal text-fg-dim">({f.rate})</span> : null}
                </p>
              </CardShell>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {series.map((s) => (
              <Sparkline key={s.key} data={s.data} color={s.color} label={s.label} />
            ))}
          </div>

          <CardShell className="p-5">
            <p className="mb-3 text-sm text-fg">Most active users</p>
            {topUsers.length === 0 ? (
              <p className="text-xs text-fg-dim">No identified users in this range.</p>
            ) : (
              <table className="w-full text-xs text-fg-dim">
                <thead>
                  <tr className="border-b border-hair text-left text-fg-faint">
                    <th className="pb-2 font-normal">Email</th>
                    <th className="pb-2 font-normal tabular-nums">Events</th>
                    <th className="pb-2 font-normal">First seen</th>
                    <th className="pb-2 font-normal">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((u) => (
                    <tr key={u.email} className="border-b border-hair/60">
                      <td className="py-2 text-fg">{u.email}</td>
                      <td className="py-2 tabular-nums">{u.count}</td>
                      <td className="py-2">{new Date(u.first).toLocaleDateString()}</td>
                      <td className="py-2">{new Date(u.last).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardShell>
        </>
      )}
    </div>
  )
}
