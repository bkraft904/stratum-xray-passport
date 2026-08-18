import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

const ses = new SESClient({});
const TOKEN_TTL_MINUTES = 60 * 24 * 7; // one week to accept

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." }, headers);
  }

  const newOwnerEmail = body.newOwnerEmail?.toLowerCase().trim();
  if (!isValidEmail(newOwnerEmail)) {
    return json(400, { error: "A valid recipient email address is required." }, headers);
  }
  if (newOwnerEmail === email) {
    return json(400, { error: "That's already the current owner." }, headers);
  }

  const token = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_MINUTES * 60;

  await ddb.send(
    new PutCommand({
      TableName: TABLES.transferTokens,
      Item: { token, propertyId, newOwnerEmail, fromEmail: email, expiresAt, used: false },
    })
  );

  const link = `${process.env.APP_URL}?vault_transfer_token=${token}`;

  const textBody = `${email} wants to transfer ownership of "${property.address}" on Stratum Vault to you.

Accept the transfer and sign in here:

${link}

This link expires in 7 days. If you weren't expecting this, you can safely ignore this email — nothing changes until you accept.

— Stratum Vault`;

  const htmlBody = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">You've been offered a property record</h2>
      <p style="color: #555;"><strong>${email}</strong> wants to transfer ownership of <strong>${property.address}</strong> on Stratum Vault to you — its full X-ray record, permanently.</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #0d6efd; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Accept transfer &amp; sign in
        </a>
      </p>
      <p style="color: #888; font-size: 13px;">This link expires in 7 days. If you weren't expecting this, you can safely ignore this email — nothing changes until you accept.</p>
    </div>
  `;

  await ses.send(
    new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: { ToAddresses: [newOwnerEmail] },
      Message: {
        Subject: { Data: `${email} wants to transfer a property record to you` },
        Body: { Text: { Data: textBody }, Html: { Data: htmlBody } },
      },
    })
  );

  return json(200, { message: `Transfer offer sent to ${newOwnerEmail}.` }, headers);
};
