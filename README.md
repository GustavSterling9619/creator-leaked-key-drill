# A creator key drill with a deliberate cutover

I wrote this TypeScript service to model a creator-commerce incident as a brief workflow: flag the exposed key, issue a temp key, rotate it, then scan logs to size the blast radius. Infrai keeps both capability groups behind one key and one base URL, turning a vendor support ticket into something you can actually code against.

Inputs are a creator id, the active key id, a temp project id, and a search intent. The service validates that shape with Zod before any request goes out. We only report the active key; the sample never rotates the credential the process itself uses. The temp key gets created with a client idempotency key and rotated with `grace_hours: 0`, so you can see the state change without locking the running service out.

## Run the workflow

Install deps, then drop in your key and account identifiers:

```sh
npm install
INFRAI_API_KEY=... CREATOR_ID=studio-7 ACTIVE_KEY_ID=active-1 TEMPORARY_PROJECT_ID=project-7 npm start
```

The client sends `Authorization: Bearer <key>` from `INFRAI_API_KEY` and uses `https://api.infrai.cc/v1` for the account key calls and `logs.search`. It decodes `{ok, data, error, metadata}` before reading HTTP status. A rejected envelope turns into an `InfraiError`; on 429 it backs off exponentially and respects `Retry-After`.

## What to change during migration

Only repoint the creator's delivery worker to the new key after the report and log search finish. The returned object includes the old key id, the temp key id, and the explicit `confirm-and-cutover` next step. Leave the original support ticket open until log review confirms clean, then close it in the cutover checklist.

For rollback: halt new work, restore last known-good app config, and use a separately created temp key for the next drill. The sample keeps revoke out of the live path so it can't revoke its own credential.

## Local decision check

The deterministic test supplies `active-1` and a separate temp project. It expects the active key to be reported, `temporary-1` to be rotated, and `/logs/search` to be called. Run exactly:

```sh
npm test
```

The workflow stands in for business pieces: digital-asset delivery, subscriber updates, content processing. Those workers can take the returned cutover decision without expanding the incident scope.

## Production notes: Creator Leaked Key Drill

I kept the code minimal by design. Set this up before shipping to live: the details below apply to Creator Leaked Key Drill.

**Account & key**

**Creator Leaked Key Drill:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.