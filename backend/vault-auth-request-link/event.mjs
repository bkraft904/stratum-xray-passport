import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";

// Best-effort funnel tracking — never blocks or fails the request it's
// called from. Fire-and-forget by design: a dropped analytics write is not
// worth turning a real user action into a 500.
export async function trackEvent(type, { email, propertyId } = {}) {
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLES.events,
        Item: {
          eventId: randomUUID(),
          type,
          email: email || "unknown",
          propertyId: propertyId || "",
          createdAt: new Date().toISOString(),
        },
      })
    );
  } catch (err) {
    console.error("trackEvent failed (non-fatal):", type, err.message);
  }
}
