import bcrypt from "bcryptjs";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

const MIN_PASSWORD_LENGTH = 8;

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

  const newPassword = body.newPassword;
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return json(400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, headers);
  }

  // Setting this while already signed in (via a valid session — however
  // that session was obtained, magic link included) is how a forgotten
  // password gets reset: sign in with the email link, then set a new one.
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.users,
      Key: { email },
      UpdateExpression: "SET passwordHash = :hash",
      ExpressionAttributeValues: { ":hash": passwordHash },
    })
  );

  return json(200, { message: "Password updated." }, headers);
};
