import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  FileVideo,
  Gauge,
  Info,
  Layers,
  Loader2,
  RotateCcw,
  Ruler,
  ShieldAlert,
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
import type { Hotspot, Layer } from '../lib/floorplan'

export function ScanLab() {
  const { phase, fileName, fileSize, uploadProgress, chunkInfo, stageIndex, stageProgress, log, result, start, reset } =
    useScanPipeline()

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
  }, [result])

  function handleFile(file: File | null) {
    if (!file) return
    setThumb(null)

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

    start(file)
  }

  const isBusy = phase === 'uploading' || phase === 'processing'

  return (
    <section id="scan-lab" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet/10 blur-[160px]" />
      <Container className="relative">
        <SectionHeading
          eyebrow="AI Scan Lab"
          icon={<Sparkles className="size-3" />}
          title="Turn a walkthrough video into an X-ray diagram"
          description="Drop in footage from before the drywall closed — any length, any file size. Stratum's pipeline extracts frames, detects trades, and synthesizes a floor-accurate breakdown."
          align="center"
        />

        <div className="mx-auto mt-6 max-w-xl">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber/25 bg-amber/[0.06] px-4 py-3 text-left">
            <Info className="mt-0.5 size-4 shrink-0 text-amber" />
            <p className="text-[12.5px] leading-relaxed text-fg-dim">
              <span className="font-medium text-amber">Live demo simulation.</span> This lab runs entirely in your
              browser to preview the experience — your video never leaves your device, and the diagram below is a
              generated illustration, not a real analysis of your footage. Production scans are processed by our
              vision pipeline and reviewed by a licensed technician before joining a property's permanent record.
            </p>
          </div>
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
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex size-16 items-center justify-center rounded-2xl border border-cyan/25 bg-cyan/10 text-cyan transition-transform duration-200 group-hover:scale-105">
                    <UploadCloud className="size-7" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-medium text-fg">Drop a walkthrough video here</p>
                    <p className="mt-1.5 text-sm text-fg-dim">or click to browse — MP4, MOV, HEVC, anything your camera shoots</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Badge tone="neutral">No size limit</Badge>
                    <Badge tone="neutral">Resumable chunked upload</Badge>
                    <Badge tone="neutral">Processed on-device for this demo</Badge>
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
              </motion.div>
            )}

            {phase === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
