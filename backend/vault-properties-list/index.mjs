import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";

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
