import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

// Comma-separated list, e.g. "you@example.com,cofounder@example.com".
// Empty (the default) means nobody is authorized — fail closed until
// explicitly configured, same pattern as the blank Stripe keys.
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || "")
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const email = authenticate(event);
  if (!email) return unauthorized(headers);
  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    return json(403, { error: "Not authorized." }, headers);
  }

  const requestedDays = parseInt(event.queryStringParameters?.days || "30", 10);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 365) : 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const counts = {};
  const events = [];
  let ExclusiveStartKey;
  // Scan + filter is fine at this stage's event volume; revisit with a
  // type+createdAt GSI if this table ever grows large enough for a full
  // scan to matter. Raw events (not just counts) are returned so the
  // frontend can build a daily trend and a per-user breakdown without a
  // separate endpoint for each slice.
  do {
    const { Items, LastEvaluatedKey } = await ddb.send(
      new ScanCommand({
        TableName: TABLES.events,
        FilterExpression: "createdAt >= :cutoff",
        ExpressionAttributeValues: { ":cutoff": cutoff },
        ExclusiveStartKey,
      })
    );
    for (const item of Items || []) {
      counts[item.type] = (counts[item.type] || 0) + 1;
      events.push({ type: item.type, email: item.email, createdAt: item.createdAt });
    }
    ExclusiveStartKey = LastEvaluatedKey;
  } while (ExclusiveStartKey);

  events.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return json(200, { days, counts, events }, headers);
};
