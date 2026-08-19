import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";
import { TIERS } from "./tiers.mjs";

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const email = authenticate(event);
  if (!email) return unauthorized(headers);

  const { Item: sub } = await ddb.send(
    new GetCommand({ TableName: TABLES.subscriptions, Key: { email } })
  );

  if (!sub) return json(200, { subscription: null }, headers);

  const plan = TIERS[sub.tier];
  return json(
    200,
    {
      subscription: {
        tier: sub.tier,
        tierName: plan?.name || sub.tier,
        status: sub.status,
        scansUsedThisPeriod: sub.scansUsedThisPeriod || 0,
        scanCap: plan ? (Number.isFinite(plan.scanCap) ? plan.scanCap : null) : null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
      },
    },
    headers
  );
};
