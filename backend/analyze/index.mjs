import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

const FindingSchema = z.object({
  category: z.enum(["plumbing", "electrical", "structural", "hvac", "material", "other"]),
  label: z.string(),
  description: z.string(),
  evidence: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

const AnalysisSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
  caveats: z.string(),
});

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method;
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body." });
  }

  const images = Array.isArray(payload.images) ? payload.images : [];
  if (images.length === 0) {
    return respond(400, { error: "Include at least one image (base64) in `images`." });
  }
  if (images.length > MAX_IMAGES) {
    return respond(400, { error: `Send at most ${MAX_IMAGES} frames per request.` });
  }

  const imageBlocks = [];
  for (const img of images) {
    if (!img || typeof img.data !== "string" || !ALLOWED_MEDIA_TYPES.has(img.mediaType)) {
      return respond(400, {
        error: "Each image needs `data` (base64 string) and a supported `mediaType` (image/jpeg, image/png, image/webp).",
      });
    }
    const approxBytes = (img.data.length * 3) / 4;
    if (approxBytes > MAX_IMAGE_BYTES) {
      return respond(400, { error: "Each image must be under 5MB." });
    }
    imageBlocks.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
  }

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4000,
      system:
        "You are a construction/building-systems inspector analyzing photos taken before drywall closes a wall. " +
        "Only report what is visibly identifiable in the images — pipe material, wire gauge markings, framing type, " +
        "visible brand or model plates, apparent stud spacing, duct material, and similar. Do not invent exact " +
        "measurements, spatial coordinates, or components you cannot actually see. If the images don't clearly " +
        "show construction elements, say so plainly in `caveats` instead of fabricating findings.",
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text:
                "Analyze these frames from a pre-drywall walkthrough. Identify every visible construction element " +
                "you can (plumbing, electrical, structural, HVAC, materials) with a short label, a plain-language " +
                "description, the specific visual evidence you're basing it on, and your confidence.",
            },
          ],
        },
      ],
      output_config: { effort: "medium", format: zodOutputFormat(AnalysisSchema) },
    });

    if (!response.parsed_output) {
      return respond(502, { error: "The model did not return parseable output. Try again." });
    }

    return respond(200, {
      summary: response.parsed_output.summary,
      findings: response.parsed_output.findings,
      caveats: response.parsed_output.caveats,
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic auth error:", error.message);
      return respond(500, { error: "Server misconfiguration: invalid Anthropic API key." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return respond(429, { error: "Rate limited by the AI provider — try again shortly." });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return respond(400, { error: error.message });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error:", error.status, error.message);
      return respond(502, { error: `Upstream API error: ${error.message}` });
    }
    console.error("Unexpected error:", error);
    return respond(500, { error: "Unexpected server error." });
  }
};
