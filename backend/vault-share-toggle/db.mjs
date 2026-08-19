import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);

export const TABLES = {
  users: process.env.USERS_TABLE,
  loginTokens: process.env.LOGIN_TOKENS_TABLE,
  properties: process.env.PROPERTIES_TABLE,
  scans: process.env.SCANS_TABLE,
  transferTokens: process.env.TRANSFER_TOKENS_TABLE,
  events: process.env.EVENTS_TABLE,
};
