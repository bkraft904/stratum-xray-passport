import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { corsHeaders, json } from "./http.mjs";

// Unauthenticated by design — this fires on every page load, before anyone
// has (or needs) an account. Kept to a handful of coarse fields on purpose:
// no IP storage, no fingerprinting, no third-party cookies. visitorId is a
// random id the frontend generates itself and keeps in localStorage, used
// only to approximate unique visitors — never tied to an email unless that
// browser later also happens to sign in (the two are never linked here).
export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    body = {};
  }

  const view = typeof body.view === "string" ? body.view.slice(0, 40) : "home";
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 200) : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 64) : "";

  await ddb.send(
    new PutCommand({
      TableName: TABLES.events,
      Item: {
        eventId: randomUUID(),
        type: "page_view",
        email: "unknown",
        propertyId: "",
        view,
        referrer,
        visitorId,
        createdAt: new Date().toISOString(),
      },
    })
  );

  return json(200, { ok: true }, headers);
};
