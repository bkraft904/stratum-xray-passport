import Stripe from "stripe";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const email = authenticate(event);
  if (!email) return unauthorized(headers);

  const { Item: sub } = await ddb.send(
    new GetCommand({ TableName: TABLES.subscriptions, Key: { email } })
  );
  if (!sub?.stripeCustomerId) {
    return json(404, { error: "No subscription found for this account." }, headers);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: process.env.APP_URL,
  });

  return json(200, { url: session.url }, headers);
};
