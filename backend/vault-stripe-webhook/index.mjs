import Stripe from "stripe";
import { UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { json } from "./http.mjs";
import { trackEvent } from "./event.mjs";

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

    if (session.mode === "payment") {
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
        await trackEvent("checkout_completed", { email: session.metadata?.ownerEmail, propertyId });
      }
    }

    if (session.mode === "subscription") {
      const email = session.metadata?.email;
      const tier = session.metadata?.tier;
      if (email && tier && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await ddb.send(
          new PutCommand({
            TableName: TABLES.subscriptions,
            Item: {
              email,
              tier,
              status: subscription.status,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              scansUsedThisPeriod: 0,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              createdAt: new Date().toISOString(),
            },
          })
        );
        await trackEvent("subscription_started", { email });
      }
    }
  }

  if (stripeEvent.type === "customer.subscription.updated") {
    const subscription = stripeEvent.data.object;
    const email = subscription.metadata?.email;
    if (email) {
      const { Item: existing } = await ddb.send(new GetCommand({ TableName: TABLES.subscriptions, Key: { email } }));
      const newPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      // A changed period end means a new billing cycle actually started
      // (renewal or plan change) — that's the signal to reset usage, not
      // every "updated" event (those also fire for things like payment
      // method changes, which shouldn't wipe the current period's count).
      const periodRolledOver = !existing || existing.currentPeriodEnd !== newPeriodEnd;
      await ddb.send(
        new UpdateCommand({
          TableName: TABLES.subscriptions,
          Key: { email },
          UpdateExpression:
            "SET #status = :status, tier = :tier, currentPeriodEnd = :end, scansUsedThisPeriod = :scans",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": subscription.status,
            ":tier": subscription.metadata?.tier || existing?.tier,
            ":end": newPeriodEnd,
            ":scans": periodRolledOver ? 0 : existing?.scansUsedThisPeriod || 0,
          },
        })
      );
    }
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    const subscription = stripeEvent.data.object;
    const email = subscription.metadata?.email;
    if (email) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLES.subscriptions,
          Key: { email },
          UpdateExpression: "SET #status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": "canceled" },
        })
      );
      await trackEvent("subscription_canceled", { email });
    }
  }

  return json(200, { received: true });
};
