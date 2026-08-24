# Cloud Progress Sync - Rollout Runbook

## 1. Prerequisites
- Parity Check must be PASS (`node scripts/verify-question-bank-parity.js`).
- Database must be logically backed up before any toggle.
- Frontend must be updated to handle `501 Not Implemented` gracefully if the feature is rolled back.

## 2. Enable Procedure
1. Request explicit approval from Operator/Product Owner.
2. In Railway Dashboard, or via CLI, run:
   ```bash
   railway variables set ENABLE_SYNC=true
   ```
3. Wait for the new deployment to become active (`railway status` -> Online).
4. Verify `/health` returns `200 OK`.

## 3. Smoke Test (Post-Enable)
1. Run a smoke test using a temporary isolated user (`sync-smoke-...@test.com`).
2. Post a valid `client_attempt_id` payload to `/api/progress/sync`.
3. Expect `200 OK` and `{ "status": "ok", "accepted": ["..."] }`.
4. Re-post the identical payload to test idempotency (should still be accepted but without duplicate SQL insertion).
5. Clean up the test user immediately after testing.

## 4. Rollback (Disable Procedure)
If an incident, latency spike, or data inconsistency occurs:
1. Immediately run:
   ```bash
   railway variables set ENABLE_SYNC=false
   ```
2. Wait for redeployment.
3. Users will automatically fall back to the offline-first IndexedDB queue and gracefully handle the `501` response.
4. DO NOT manually delete or modify production MySQL data without a strict incident response plan and backups.

## 5. Alert & Error Signals
- **429 Too Many Requests:** Expected if a user triggers the sync limiter (>10 syncs/min).
- **500 Internal Server Error:** Indicates a database failure or unhandled exception. The error payload is sanitized. Check Railway Logs (`action: cloud_sync`) for the `reqId` to correlate without PII exposure.
- **413 Payload Too Large:** If an offline queue exceeded `MAX_ATTEMPTS` (currently 25).

## 6. Privacy & Security Notes
- `user_id` in logs is HMAC-SHA-256 hashed using `SYNC_LOG_HASH_SECRET`.
- Plaintext emails, passwords, JWT tokens, and CSRF tokens must NEVER be logged.
- The `req.user.id` from the decoded JWT is strictly authoritative. Any `user_id` embedded in the client payload is ignored.
