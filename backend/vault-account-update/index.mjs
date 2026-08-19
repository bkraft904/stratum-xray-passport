import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

const MAX_COMPANY_NAME_LENGTH = 80;

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

  const companyName = (body.companyName || "").trim().slice(0, MAX_COMPANY_NAME_LENGTH);

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.users,
      Key: { email },
      UpdateExpression: "SET companyName = :name",
      ExpressionAttributeValues: { ":name": companyName },
    })
  );

  return json(200, { companyName }, headers);
};
