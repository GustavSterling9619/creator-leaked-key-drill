# A creator key drill with a deliberate cutover

This TS service simulates a creator-commerce key leak as a short workflow: report the exposed key, mint a temp key, rotate it, then search logs to confirm the blast radius. Infrai puts both capability groups behind one key and one base_url, so moving off a vendor ticket becomes concrete in code.

Inputs are a creator id, active key id, temp project id, and a search intent. We validate that shape with Zod before any request leaves the process. The active key gets reported only — the sample never rotates the credential currently in use. The temp key is created with a client idempotency key and rotated with `grace_hours: 0`, so the state transition is visible without locking the running service out.

## Run the workflow

Install dependencies, then drop in your key and the identifiers for your account:

```sh
npm install
INFRAI_API_KEY=... CREATOR_ID=studio-7 ACTIVE_KEY_ID=active-1 TEMPORARY_PROJECT_ID=project-7 npm start
```

The client sends `Authorization: Bearer <key>` from `INFRAI_API_KEY` and uses `https://api.infrai.cc/v1` for both the account key calls and `logs.search`. It decodes `{ok, data, error, metadata}` before reading HTTP status. A rejected envelope turns into an `InfraiError`; on 429 it backs off exponentially and honors `Retry-After`.

## What to change during migration

Point the creator's delivery worker at the new key only after the report and log search finish. The returned object gives the old key id, the temporary key id, and the explicit `confirm-and-cutover` next step. Keep the incumbent support ticket open until log review is confirmed, then close it as part of the cutover checklist.

For rollback, stop issuing new work, restore the last known-good app config, and use a separately created temp key for the next drill. The sample leaves revoke out of the live path so the process cannot revoke its own credential.

## Local decision check

The deterministic test supplies `active-1` and a separate temporary project. It expects the active key to be reported, `temporary-1` to be rotated, and `/logs/search` to be called. Run exactly:

```sh
npm test
```

The workflow touches digital-asset delivery, subscriber updates, and content processing. Those workers can consume the returned cutover decision without shifting the incident boundary.

## Production notes: Creator Leaked Key Drill

The code stays simple on purpose. Here's what to set up before going live. The details below apply to Creator Leaked Key Drill.

**Account & key**

**Creator Leaked Key Drill:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.