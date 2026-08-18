import Stripe from "stripe";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { json } from "./http.mjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  // No CORS headers here on purpose — this is a server-to-server call from
  // Stripe, never a browser request, and never needs to succeed for OPTIONS.
  const signature = event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"];

  // Stripe's signature check needs the exact raw bytes it signed — parsing
  // event.body as JSON first (even just to re-stringify it) breaks
  // verification, since whitespace/key-order changes the byte content.
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return json(400, { error: `Webhook signature verification failed: ${err.message}` });
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const propertyId = session.metadata?.propertyId;
    if (propertyId) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLES.properties,
          Key: { propertyId },
          UpdateExpression: "SET paid = :true",
          ExpressionAttributeValues: { ":true": true },
        })
      );
    }
  }

  return json(200, { received: true });
};
