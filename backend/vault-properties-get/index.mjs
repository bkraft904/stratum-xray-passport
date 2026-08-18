import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "/opt/nodejs/lib/db.mjs";
import { authenticate, unauthorized } from "/opt/nodejs/lib/auth.mjs";
import { corsHeaders, json } from "/opt/nodejs/lib/http.mjs";

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

  const { Items: scans } = await ddb.send(
    new QueryCommand({
      TableName: TABLES.scans,
      KeyConditionExpression: "propertyId = :id",
      ExpressionAttributeValues: { ":id": propertyId },
      ScanIndexForward: false,
    })
  );

  return json(200, { property, scans: scans || [] }, headers);
};
