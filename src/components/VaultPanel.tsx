import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Check,
  Download,
  FileText,
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
  type Property,
  type Scan,
} from '../lib/vaultApi'
import { getSession, getSessionEmail, setSession, clearSession } from '../lib/vaultSession'
import { imageFileToFrame, isImageFile } from '../lib/frameExtractor'

const CONFIGURED = isVaultConfigured()
const VAULT_TOKEN_PARAM = 'vault_token'
const VAULT_TRANSFER_TOKEN_PARAM = 'vault_transfer_token'
const MAX_IMAGES = 4

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
  const [scans, setScans] = useState<Scan[]>([])
  const [report, setReport] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferSent, setTransferSent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setLinkSent(false)
    setEmail('')
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
    setError(null)
    setBusy(true)
    try {
      const frames = await Promise.all(imageFiles.map(imageFileToFrame))
      const scan = await createVaultScan(selected.propertyId, frames)
      setScans((prev) => [scan, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.')
    } finally {
      setBusy(false)
    }
  }

  function handleGenerateReport() {
    if (!selected) return
    setError(null)
    setBusy(true)
    getPropertyReport(selected.propertyId)
      .then(({ report: text }) => setReport(text))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not generate report.'))
      .finally(() => setBusy(false))
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
          description="Sign in to create a property, run scans against it, and build a growing, exportable record — not a one-time report."
        />

        {error ? (
          <div className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">{error}</div>
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

            {!selected ? (
              <div className="flex flex-col gap-6">
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

                <CardShell
                  className="flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center"
                  onClick={() => inputRef.current?.click()}
                >
                  <UploadCloud className="text-cyan-soft" size={24} />
                  <p className="text-sm text-fg">Upload up to {MAX_IMAGES} photos to add a scan</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </CardShell>

                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={handleGenerateReport}>
                    <FileText size={16} /> {busy ? 'Working…' : 'Generate report'}
                  </Button>
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
