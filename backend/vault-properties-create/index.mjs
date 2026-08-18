import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "/opt/nodejs/lib/db.mjs";
import { authenticate, unauthorized } from "/opt/nodejs/lib/auth.mjs";
import { corsHeaders, json } from "/opt/nodejs/lib/http.mjs";

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

  await ddb.send(
    new PutCommand({
      TableName: TABLES.properties,
      Item: { propertyId, ownerEmail: email, address, createdAt, shareEnabled: false },
    })
  );

  return json(201, { propertyId, address, createdAt }, headers);
};
