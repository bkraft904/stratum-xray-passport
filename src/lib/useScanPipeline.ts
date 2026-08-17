import { useCallback, useRef, useState } from 'react'
import { generateScan, type ScanResult } from './floorplan'
import { extractFramesFromVideo, imageFileToFrame, isImageFile, isVideoFile, type Frame } from './frameExtractor'
import { analyzeFrames, isRealAnalysisConfigured, type AnalysisResult } from './analyzeApi'

export type Phase = 'idle' | 'uploading' | 'processing' | 'extracting' | 'analyzing' | 'done' | 'error'
export type Mode = 'real' | 'simulated'

export interface StageDef {
  key: string
  label: string
  logs: string[]
}

export const STAGES: StageDef[] = [
  {
    key: 'ingest',
    label: 'Ingest & frame extraction',
    logs: [
      'Reading container metadata…',
      'Normalizing rotation & exposure…',
      'Extracting frames at 6 fps…',
      'Discarding blurred / duplicate frames…',
    ],
  },
  {
    key: 'detect',
    label: 'Object & material detection',
    logs: [
      'Identifying framing members…',
      'Classifying romex runs (12/2, 14/2)…',
      'Detecting PEX / copper supply lines…',
      'Flagging shutoff valves…',
      'Reading visible serials & model plates…',
    ],
  },
  {
    key: 'depth',
    label: 'Depth & 3D reconstruction',
    logs: [
      'Estimating camera trajectory…',
      'Building sparse point cloud…',
      'Aligning frames to floor plane…',
      'Resolving wall-cavity depth…',
    ],
  },
  {
    key: 'synth',
    label: 'X-ray diagram synthesis',
    logs: [
      'Merging trade layers…',
      'Cross-referencing permit data…',
      'Rendering floor-accurate diagram…',
      'Finalizing confidence scores…',
    ],
  },
]

function wait(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    const id = setTimeout(() => resolve(), ms)
    const check = setInterval(() => {
      if (signal.cancelled) {
        clearTimeout(id)
        clearInterval(check)
        resolve()
      }
    }, 60)
    // stop checking once resolved naturally
    setTimeout(() => clearInterval(check), ms + 80)
  })
}

export function useScanPipeline() {
  const [mode, setMode] = useState<Mode>('simulated')
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [chunkInfo, setChunkInfo] = useState({ current: 0, total: 0 })
  const [stageIndex, setStageIndex] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const [result, setResult] = useState<ScanResult | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runToken = useRef(0)
  const cancelSignal = useRef({ cancelled: false })

  const reset = useCallback(() => {
    cancelSignal.current.cancelled = true
    runToken.current += 1
    setPhase('idle')
    setUploadProgress(0)
    setStageIndex(0)
    setStageProgress(0)
    setLog([])
    setResult(null)
    setFrames([])
    setAnalysis(null)
    setErrorMessage(null)
  }, [])

  const runReal = useCallback(async (file: File, signal: { cancelled: boolean }, token: number) => {
    setPhase('extracting')
    setLog(['Reading file…'])
    try {
      const extracted = isVideoFile(file)
        ? await extractFramesFromVideo(file, 4)
        : isImageFile(file)
          ? [await imageFileToFrame(file)]
          : (() => {
              throw new Error('Unsupported file type — upload a video or an image.')
            })()

      if (signal.cancelled || runToken.current !== token) return
      setFrames(extracted)
      setLog((prev) => [...prev, `Captured ${extracted.length} frame${extracted.length === 1 ? '' : 's'} for analysis.`])

      setPhase('analyzing')
      setLog((prev) => [...prev, `Sending ${extracted.length} frame${extracted.length === 1 ? '' : 's'} to Claude Opus 5…`])

      const analysisResult = await analyzeFrames(extracted)
      if (signal.cancelled || runToken.current !== token) return

      setLog((prev) => [...prev, 'Received analysis.'])
      setAnalysis(analysisResult)
      setPhase('done')
    } catch (err) {
      if (signal.cancelled || runToken.current !== token) return
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong analyzing your upload.')
      setPhase('error')
    }
  }, [])

  const runSimulated = useCallback(async (file: File, signal: { cancelled: boolean }, token: number) => {
    setPhase('uploading')

    const CHUNK = 4 * 1024 * 1024
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK))
    setChunkInfo({ current: 0, total: totalChunks })

    const uploadMs = Math.min(6500, Math.max(1400, (file.size / (1024 * 1024)) * 55))
    const steps = Math.min(totalChunks, 40)
    for (let i = 1; i <= steps; i++) {
      if (signal.cancelled || runToken.current !== token) return
      await wait(uploadMs / steps, signal)
      const pct = Math.round((i / steps) * 100)
      setUploadProgress(pct)
      setChunkInfo({ current: Math.round((i / steps) * totalChunks), total: totalChunks })
    }
    if (signal.cancelled || runToken.current !== token) return

    setPhase('processing')
    for (let s = 0; s < STAGES.length; s++) {
      if (signal.cancelled || runToken.current !== token) return
      setStageIndex(s)
      setStageProgress(0)
      const stage = STAGES[s]
      for (let l = 0; l < stage.logs.length; l++) {
        if (signal.cancelled || runToken.current !== token) return
        await wait(280 + Math.random() * 260, signal)
        setLog((prev) => [...prev, stage.logs[l]])
        setStageProgress(Math.round(((l + 1) / stage.logs.length) * 100))
      }
      await wait(180, signal)
    }
    if (signal.cancelled || runToken.current !== token) return

    const scan = generateScan(`${file.name}-${file.size}-${file.lastModified}`)
    setResult(scan)
    setPhase('done')
  }, [])

  const start = useCallback(
    async (file: File) => {
      cancelSignal.current.cancelled = true
      await Promise.resolve()
      const signal = { cancelled: false }
      cancelSignal.current = signal
      const token = ++runToken.current

      const useReal = isRealAnalysisConfigured()
      setMode(useReal ? 'real' : 'simulated')
      setFileName(file.name)
      setFileSize(file.size)
      setUploadProgress(0)
      setStageIndex(0)
      setStageProgress(0)
      setLog([])
      setResult(null)
      setFrames([])
      setAnalysis(null)
      setErrorMessage(null)

      if (useReal) {
        await runReal(file, signal, token)
      } else {
        await runSimulated(file, signal, token)
      }
    },
    [runReal, runSimulated],
  )

  return {
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
  }
}
