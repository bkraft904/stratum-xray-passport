import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ddb, TABLES } from "/opt/nodejs/lib/db.mjs";
import { corsHeaders, json } from "/opt/nodejs/lib/http.mjs";

const ses = new SESClient({});
const TOKEN_TTL_MINUTES = 15;

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." }, headers);
  }

  const email = body.email?.toLowerCase().trim();
  if (!isValidEmail(email)) {
    return json(400, { error: "A valid email address is required." }, headers);
  }

  const token = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_MINUTES * 60;

  await ddb.send(
    new PutCommand({
      TableName: TABLES.loginTokens,
      Item: { token, email, expiresAt, used: false },
    })
  );

  const link = `${process.env.APP_URL}/auth/verify?token=${token}`;

  await ses.send(
    new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Your Stratum Vault sign-in link" },
        Body: {
          Text: {
            Data: `Sign in to Stratum Vault: ${link}\n\nThis link expires in ${TOKEN_TTL_MINUTES} minutes and can only be used once.`,
          },
        },
      },
    })
  );

  return json(200, { message: "Check your email for a sign-in link." }, headers);
};
