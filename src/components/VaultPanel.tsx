import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Check,
  CreditCard,
  Download,
  FileText,
  Lock,
  Link2,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserPlus,
} from 'lucide-react'
import { Container, SectionHeading, Button, Badge, CardShell } from './ui'
import {
  isVaultConfigured,
  requestSignInLink,
  verifySignInToken,
  listProperties,
  createProperty,
  getProperty,
  createVaultScan,
  getPropertyReport,
  askProperty,
  requestOwnershipTransfer,
  acceptOwnershipTransfer,
  setPropertyShared,
  createCheckoutSession,
  getSubscription,
  createSubscriptionCheckout,
  openBillingPortal,
  getAccount,
  updateAccount,
  VaultApiError,
  type Property,
  type Scan,
  type Subscription,
  type SubscriptionTier,
} from '../lib/vaultApi'
import { getSession, getSessionEmail, setSession, clearSession } from '../lib/vaultSession'
import { imageFileToFrame, isImageFile } from '../lib/frameExtractor'

// Admin-only, so it's split into its own chunk — nobody but the site owner
// ever pays for downloading it.
const AdminDashboard = lazy(() =>
  import('./AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)

const CONFIGURED = isVaultConfigured()
const VAULT_TOKEN_PARAM = 'vault_token'
const VAULT_TRANSFER_TOKEN_PARAM = 'vault_transfer_token'
const MAX_IMAGES = 4

// Mirrors backend/vault-subscription-checkout-create/tiers.mjs — kept in
// sync by hand since each Lambda is self-contained (no shared layer).
const SUBSCRIPTION_TIERS: { tier: SubscriptionTier; name: string; priceDollars: number; scanCapLabel: string; seats: number }[] = [
  { tier: 'solo', name: 'Solo', priceDollars: 39, scanCapLabel: '20', seats: 1 },
  { tier: 'crew', name: 'Crew', priceDollars: 99, scanCapLabel: '100', seats: 3 },
  { tier: 'company', name: 'Company', priceDollars: 249, scanCapLabel: 'Unlimited', seats: 10 },
]

export function VaultPanel() {
  const [email, setEmail] = useState('')
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [properties, setProperties] = useState<Property[]>([])
  const [newAddress, setNewAddress] = useState('')
  const [selected, setSelected] = useState<Property | null>(null)
  const [scans, setScans] = useState<(Scan & { photoUrl?: string })[]>([])
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([])
  const [report, setReport] = useState<string | null>(null)
  const [reportMeta, setReportMeta] = useState<{ companyName: string; address: string } | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferSent, setTransferSent] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'cancel' | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [companyName, setCompanyName] = useState('')
  const showAdmin = new URLSearchParams(window.location.search).has('vault_admin')
  const inputRef = useRef<HTMLInputElement>(null)

  // After a Stripe redirect back, show the result and clean the URL.
  useEffect(() => {
    const url = new URL(window.location.href)
    const status = url.searchParams.get('vault_checkout')
    if (status === 'success' || status === 'cancel') {
      setCheckoutStatus(status)
      url.searchParams.delete('vault_checkout')
      url.searchParams.delete('vault_view_property')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // On load, check for a magic-link or transfer-accept token in the URL and verify it.
  useEffect(() => {
    if (!CONFIGURED) return
    const url = new URL(window.location.href)
    const signInToken = url.searchParams.get(VAULT_TOKEN_PARAM)
    const transferToken = url.searchParams.get(VAULT_TRANSFER_TOKEN_PARAM)

    if (!signInToken && !transferToken) {
      const existing = getSession()
      if (existing) setSignedInEmail(getSessionEmail())
      return
    }

    setVerifying(true)
    const verification = signInToken ? verifySignInToken(signInToken) : acceptOwnershipTransfer(transferToken as string)
    verification
      .then(({ session, email: verifiedEmail }) => {
        setSession(session, verifiedEmail)
        setSignedInEmail(verifiedEmail)
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'This link is invalid or expired.')
      )
      .finally(() => {
        setVerifying(false)
        url.searchParams.delete(VAULT_TOKEN_PARAM)
        url.searchParams.delete(VAULT_TRANSFER_TOKEN_PARAM)
        window.history.replaceState({}, '', url.toString())
      })
  }, [])

  useEffect(() => {
    if (!signedInEmail) return
    setBusy(true)
    listProperties()
      .then(({ properties: list }) => setProperties(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load properties.'))
      .finally(() => setBusy(false))
    getSubscription()
      .then(({ subscription: sub }) => setSubscription(sub))
      .catch(() => {
        /* Non-critical — the page still works without knowing plan status. */
      })
    getAccount()
      .then(({ companyName: name }) => setCompanyName(name))
      .catch(() => {
        /* Non-critical — reports just won't be branded if this fails. */
      })
  }, [signedInEmail])

  function handleRequestLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    requestSignInLink(email)
      .then(() => setLinkSent(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not send sign-in link.'))
      .finally(() => setBusy(false))
  }

  function handleSignOut() {
    clearSession()
    setSignedInEmail(null)
    setSelected(null)
    setProperties([])
    setSubscription(null)
    setLinkSent(false)
    setEmail('')
  }

  function handleSubscribe(tier: SubscriptionTier) {
    setError(null)
    setBusy(true)
    createSubscriptionCheckout(tier)
      .then(({ url }) => {
        window.location.href = url
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not start checkout.'))
      .finally(() => setBusy(false))
  }

  function handleManageBilling() {
    setError(null)
    setBusy(true)
    openBillingPortal()
      .then(({ url }) => {
        window.location.href = url
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not open billing portal.'))
      .finally(() => setBusy(false))
  }

  function handleCreateProperty(e: React.FormEvent) {
    e.preventDefault()
    if (!newAddress.trim()) return
    setError(null)
    setBusy(true)
    createProperty(newAddress.trim())
      .then((property) => {
        setProperties((prev) => [property, ...prev])
        setNewAddress('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not create property.'))
      .finally(() => setBusy(false))
  }

  function openProperty(property: Property) {
    setSelected(property)
    setReport(null)
    setReportMeta(null)
    setAnswer(null)
    setBusy(true)
    getProperty(property.propertyId)
      .then(({ scans: list }) => setScans(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load property.'))
      .finally(() => setBusy(false))
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !selected) return
    const imageFiles = Array.from(files).filter(isImageFile).slice(0, MAX_IMAGES)
    if (imageFiles.length === 0) return
    const propertyId = selected.propertyId
    const previewUrls = imageFiles.map((f) => URL.createObjectURL(f))
    setError(null)
    setBusy(true)
    setPendingPreviewUrls(previewUrls)
    try {
      const frames = await Promise.all(imageFiles.map(imageFileToFrame))
      const scan = await createVaultScan(propertyId, frames)
      previewUrls.slice(1).forEach((url) => URL.revokeObjectURL(url))
      setScans((prev) => [{ ...scan, photoUrl: previewUrls[0] }, ...prev])
      setSelected((prev) => (prev ? { ...prev, scanCount: prev.scanCount + 1 } : prev))
      setProperties((prev) =>
        prev.map((p) => (p.propertyId === propertyId ? { ...p, scanCount: p.scanCount + 1 } : p))
      )
    } catch (err) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      if (err instanceof VaultApiError && err.status === 402 && err.code === 'PAYMENT_REQUIRED') {
        // The free scan was already used server-side, even though the local
        // state we had didn't reflect that yet (e.g. after navigating back
        // and re-selecting the property) — sync both so the paywall card
        // actually shows instead of silently doing nothing.
        setSelected((prev) => (prev ? { ...prev, scanCount: Math.max(prev.scanCount, 1) } : prev))
        setProperties((prev) =>
          prev.map((p) => (p.propertyId === propertyId ? { ...p, scanCount: Math.max(p.scanCount, 1) } : p))
        )
      } else if (err instanceof VaultApiError && err.code === 'SUBSCRIPTION_CAP_REACHED') {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Scan failed.')
      }
    } finally {
      setBusy(false)
      setPendingPreviewUrls([])
    }
  }

  function handleUnlock() {
    if (!selected) return
    setError(null)
    setBusy(true)
    createCheckoutSession(selected.propertyId)
      .then(({ url }) => {
        window.location.href = url
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not start checkout.'))
      .finally(() => setBusy(false))
  }

  function handleGenerateReport() {
    if (!selected) return
    setError(null)
    setBusy(true)
    getPropertyReport(selected.propertyId)
      .then(({ report: text, companyName: name, address }) => {
        setReport(text)
        setReportMeta({ companyName: name, address })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not generate report.'))
      .finally(() => setBusy(false))
  }

  function handleSaveCompanyName() {
    setError(null)
    setBusy(true)
    updateAccount(companyName)
      .then(({ companyName: name }) => setCompanyName(name))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not save company name.'))
      .finally(() => setBusy(false))
  }

  function handleDownloadReportPdf() {
    if (!report || !reportMeta) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(reportMeta.address)} — Stratum report</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.6; }
  header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
  .company { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
  h1 { font-size: 20px; margin: 4px 0 0; }
  .meta { font-size: 12px; color: #666; margin-top: 4px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
  footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
<header>
  ${reportMeta.companyName ? `<div class="company">${escapeHtml(reportMeta.companyName)}</div>` : ''}
  <h1>${escapeHtml(reportMeta.address)}</h1>
  <div class="meta">Stratum X-ray record — generated ${new Date().toLocaleDateString()}</div>
</header>
<pre>${escapeHtml(report)}</pre>
<footer>Generated by Stratum Vault — a permanent, owned X-ray record for this property.</footer>
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !question.trim()) return
    setError(null)
    setBusy(true)
    askProperty(selected.propertyId, question.trim())
      .then(({ answer: text }) => setAnswer(text))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not get an answer.'))
      .finally(() => setBusy(false))
  }

  function handleExport() {
    if (!selected) return
    const payload = { property: selected, scans }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stratum-vault-${selected.address.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !transferEmail.trim()) return
    setError(null)
    setBusy(true)
    requestOwnershipTransfer(selected.propertyId, transferEmail.trim())
      .then(() => setTransferSent(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not send the transfer offer.'))
      .finally(() => setBusy(false))
  }

  function handleToggleShare() {
    if (!selected) return
    setError(null)
    setBusy(true)
    setPropertyShared(selected.propertyId, !selected.shareEnabled)
      .then(({ shareEnabled }) => {
        setSelected((prev) => (prev ? { ...prev, shareEnabled } : prev))
        setProperties((prev) =>
          prev.map((p) => (p.propertyId === selected.propertyId ? { ...p, shareEnabled } : p))
        )
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not update sharing.'))
      .finally(() => setBusy(false))
  }

  if (!CONFIGURED) return null

  return (
    <section id="vault" className="relative py-24 md:py-32">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Stratum Vault"
          icon={<ShieldCheck size={13} />}
          title="Your permanent, owned property record"
          description="Sign in to create a property, run scans against it, and build a growing, exportable record — not a one-time report. First scan on every property is free; $49 one-time unlocks unlimited scans on that property after that."
        />

        {error ? (
          <div className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">{error}</div>
        ) : null}

        {checkoutStatus === 'success' ? (
          <div className="rounded-xl border border-green/30 bg-green/10 px-4 py-3 text-sm text-green">
            Payment received — this property is unlocked. Open it to keep scanning.
          </div>
        ) : checkoutStatus === 'cancel' ? (
          <div className="rounded-xl border border-hair-strong bg-surface-2 px-4 py-3 text-sm text-fg-dim">
            Checkout cancelled — no charge was made.
          </div>
        ) : null}

        {verifying ? (
          <CardShell className="p-8 text-center text-fg-dim">Signing you in…</CardShell>
        ) : !signedInEmail ? (
          <CardShell className="max-w-md p-8">
            {linkSent ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <Check className="text-green" size={28} />
                <p className="text-fg">Check your email for a sign-in link.</p>
                <p className="text-sm text-fg-dim">It expires in 15 minutes — check spam if it doesn't show up in a minute.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestLink} className="flex flex-col gap-4">
                <label className="flex items-center gap-2 text-sm text-fg-dim">
                  <Mail size={16} /> Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-lg border border-hair-strong bg-surface-2 px-4 py-3 text-fg outline-none focus:border-cyan/50"
                />
                <Button type="submit" variant="primary" className="w-full">
                  <Send size={16} /> {busy ? 'Sending…' : 'Send sign-in link'}
                </Button>
              </form>
            )}
          </CardShell>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-fg-dim">
                Signed in as <span className="text-fg">{signedInEmail}</span>
              </p>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut size={14} /> Sign out
              </Button>
            </div>

            {showAdmin ? (
              <Suspense fallback={<CardShell className="p-5 text-sm text-fg-dim">Loading dashboard…</CardShell>}>
                <AdminDashboard />
              </Suspense>
            ) : null}

            {!selected ? (
              <div className="flex flex-col gap-6">
                {subscription && subscription.status === 'active' ? (
                  <CardShell className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <div className="flex items-center gap-2 text-fg">
                        <CreditCard size={16} className="text-cyan-soft" />
                        {subscription.tierName} plan
                        <Badge tone="green">Active</Badge>
                      </div>
                      <p className="mt-1 text-xs text-fg-dim">
                        {subscription.scansUsedThisPeriod} of {subscription.scanCap ?? 'unlimited'} scans used this
                        period
                        {subscription.currentPeriodEnd
                          ? ` — renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <Button variant="secondary" onClick={handleManageBilling}>
                      {busy ? 'Opening…' : 'Manage billing'}
                    </Button>
                  </CardShell>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-fg-dim">
                      Running scans across many properties? A plan replaces the per-property $49 unlock with a
                      monthly scan allowance.
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {SUBSCRIPTION_TIERS.map((t) => (
                        <CardShell key={t.tier} className="flex flex-col gap-2 p-5">
                          <div className="flex items-center gap-2 text-fg">
                            {t.name}
                            {t.tier === 'crew' ? <Badge tone="cyan">Popular</Badge> : null}
                          </div>
                          <p className="font-display text-2xl text-fg">
                            ${t.priceDollars}
                            <span className="text-sm font-normal text-fg-dim">/mo</span>
                          </p>
                          <p className="text-xs text-fg-dim">{t.scanCapLabel} scans/mo · {t.seats} seat{t.seats > 1 ? 's' : ''}</p>
                          <Button variant={t.tier === 'crew' ? 'primary' : 'secondary'} onClick={() => handleSubscribe(t.tier)}>
                            {busy ? 'Redirecting…' : 'Subscribe'}
                          </Button>
                        </CardShell>
                      ))}
                    </div>
                  </div>
                )}

                <CardShell className="flex flex-wrap items-center gap-3 p-4">
                  <label className="text-xs text-fg-dim">Company name (shown on report letterhead)</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Restoration"
                    className="min-w-0 flex-1 rounded-lg border border-hair-strong bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-cyan/50"
                  />
                  <Button variant="secondary" onClick={handleSaveCompanyName}>
                    {busy ? 'Saving…' : 'Save'}
                  </Button>
                </CardShell>

                <form onSubmit={handleCreateProperty} className="flex gap-3">
                  <input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="123 Main St, Springfield"
                    className="flex-1 rounded-lg border border-hair-strong bg-surface-2 px-4 py-3 text-fg outline-none focus:border-cyan/50"
                  />
                  <Button type="submit" variant="secondary">
                    <Plus size={16} /> Add property
                  </Button>
                </form>

                <div className="grid gap-3 md:grid-cols-2">
                  {properties.map((property) => (
                    <button key={property.propertyId} onClick={() => openProperty(property)} className="text-left">
                      <CardShell className="p-5 transition-colors hover:border-cyan/40">
                        <div className="flex items-center gap-2 text-fg">
                          <Building2 size={16} className="text-cyan-soft" />
                          {property.address}
                        </div>
                        <p className="mt-1 text-xs text-fg-dim">Added {new Date(property.createdAt).toLocaleDateString()}</p>
                      </CardShell>
                    </button>
                  ))}
                  {properties.length === 0 && !busy ? (
                    <p className="text-sm text-fg-dim">No properties yet — add one above to start a record.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <button onClick={() => setSelected(null)} className="w-fit text-sm text-fg-dim hover:text-fg">
                  ← All properties
                </button>
                <h3 className="font-display text-xl text-fg">{selected.address}</h3>

                {selected.scanCount >= 1 && !selected.paid && subscription?.status !== 'active' ? (
                  <CardShell className="flex flex-col items-center gap-3 p-8 text-center">
                    <Lock className="text-amber" size={24} />
                    <p className="text-sm text-fg">This property's free scan is used.</p>
                    <p className="max-w-sm text-xs text-fg-dim">
                      Unlock it for a one-time $49 to add unlimited scans, keep building the record as renovation continues.
                    </p>
                    <Button variant="primary" onClick={handleUnlock}>
                      {busy ? 'Redirecting…' : 'Unlock this property — $49'}
                    </Button>
                  </CardShell>
                ) : pendingPreviewUrls.length > 0 ? (
                  <CardShell className="flex flex-col items-center gap-3 p-8 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      {pendingPreviewUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Uploaded photo pending analysis"
                          className="size-20 rounded-lg border border-hair-strong object-cover"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-fg-dim">Analyzing…</p>
                  </CardShell>
                ) : (
                  <CardShell
                    className="flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center"
                    onClick={() => inputRef.current?.click()}
                  >
                    <UploadCloud className="text-cyan-soft" size={24} />
                    <p className="text-sm text-fg">
                      Upload up to {MAX_IMAGES} photos to add a scan
                      {selected.scanCount === 0 ? ' — first one is free' : ''}
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </CardShell>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={handleGenerateReport}>
                    <FileText size={16} /> {busy ? 'Working…' : 'Generate report'}
                  </Button>
                  {report ? (
                    <Button variant="secondary" onClick={handleDownloadReportPdf}>
                      <Download size={16} /> Download PDF
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={handleExport}>
                    <Download size={16} /> Export JSON
                  </Button>
                  <Button variant="secondary" onClick={handleToggleShare}>
                    <Link2 size={16} /> {selected.shareEnabled ? 'Stop sharing' : 'Share publicly'}
                  </Button>
                </div>

                {selected.shareEnabled ? (
                  <CardShell className="p-4 text-sm text-fg-dim">
                    Public link (anyone with it can view, no sign-in needed):{' '}
                    <a
                      className="text-cyan-soft underline"
                      href={`${window.location.origin}${window.location.pathname}?vault_view=${selected.propertyId}`}
                    >
                      {window.location.origin}
                      {window.location.pathname}?vault_view={selected.propertyId}
                    </a>
                  </CardShell>
                ) : null}

                {report ? (
                  <CardShell className="whitespace-pre-wrap p-6 text-sm text-fg-dim">{report}</CardShell>
                ) : null}

                <CardShell className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-fg">
                    <UserPlus size={16} className="text-cyan-soft" /> Transfer ownership
                  </div>
                  {transferSent ? (
                    <p className="text-sm text-fg-dim">
                      Sent — they'll get an email to accept. Ownership changes once they click it.
                    </p>
                  ) : (
                    <form onSubmit={handleTransfer} className="flex gap-3">
                      <input
                        type="email"
                        value={transferEmail}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        placeholder="new-owner@example.com"
                        className="flex-1 rounded-lg border border-hair-strong bg-surface-2 px-4 py-3 text-fg outline-none focus:border-cyan/50"
                      />
                      <Button type="submit" variant="secondary">
                        Send offer
                      </Button>
                    </form>
                  )}
                </CardShell>

                <form onSubmit={handleAsk} className="flex gap-3">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Where's the water shutoff?"
                    className="flex-1 rounded-lg border border-hair-strong bg-surface-2 px-4 py-3 text-fg outline-none focus:border-cyan/50"
                  />
                  <Button type="submit" variant="secondary">
                    <MessageCircle size={16} /> Ask
                  </Button>
                </form>
                {answer ? <CardShell className="p-6 text-sm text-fg-dim">{answer}</CardShell> : null}

                <div className="flex flex-col gap-3">
                  {scans.map((scan) => (
                    <motion.div key={scan.scanId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <CardShell className="p-5">
                        <div className="flex items-center justify-between">
                          <Badge tone="cyan">
                            <Sparkles size={11} /> {scan.imageType.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-fg-dim">{new Date(scan.createdAt).toLocaleString()}</span>
                        </div>
                        {scan.photoUrl ? (
                          <img
                            src={scan.photoUrl}
                            alt="Uploaded scan photo"
                            className="mt-3 h-40 w-full rounded-lg border border-hair-strong object-cover"
                          />
                        ) : null}
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
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  )
}
