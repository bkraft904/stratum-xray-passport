import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";
import { trackEvent } from "./event.mjs";

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const email = authenticate(event);
  if (!email) return unauthorized(headers);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." }, headers);
  }

  const address = body.address?.trim();
  if (!address) return json(400, { error: "An address is required." }, headers);

  const propertyId = randomUUID();
  const createdAt = new Date().toISOString();

  // First scan is free (scanCount check in vault-scans-create); paid
  // unlocks every scan after that for this property.
  const property = { propertyId, ownerEmail: email, address, createdAt, shareEnabled: false, paid: false, scanCount: 0 };

  await ddb.send(new PutCommand({ TableName: TABLES.properties, Item: property }));

  await trackEvent("property_created", { email, propertyId });

  return json(201, property, headers);
};
