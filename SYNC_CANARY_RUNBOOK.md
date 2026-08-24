# Cloud Progress Sync Canary Runbook

## Overview
This runbook defines the safe procedure for enabling, monitoring, and rolling back the `/api/progress/sync` feature on Production.

## Pre-requisites
- Database parity is VERIFIED (Completed).
- Application `main` branch is up to date and deployed.

## 1. Canary Activation
To enable the Cloud Progress Sync for live users:
1. Open the Railway Dashboard.
2. Select the `quizarena` service.
3. Go to the **Variables** tab.
4. Set the environment variable: `ENABLE_SYNC = true`
5. Railway will automatically redeploy the service.

## 2. Observability & Safe Logging
Monitor the deployment using Railway logs. The system is designed to log safely without exposing PII or credentials.

**Safe Metrics to Monitor:**
- `requestId`: For tracing batch requests.
- `result`: Number of `accepted` vs `rejected` payloads.
- `userId hash`: Anonymous hash to track distinct active syncers.
- `event count`: Number of `attempts` processed per payload.
- `duration`: Execution time of the sync transaction.
- `error category`: Standardized error codes (e.g., `Schema Validation`, `DB Transaction Failed`).

**Strict Anti-Leak Rules:**
- NEVER log the plaintext `auth_token` or `JWT`.
- NEVER log the plaintext `user_id` or `email` associated with a payload.
- NEVER log `DATABASE_URL` or SQL stack traces.
- DO NOT log the raw `req.body` blindly (prevents dumping PII into logs).

## 3. Rollback Plan
If any anomaly, high error rate, or security incident is detected:
1. Open the Railway Dashboard.
2. Select the `quizarena` service.
3. Go to the **Variables** tab.
4. Delete the `ENABLE_SYNC` variable or set it to `false`.
5. Railway will automatically redeploy the service.
6. The endpoint will instantly revert to returning `501 Not Implemented`, and clients will safely fall back to keeping data in their offline local storage queue. No data will be lost on the client.

## 4. Admin Observability
For internal observability, consider querying the `quiz_attempts` table directly via Read Replica or secure SSH Tunnel for aggregate metrics (e.g., total syncs in the last hour). Never expose an unauthenticated dashboard.
