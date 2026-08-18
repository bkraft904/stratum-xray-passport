import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "/opt/nodejs/lib/db.mjs";
import { authenticate, unauthorized } from "/opt/nodejs/lib/auth.mjs";
import { corsHeaders, json } from "/opt/nodejs/lib/http.mjs";
import { analyzeImages, MAX_IMAGES, MAX_IMAGE_BYTES, ALLOWED_MEDIA_TYPES } from "/opt/nodejs/lib/vision.mjs";

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const email = authenticate(event);
  if (!email) return unauthorized(headers);

  const propertyId = event.pathParameters?.id;
  if (!propertyId) return json(400, { error: "Missing property id." }, headers);

  const { Item: property } = await ddb.send(
    new GetCommand({ TableName: TABLES.properties, Key: { propertyId } })
  );
  if (!property || property.ownerEmail !== email) {
    return json(404, { error: "Property not found." }, headers);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." }, headers);
  }

  const images = body.images;
  if (!Array.isArray(images) || images.length === 0) {
    return json(400, { error: "At least one image is required." }, headers);
  }
  if (images.length > MAX_IMAGES) {
    return json(400, { error: `No more than ${MAX_IMAGES} images per scan.` }, headers);
  }
  for (const img of images) {
    if (!ALLOWED_MEDIA_TYPES.includes(img.mediaType)) {
      return json(400, { error: `Unsupported media type: ${img.mediaType}` }, headers);
    }
    if (Buffer.byteLength(img.data, "base64") > MAX_IMAGE_BYTES) {
      return json(400, { error: "One or more images exceed the 5MB limit." }, headers);
    }
  }

  let analysis;
  try {
    analysis = await analyzeImages(images);
  } catch (err) {
    const status = err.status || 500;
    return json(status, { error: "Vision analysis failed. Please try again." }, headers);
  }

  const scanId = `${new Date().toISOString()}#${randomUUID()}`;
  const createdAt = new Date().toISOString();

  const scan = {
    propertyId,
    scanId,
    createdAt,
    imageType: analysis.imageType,
    scopeNote: analysis.scopeNote,
    summary: analysis.summary,
    findings: analysis.findings,
    caveats: analysis.caveats,
    model: analysis.model,
    usage: analysis.usage,
  };

  await ddb.send(new PutCommand({ TableName: TABLES.scans, Item: scan }));

  return json(201, scan, headers);
};
