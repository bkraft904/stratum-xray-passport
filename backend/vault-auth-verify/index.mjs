import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { signSession } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const token = event.queryStringParameters?.token;
  if (!token) return json(400, { error: "Missing token." }, headers);

  const { Item: record } = await ddb.send(
    new GetCommand({ TableName: TABLES.loginTokens, Key: { token } })
  );

  const now = Math.floor(Date.now() / 1000);
  if (!record || record.used || record.expiresAt < now) {
    return json(400, { error: "This sign-in link is invalid or has expired." }, headers);
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.loginTokens,
      Key: { token },
      UpdateExpression: "SET used = :true",
      ExpressionAttributeValues: { ":true": true },
    })
  );

  await ddb.send(
    new PutCommand({
      TableName: TABLES.users,
      Item: { email: record.email, createdAt: new Date().toISOString() },
      ConditionExpression: "attribute_not_exists(email)",
    })
  ).catch((err) => {
    if (err.name !== "ConditionalCheckFailedException") throw err;
  });

  const session = signSession(record.email);
  return json(200, { session, email: record.email }, headers);
};
