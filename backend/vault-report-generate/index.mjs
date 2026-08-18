import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLES } from "/opt/nodejs/lib/db.mjs";
import { authenticate, unauthorized } from "/opt/nodejs/lib/auth.mjs";
import { corsHeaders, json } from "/opt/nodejs/lib/http.mjs";
import { client } from "/opt/nodejs/lib/vision.mjs";

const REPORT_SYSTEM_PROMPT = `You are Stratum Vault's report writer. You are given a JSON list of scans
for one property, each already containing structured, verified findings from earlier vision analysis.
Synthesize them into one coherent, well-organized property record in Markdown: group related findings
(plumbing, electrical, structural, hvac, material), note anything documented more than once, and end
with a short caveats section. Do not invent anything not present in the provided data.`;

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
    })
  );

  if (!scans || scans.length === 0) {
    return json(200, { report: "No scans recorded for this property yet." }, headers);
  }

  const scanData = scans.map(({ scanId, createdAt, imageType, scopeNote, summary, findings, caveats }) => ({
    scanId, createdAt, imageType, scopeNote, summary, findings, caveats,
  }));

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: REPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Property: ${property.address}\n\nScans:\n${JSON.stringify(scanData, null, 2)}`,
      },
    ],
  });

  const report = response.content.find((block) => block.type === "text")?.text ?? "";

  return json(200, { report, scanCount: scans.length }, headers);
};
