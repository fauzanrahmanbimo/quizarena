# Security Incident: Database Credential Rotation

## Incident Details
- **Incident Type:** Exposed database connection secret in terminal/transcript.
- **Impact:** MySQL database credentials (DATABASE_URL, password) were printed to an AI transcript and terminal, and must be treated as **COMPROMISED**.
- **Containment:** TCP Proxy deleted immediately after migration completion. The database is no longer accessible from the public internet.

## Required Remediation
1. Rotate `MYSQL_ROOT_PASSWORD` and/or `MYSQL_PASSWORD` in the Railway MySQL service.
2. Verify that the backend app's `DATABASE_URL` is using a dynamic reference (e.g. `${{MySQL.MYSQL_URL}}`) so it updates automatically.
3. Redeploy the backend service.
4. Verify health via `GET /health` to ensure the new connection is established.

## Prevention
- **Never print the full `DATABASE_URL`** to the terminal.
- Redact command logs in AI transcripts.
- Always use Railway Variable References instead of hardcoded strings in production environments.
