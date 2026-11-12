import { DrillRequest, InfraiClient } from "./infrai_client.ts";
import type { InfraiRequestClient } from "./infrai_client.ts";

export type DrillResult = { creatorId: string; reportedKeyId: string; rotatedTemporaryKeyId: string; logSearch: "completed"; nextStep: "confirm-and-cutover" };

export async function runCreatorKeyDrill(input: unknown, client: InfraiRequestClient = new InfraiClient()): Promise<DrillResult> {
  const request = DrillRequest.parse(input);
  await client.request(`/account/keys/suspected_compromise/${request.activeKeyId}`, "POST", { confirmed_leak: true, auto_rotate: false });
  const temporary = await client.request<{ id: string }>("/account/keys/create", "POST", {
    project_id: request.temporaryProjectId, name: `drill-${request.creatorId}`, scopes: ["logs.read"], idempotency_key: `drill-${request.creatorId}`
  });
  await client.request(`/account/keys/rotate/${temporary.id}`, "POST", { grace_hours: 0, idempotency_key: `rotate-${temporary.id}` });
  await client.request("/logs/search", "GET", { q: request.searchIntent });
  return { creatorId: request.creatorId, reportedKeyId: request.activeKeyId, rotatedTemporaryKeyId: temporary.id, logSearch: "completed", nextStep: "confirm-and-cutover" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { creatorId: process.env.CREATOR_ID, activeKeyId: process.env.ACTIVE_KEY_ID, temporaryProjectId: process.env.TEMPORARY_PROJECT_ID, searchIntent: "creator leaked api key response" };
  runCreatorKeyDrill(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
