import Stripe from "stripe";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const UNLOCK_PRICE_CENTS = 4900; // $49.00 one-time, unlocks unlimited scans on one property

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
  if (property.paid) {
    return json(400, { error: "This property is already unlocked." }, headers);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Unlock ${property.address} — Stratum Vault` },
          unit_amount: UNLOCK_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL}?vault_checkout=success&vault_view_property=${propertyId}`,
    cancel_url: `${process.env.APP_URL}?vault_checkout=cancel&vault_view_property=${propertyId}`,
    // The webhook has no session/auth context, so this is how it knows
    // which property to mark paid once Stripe confirms payment.
    metadata: { propertyId, ownerEmail: email },
  });

  return json(200, { url: session.url }, headers);
};
