import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_TYPES = [
  "wall_section_closeup",
  "full_room_view",
  "floor_plan_document",
  "multiple_areas",
  "unclear_or_unrelated",
];

export const FindingSchema = z.object({
  category: z.enum(["plumbing", "electrical", "structural", "hvac", "material", "other"]),
  label: z.string(),
  description: z.string(),
  evidence: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

export const AnalysisSchema = z.object({
  imageType: z.enum(IMAGE_TYPES),
  scopeNote: z.string(),
  summary: z.string(),
  findings: z.array(FindingSchema),
  caveats: z.string(),
});

const ANALYSIS_SYSTEM_PROMPT = `You are Stratum Vault's vision analyst. You examine construction/renovation
photos and produce a structured record of what's visible before it gets sealed behind drywall.

First classify the image itself as one of: wall_section_closeup, full_room_view, floor_plan_document,
multiple_areas, unclear_or_unrelated. Then write a one-sentence scopeNote describing exactly what
the photo(s) show. Then analyze accordingly:
- wall_section_closeup / full_room_view / multiple_areas: list concrete findings (plumbing,
  electrical, structural, hvac, material, other) with a label, description, the visual evidence
  that supports it, and a confidence level. Do not invent findings you can't see.
- floor_plan_document: describe the document itself in the summary; do not invent behind-the-wall
  findings from a drawing.
- unclear_or_unrelated: return an empty findings array rather than fabricate anything.

Always include a caveats string noting the limits of a phone-photo analysis (no measurements,
possible obstruction, lighting, etc).`;

/**
 * Runs the same structured vision analysis used by the original Scan Lab
 * backend, reusable across scan-create, and (for a lighter touch) inside
 * report/ask synthesis over already-stored findings.
 */
export async function analyzeImages(images) {
  const content = [
    { type: "text", text: "Analyze the following photo(s):" },
    ...images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    })),
  ];

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: { effort: "medium", format: zodOutputFormat(AnalysisSchema) },
  });

  return {
    ...response.parsed,
    model: response.model,
    usage: response.usage,
  };
}
