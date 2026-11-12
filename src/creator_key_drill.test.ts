import test from "node:test";
import assert from "node:assert/strict";
import { runCreatorKeyDrill } from "./creator_key_drill.ts";

test("the drill reports the active key, rotates only the temporary key, and searches logs", async () => {
  const calls: Array<[string, string, unknown]> = [];
  const client = { request: async <T>(path: string, method: string, body?: unknown) => {
    calls.push([path, method, body]);
    return (path === "/account/keys/create" ? { id: "temporary-1" } : {}) as T;
  } };
  const result = await runCreatorKeyDrill({ creatorId: "studio-7", activeKeyId: "active-1", temporaryProjectId: "project-7", searchIntent: "leaked api key response typescript" }, client);
  assert.deepEqual(result, { creatorId: "studio-7", reportedKeyId: "active-1", rotatedTemporaryKeyId: "temporary-1", logSearch: "completed", nextStep: "confirm-and-cutover" });
  assert.equal(calls[0][0], "/account/keys/suspected_compromise/active-1");
  assert.equal(calls[2][0], "/account/keys/rotate/temporary-1");
  assert.equal(calls[3][0], "/logs/search");
});
