import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "./db.mjs";
import { authenticate, unauthorized } from "./auth.mjs";
import { corsHeaders, json } from "./http.mjs";
import { client } from "./vision.mjs";

const ASK_SYSTEM_PROMPT = `You are Stratum Vault's assistant. Answer the owner's question about their
property using ONLY the scan findings provided below. If the answer isn't in the data, say so plainly
and suggest what kind of scan would capture it — never guess or invent a location, material, or
measurement that isn't in the findings.`;

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

  const question = body.question?.trim();
  if (!question) return json(400, { error: "A question is required." }, headers);

  const { Items: scans } = await ddb.send(
    new QueryCommand({
      TableName: TABLES.scans,
      KeyConditionExpression: "propertyId = :id",
      ExpressionAttributeValues: { ":id": propertyId },
    })
  );

  const findingsOnly = (scans || []).flatMap((scan) =>
    scan.findings.map((f) => ({ ...f, scanDate: scan.createdAt, imageType: scan.imageType }))
  );

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    system: ASK_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Findings for ${property.address}:\n${JSON.stringify(findingsOnly, null, 2)}\n\nQuestion: ${question}`,
      },
    ],
  });

  const answer = response.content.find((block) => block.type === "text")?.text ?? "";

  return json(200, { answer }, headers);
};
