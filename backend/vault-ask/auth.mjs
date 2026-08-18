import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const SESSION_TTL = "30d";

export function signSession(email) {
  return jwt.sign({ email }, SECRET, { expiresIn: SESSION_TTL });
}

export function verifySession(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.email;
  } catch {
    return null;
  }
}

/**
 * Pulls the session token from an HttpApi (payload format 2.0) event's
 * Authorization header and returns the owning email, or null.
 */
export function authenticate(event) {
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return verifySession(header.slice("Bearer ".length));
}

export function unauthorized(corsHeaders) {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify({ error: "Sign in required." }),
  };
}
