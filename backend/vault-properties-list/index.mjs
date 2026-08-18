import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "/opt/nodejs/lib/db.mjs";
import { authenticate, unauthorized } from "/opt/nodejs/lib/auth.mjs";
import { corsHeaders, json } from "/opt/nodejs/lib/http.mjs";

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const email = authenticate(event);
  if (!email) return unauthorized(headers);

  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: TABLES.properties,
      IndexName: "ownerEmail-index",
      KeyConditionExpression: "ownerEmail = :email",
      ExpressionAttributeValues: { ":email": email },
    })
  );

  return json(200, { properties: Items || [] }, headers);
};
