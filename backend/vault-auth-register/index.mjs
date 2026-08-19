import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ddb, TABLES } from "./db.mjs";
import { corsHeaders, json } from "./http.mjs";
import { trackEvent } from "./event.mjs";

const ses = new SESClient({});
const TOKEN_TTL_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 8;

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

  const password = body.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return json(400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, headers);
  }

  const { Item: existingUser } = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { email } }));
  if (existingUser?.passwordHash) {
    return json(409, { error: "An account with this email already has a password. Sign in instead." }, headers);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const token = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_MINUTES * 60;

  await ddb.send(
    new PutCommand({
      TableName: TABLES.loginTokens,
      // pendingPasswordHash is read (and applied to the Users record) by
      // vault-auth-verify when this token is clicked — this is what turns
      // "prove you own this email" into "and also activate this password."
      Item: { token, email, expiresAt, used: false, pendingPasswordHash: passwordHash },
    })
  );

  const link = `${process.env.APP_URL}?vault_token=${token}`;

  const textBody = `Verify your Stratum Vault account

Click the link below to verify your email and activate your account:

${link}

This link expires in ${TOKEN_TTL_MINUTES} minutes and can only be used once. If you didn't request this, you can safely ignore this email.

— Stratum Vault`;

  const htmlBody = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Verify your Stratum Vault account</h2>
      <p style="color: #555;">Click below to verify your email and activate your account.</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #0d6efd; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Verify email
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
        Subject: { Data: "Verify your Stratum Vault account" },
        Body: {
          Text: { Data: textBody },
          Html: { Data: htmlBody },
        },
      },
    })
  );

  await trackEvent("account_registered", { email });

  return json(200, { message: "Check your email to verify your account." }, headers);
};
