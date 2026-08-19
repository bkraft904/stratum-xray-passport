import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";
import { trackEvent } from "./event.mjs";

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

  const enabled = body.enabled === true;

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.properties,
      Key: { propertyId },
      UpdateExpression: "SET shareEnabled = :enabled",
      ExpressionAttributeValues: { ":enabled": enabled },
    })
  );

  if (enabled) await trackEvent("share_enabled", { email, propertyId });

  return json(200, { propertyId, shareEnabled: enabled }, headers);
};
