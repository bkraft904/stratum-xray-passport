import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  FileVideo,
  Gauge,
  Info,
  Layers,
  Loader2,
  RotateCcw,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react'
import { Container, SectionHeading, Button, Badge } from './ui'
import { XrayFloorplan } from './XrayFloorplan'
import { HotspotPanel } from './HotspotPanel'
import { LayerToggle } from './LayerToggle'
import { STAGES, useScanPipeline } from '../lib/useScanPipeline'
import { formatBytes } from '../lib/format'
import { isImageFile, isVideoFile } from '../lib/frameExtractor'
import { isRealAnalysisConfigured, type Finding, type FindingCategory, type ImageType } from '../lib/analyzeApi'
import { buildApproximateLayout } from '../lib/floorplan'
import type { Hotspot, Layer } from '../lib/floorplan'

const CATEGORY_META: Record<FindingCategory, { label: string; color: string }> = {
  plumbing: { label: 'Plumbing', color: '#2ee6ff' },
  electrical: { label: 'Electrical', color: '#ffe14d' },
  structural: { label: 'Structural', color: '#ffb02e' },
  hvac: { label: 'HVAC', color: '#8b7bff' },
  material: { label: 'Material', color: '#33e6a3' },
  other: { label: 'Other', color: '#9aa3b8' },
}

const IMAGE_TYPE_META: Record<ImageType, { label: string; tone: 'green' | 'cyan' | 'amber' | 'violet' | 'neutral' }> = {
  wall_section_closeup: { label: 'Wall section close-up', tone: 'green' },
  full_room_view: { label: 'Full room view', tone: 'cyan' },
  floor_plan_document: { label: 'Floor plan document', tone: 'violet' },
  multiple_areas: { label: 'Multiple areas', tone: 'amber' },
  unclear_or_unrelated: { label: 'Unclear / not construction', tone: 'neutral' },
}

const CONFIDENCE_TONE: Record<Finding['confidence'], 'green' | 'amber' | 'neutral'> = {
  high: 'green',
  medium: 'amber',
  low: 'neutral',
}

const REAL_MODE = isRealAnalysisConfigured()

export function ScanLab() {
  const {
    mode,
    phase,
    fileName,
    fileSize,
    uploadProgress,
    chunkInfo,
    stageIndex,
    stageProgress,
    log,
    result,
    frames,
    analysis,
    errorMessage,
    start,
    reset,
  } = useScanPipeline()

  const [dragging, setDragging] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)
  const [selected, setSelected] = useState<Hotspot | null>(null)
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['structural', 'plumbing', 'electrical', 'hvac']))
  const inputRef = useRef<HTMLInputElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log])

  useEffect(() => {
    setSelected(null)
  }, [result, analysis])

  const approxLayout = useMemo(() => {
    if (!analysis) return null
    return buildApproximateLayout(analysis.findings, `${fileName}-${fileSize}`, analysis.imageType)
  }, [analysis, fileName, fileSize])

  function handleFile(file: File | null) {
    if (!file) return
    setThumb(null)

    if (isImageFile(file)) {
      setThumb(URL.createObjectURL(file))
    } else if (isVideoFile(file)) {
      try {
        const url = URL.createObjectURL(file)
        const video = videoRef.current
        if (video) {
          video.src = url
          video.onloadeddata = () => {
            try {
              video.currentTime = Math.min(1, (video.duration || 1) * 0.15)
            } catch {
              /* ignore seek errors on unusual codecs */
            }
          }
          video.onseeked = () => {
            const canvas = canvasRef.current
            if (canvas && video.videoWidth) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              const ctx = canvas.getContext('2d')
              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
              setThumb(canvas.toDataURL('image/jpeg', 0.7))
            }
            URL.revokeObjectURL(url)
          }
          video.onerror = () => URL.revokeObjectURL(url)
        }
      } catch {
        /* thumbnail is a nice-to-have; ignore failures */
      }
    }

    start(file)
  }

  const isBusy = phase === 'uploading' || phase === 'processing' || phase === 'extracting' || phase === 'analyzing'

  return (
    <section id="scan-lab" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet/10 blur-[160px]" />
      <Container className="relative">
        <SectionHeading
          eyebrow="AI Scan Lab"
          icon={<Sparkles className="size-3" />}
          title="Turn a walkthrough video or photo into real findings"
          description="Drop in footage or photos from before the drywall closed. Claude's vision model looks at what you actually captured and reports what it can genuinely identify."
          align="center"
        />

        <div className="mx-auto mt-6 max-w-xl">
          {REAL_MODE ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-green/25 bg-green/[0.06] px-4 py-3 text-left">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green" />
              <p className="text-[12.5px] leading-relaxed text-fg-dim">
                <span className="font-medium text-green">Real AI analysis.</span> Frames extracted from your upload
                are sent to our backend, which calls Claude for a genuine read of what's visible — pipe material,
                wire gauges, framing, brands, and so on. Nothing here is added to a permanent Building Passport;
                this is a standalone preview.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber/25 bg-amber/[0.06] px-4 py-3 text-left">
              <Info className="mt-0.5 size-4 shrink-0 text-amber" />
              <p className="text-[12.5px] leading-relaxed text-fg-dim">
                <span className="font-medium text-amber">Live demo simulation.</span> The real-analysis backend
                isn't configured for this deployment, so this lab runs a scripted preview entirely in your browser —
                your file never leaves your device, and the diagram below is a generated illustration, not a real
                analysis of your footage.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <label
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    handleFile(e.dataTransfer.files?.[0] ?? null)
                  }}
                  className={`group mx-auto flex max-w-2xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors duration-200 ${
                    dragging ? 'border-cyan bg-cyan/[0.06]' : 'border-hair-strong bg-surface/40 hover:border-cyan/40 hover:bg-surface/60'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="video/*,image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex size-16 items-center justify-center rounded-2xl border border-cyan/25 bg-cyan/10 text-cyan transition-transform duration-200 group-hover:scale-105">
                    <UploadCloud className="size-7" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-medium text-fg">Drop a walkthrough video or photo here</p>
                    <p className="mt-1.5 text-sm text-fg-dim">or click to browse — any video or image format your camera shoots</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Badge tone="neutral">No size limit</Badge>
                    <Badge tone={REAL_MODE ? 'green' : 'neutral'}>{REAL_MODE ? 'Real AI analysis' : 'Demo simulation'}</Badge>
                    {!REAL_MODE && <Badge tone="neutral">Processed on-device</Badge>}
                  </div>
                </label>
              </motion.div>
            )}

            {isBusy && (
              <motion.div
                key="busy"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass mx-auto max-w-2xl rounded-2xl p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hair-strong bg-void">
                    {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : <FileVideo className="size-5 text-fg-faint" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{fileName}</p>
                    <p className="text-xs text-fg-faint">{formatBytes(fileSize)}</p>
                  </div>
                  <button onClick={reset} className="rounded-full p-2 text-fg-faint transition hover:bg-white/5 hover:text-fg" aria-label="Cancel">
                    <RotateCcw className="size-4" />
                  </button>
                </div>

                {phase === 'uploading' && (
                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-fg-dim">
                      <span>Uploading — chunk {chunkInfo.current}/{chunkInfo.total}</span>
                      <span className="font-mono text-cyan-soft">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan to-cyan-soft"
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ ease: 'linear', duration: 0.15 }}
                      />
                    </div>
                  </div>
                )}

                {phase === 'processing' && (
                  <div className="mt-5">
                    <div className="grid grid-cols-4 gap-2">
                      {STAGES.map((s, i) => (
                        <div key={s.key} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`flex size-8 items-center justify-center rounded-full border text-[11px] ${
                              i < stageIndex
                                ? 'border-green/40 bg-green/10 text-green'
                                : i === stageIndex
                                  ? 'border-cyan/50 bg-cyan/10 text-cyan'
                                  : 'border-hair text-fg-faint'
                            }`}
                          >
                            {i < stageIndex ? <Check className="size-3.5" /> : i === stageIndex ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                          </div>
                          <span className="hidden text-center text-[10px] leading-tight text-fg-faint sm:block">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
                        animate={{ width: `${stageProgress}%` }}
                        transition={{ ease: 'linear', duration: 0.15 }}
                      />
                    </div>

                    <div className="no-scrollbar mt-4 h-32 overflow-y-auto rounded-lg border border-hair bg-ink/80 p-3 font-mono text-[11.5px] leading-relaxed text-green/80">
                      {log.map((line, i) => (
                        <div key={i}>
                          <span className="text-fg-faint">$</span> {line}
                        </div>
                      ))}
                      <div className="inline-block h-3 w-1.5 animate-blink bg-green/70 align-middle" />
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}

                {(phase === 'extracting' || phase === 'analyzing') && (
                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center gap-2 text-xs text-fg-dim">
                      <Loader2 className="size-3.5 animate-spin text-cyan" />
                      {phase === 'extracting' ? 'Extracting frames…' : 'Analyzing with Claude Opus 5…'}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan to-violet"
                        animate={{ x: ['0%', '200%'] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                    <div className="no-scrollbar mt-4 h-24 overflow-y-auto rounded-lg border border-hair bg-ink/80 p-3 font-mono text-[11.5px] leading-relaxed text-cyan-soft/90">
                      {log.map((line, i) => (
                        <div key={i}>
                          <span className="text-fg-faint">$</span> {line}
                        </div>
                      ))}
                      <div className="inline-block h-3 w-1.5 animate-blink bg-cyan-soft/70 align-middle" />
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl p-8 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl border border-red/30 bg-red/10 text-red">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="font-display text-base font-medium text-fg">Analysis failed</p>
                  <p className="mt-1.5 text-sm text-fg-dim">{errorMessage}</p>
                </div>
                <Button variant="secondary" onClick={reset}>
                  <RotateCcw className="size-3.5" /> Try again
                </Button>
              </motion.div>
            )}

            {phase === 'done' && mode === 'real' && analysis && (
              <motion.div key="done-real" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge tone={IMAGE_TYPE_META[analysis.imageType].tone}>{IMAGE_TYPE_META[analysis.imageType].label}</Badge>
                    <Badge tone="green">{analysis.findings.length} findings</Badge>
                    <Badge tone="neutral">{analysis.model}</Badge>
                    <Badge tone="neutral">
                      {analysis.usage.input_tokens + analysis.usage.output_tokens} tokens
                    </Badge>
                  </div>
                  <Button variant="secondary" onClick={reset}>
                    <RotateCcw className="size-3.5" /> Analyze another
                  </Button>
                </div>

                <p className="mb-6 text-[12.5px] leading-relaxed text-fg-faint">{analysis.scopeNote}</p>

                {frames.length > 0 && (
                  <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                    {frames.map((f, i) => (
                      <img
                        key={i}
                        src={`data:${f.mediaType};base64,${f.data}`}
                        alt={`Analyzed frame ${i + 1}`}
                        className="h-20 w-28 shrink-0 rounded-lg border border-hair object-cover"
                      />
                    ))}
                  </div>
                )}

                {approxLayout && approxLayout.floorplan.hotspots.length > 0 && (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                      <div className="glass overflow-hidden rounded-2xl p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-4">
                          <LayerToggle active={activeLayers} onChange={setActiveLayers} />
                          <Badge tone="cyan">Approximate layout</Badge>
                        </div>
                        <div className="aspect-[8/6] w-full overflow-hidden rounded-xl border border-hair bg-ink">
                          <XrayFloorplan
                            floorplan={approxLayout.floorplan}
                            activeLayers={activeLayers}
                            selectedId={selected?.id ?? null}
                            onSelect={setSelected}
                          />
                        </div>
                        <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-fg-faint">
                          The outline is scoped to what you captured — a single area, or a couple of areas if
                          multiple were detected — but its exact shape isn't measured, since a phone photo has no
                          real spatial data. Each pin is one of your actual findings; positions on the outline are
                          illustrative, not measured.
                        </p>
                      </div>
                      <div className="min-h-[300px]">
                        <HotspotPanel hotspot={selected} onClose={() => setSelected(null)} />
                      </div>
                    </div>
                    {approxLayout.unplaced.length > 0 && (
                      <p className="mt-3 text-[12px] text-fg-faint">
                        {approxLayout.unplaced.length} more finding{approxLayout.unplaced.length === 1 ? '' : 's'} (
                        {approxLayout.unplaced.map((f) => f.label).join(', ')}) don't map to a wall layer, so they're
                        not pinned above — see the full list below.
                      </p>
                    )}
                  </div>
                )}

                <div className="glass rounded-2xl p-6">
                  <p className="text-[14px] leading-relaxed text-fg">{analysis.summary}</p>

                  <div className="mt-6 flex flex-col gap-3">
                    {analysis.findings.map((finding, i) => {
                      const meta = CATEGORY_META[finding.category]
                      return (
                        <div key={i} className="rounded-xl border border-hair bg-surface/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
                                style={{ color: meta.color, borderColor: `${meta.color}4d`, background: `${meta.color}1a` }}
                              >
                                {meta.label}
                              </span>
                              <h4 className="font-display text-[15px] font-medium text-fg">{finding.label}</h4>
                            </div>
                            <Badge tone={CONFIDENCE_TONE[finding.confidence]}>{finding.confidence} confidence</Badge>
                          </div>
                          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-dim">{finding.description}</p>
                          <p className="mt-2 text-[12px] italic leading-relaxed text-fg-faint">"{finding.evidence}"</p>
                        </div>
                      )
                    })}
                  </div>

                  {analysis.caveats && (
                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber/25 bg-amber/[0.06] px-4 py-3">
                      <Info className="mt-0.5 size-4 shrink-0 text-amber" />
                      <p className="text-[12.5px] leading-relaxed text-fg-dim">{analysis.caveats}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-hair bg-surface/40 px-4 py-3">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-fg-faint" />
                  <p className="text-[12px] leading-relaxed text-fg-faint">
                    This is a standalone preview — nothing here is saved to a Building Passport. A real capture on a
                    job gets this same analysis plus spatial mapping and a licensed technician's review before it
                    joins the property's permanent record.
                  </p>
                </div>
              </motion.div>
            )}

            {phase === 'done' && mode === 'simulated' && result && (
              <motion.div key="done-sim" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {[
                      { icon: Layers, label: 'walls mapped', value: result.stats.wallsMapped },
                      { icon: Zap, label: 'fixtures found', value: result.stats.fixturesFound },
                      { icon: Gauge, label: 'confidence', value: `${Math.round(result.stats.confidence * 100)}%` },
                      { icon: Ruler, label: 'sq ft scanned', value: result.stats.sqft },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2 rounded-full border border-hair bg-surface/60 px-3 py-1.5">
                        <Icon className="size-3.5 text-cyan-soft" />
                        <span className="font-mono text-[12px] text-fg">{value}</span>
                        <span className="text-[11px] text-fg-faint">{label}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" onClick={reset}>
                    <RotateCcw className="size-3.5" /> Process another video
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                  <div className="glass overflow-hidden rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-4">
                      <LayerToggle active={activeLayers} onChange={setActiveLayers} />
                      <Badge tone="violet">Generated diagram — demo output</Badge>
                    </div>
                    <div className="aspect-[8/6] w-full overflow-hidden rounded-xl border border-hair bg-ink">
                      <XrayFloorplan
                        floorplan={result.floorplan}
                        activeLayers={activeLayers}
                        lines={result.lines}
                        studs={result.studs}
                        selectedId={selected?.id ?? null}
                        onSelect={setSelected}
                      />
                    </div>
                  </div>
                  <div className="min-h-[420px]">
                    <HotspotPanel hotspot={selected} onClose={() => setSelected(null)} />
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-hair bg-surface/40 px-4 py-3">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-fg-faint" />
                  <p className="text-[12px] leading-relaxed text-fg-faint">
                    Ready to make this official? A real capture gets reviewed by a licensed technician and attached to
                    the property's permanent, transferable Building Passport.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
      </Container>
    </section>
  )
}
