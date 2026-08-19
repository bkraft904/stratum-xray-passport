import Stripe from "stripe";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";
import { TIERS } from "./tiers.mjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  const tier = body.tier;
  const plan = TIERS[tier];
  if (!plan) {
    return json(400, { error: `Unknown tier. Choose one of: ${Object.keys(TIERS).join(", ")}.` }, headers);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Stratum Vault — ${plan.name} plan` },
          unit_amount: plan.priceCents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL}?vault_checkout=success`,
    cancel_url: `${process.env.APP_URL}?vault_checkout=cancel`,
    // The webhook has no session/auth context for subscription lifecycle
    // events (they arrive keyed by subscription/customer id, not session
    // id), so metadata on the subscription itself is how it knows whose
    // record to update.
    subscription_data: { metadata: { email, tier } },
    metadata: { email, tier },
  });

  return json(200, { url: session.url }, headers);
};
