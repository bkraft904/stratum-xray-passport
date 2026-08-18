import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { corsHeaders, json } from "./http.mjs";

export const handler = async (event) => {
  const headers = corsHeaders(process.env.ALLOWED_ORIGIN);
  if (event.requestContext?.http?.method === "OPTIONS") return json(200, {}, headers);

  const propertyId = event.pathParameters?.id;
  if (!propertyId) return json(400, { error: "Missing property id." }, headers);

  const { Item: property } = await ddb.send(
    new GetCommand({ TableName: TABLES.properties, Key: { propertyId } })
  );

  // Same 404 whether the property doesn't exist or just isn't shared —
  // don't confirm the existence of a private record to an anonymous caller.
  if (!property || !property.shareEnabled) {
    return json(404, { error: "Not found." }, headers);
  }

  const { Items: scans } = await ddb.send(
    new QueryCommand({
      TableName: TABLES.scans,
      KeyConditionExpression: "propertyId = :id",
      ExpressionAttributeValues: { ":id": propertyId },
      ScanIndexForward: false,
    })
  );

  return json(
    200,
    {
      address: property.address,
      scans: (scans || []).map(({ scanId, createdAt, imageType, summary, findings }) => ({
        scanId,
        createdAt,
        imageType,
        summary,
        findings,
      })),
    },
    headers
  );
};
