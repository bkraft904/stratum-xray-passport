import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ddb, TABLES } from "./db.mjs";
import { corsHeaders, json } from "./http.mjs";

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

  const textBody = `Sign in to Stratum Vault

Click the link below to access your property's X-ray record:

${link}

This link expires in ${TOKEN_TTL_MINUTES} minutes and can only be used once. If you didn't request this, you can safely ignore this email.

— Stratum Vault`;

  const htmlBody = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Sign in to Stratum Vault</h2>
      <p style="color: #555;">Click below to access your property's X-ray record — the permanent, AI-analyzed record of what's behind your walls.</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #0d6efd; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Sign in to Stratum Vault
        </a>
      </p>
      <p style="color: #888; font-size: 13px;">This link expires in ${TOKEN_TTL_MINUTES} minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  await ses.send(
    new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Sign in to Stratum Vault" },
        Body: {
          Text: { Data: textBody },
          Html: { Data: htmlBody },
        },
      },
    })
  );

  return json(200, { message: "Check your email for a sign-in link." }, headers);
};
