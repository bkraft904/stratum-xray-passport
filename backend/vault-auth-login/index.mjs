import bcrypt from "bcryptjs";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { signSession } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";
import { trackEvent } from "./event.mjs";

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
  const password = body.password;
  if (!email || typeof password !== "string") {
    return json(400, { error: "Email and password are required." }, headers);
  }

  const { Item: user } = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { email } }));

  if (user && !user.passwordHash) {
    // A real account that just hasn't set a password yet (e.g. it only
    // ever signed in via the email link) — worth saying plainly, since
    // that's a very likely case for early accounts and "wrong password"
    // would send them looking for a password they never set.
    return json(401, { error: "This account doesn't have a password yet — use the email link to sign in, then set one from your account settings.", code: "NO_PASSWORD_SET" }, headers);
  }

  if (!user) {
    // Generic on purpose — doesn't confirm whether this email is registered.
    return json(401, { error: "Incorrect email or password." }, headers);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return json(401, { error: "Incorrect email or password." }, headers);
  }

  await trackEvent("sign_in_completed", { email });

  const session = signSession(email);
  return json(200, { session, email }, headers);
};
