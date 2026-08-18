import type { Frame } from './frameExtractor'

export type FindingCategory = 'plumbing' | 'electrical' | 'structural' | 'hvac' | 'material' | 'other'

export type ImageType = 'wall_section_closeup' | 'full_room_view' | 'floor_plan_document' | 'multiple_areas' | 'unclear_or_unrelated'

export interface Finding {
  category: FindingCategory
  label: string
  description: string
  evidence: string
  confidence: 'low' | 'medium' | 'high'
}

export interface AnalysisResult {
  imageType: ImageType
  scopeNote: string
  summary: string
  findings: Finding[]
  caveats: string
  model: string
  usage: { input_tokens: number; output_tokens: number }
}

export const ANALYZE_API_URL: string | undefined = import.meta.env.VITE_ANALYZE_API_URL

export function isRealAnalysisConfigured(): boolean {
  return typeof ANALYZE_API_URL === 'string' && ANALYZE_API_URL.length > 0
}

export async function analyzeFrames(frames: Frame[]): Promise<AnalysisResult> {
  if (!ANALYZE_API_URL) {
    throw new Error('VITE_ANALYZE_API_URL is not configured.')
  }

  const response = await fetch(ANALYZE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: frames }),
  })

  if (!response.ok) {
    let message = `Analysis request failed (${response.status}).`
    try {
      const body = await response.json()
      if (typeof body?.error === 'string') message = body.error
    } catch {
      /* response wasn't JSON — keep the generic message */
    }
    throw new Error(message)
  }

  return (await response.json()) as AnalysisResult
}
