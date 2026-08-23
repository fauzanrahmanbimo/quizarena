# Railway MySQL Credential Rotation Decision Tree

## Incident Context
The database credential (embedded in DATABASE_URL / MYSQL_URL) was exposed in a terminal transcript. The database currently hosts the P1 schema and 900 question bank records.

## Technical Risk: The Initialization Trap
In standard MySQL Docker images (which Railway uses under the hood for its managed MySQL plugins), environment variables like MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, MYSQL_USER, and MYSQL_DATABASE are **only consumed during the initial startup**. Changing variables in the dashboard blindly does not change internal passwords.

## Decision Tree

**Mechanism Status**: Railway official reset: unknown; private app-user rotation: pending operator approval.

### Path A: Railway Official Reset
If Railway provides a native, official way to reset credentials that automatically synchronizes internal database users and environment variables, use it. Verify that the backend connects over the private network.

### Path B: Zero-Downtime Private Manual Rotation (Pending Operator Approval)
If Path A is unavailable, we must provision a least-privilege user via internal MySQL commands and configure the backend to use the private network. **No Public TCP Proxy may be used.**

#### Step 1: SQL Plan for Operator Execution (Do Not Run Automatically)
The operator must securely run the following SQL via an internal query runner or a temporary secure private-network jumpbox. **Never use a Public TCP Proxy.**
*The database name might differ from `railway`. Verify before granting.*
```sql
CREATE USER 'quizarena_app'@'%' IDENTIFIED BY '<SECRET_PASSWORD_FROM_VAULT>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `<ACTUAL_DATABASE_NAME>`.* TO 'quizarena_app'@'%';
FLUSH PRIVILEGES;
```

#### Step 2: Configure Private Variable Composition
Railway supports dynamic environment variable composition. The operator must create private secrets on the Backend service:
- `APP_DB_USER` (set to `quizarena_app`)
- `APP_DB_PASSWORD` (set to the secure password)

Then, update `DATABASE_URL` on the Backend service to use private composition instead of the default reference, avoiding public endpoints:
`mysql://${{APP_DB_USER}}:${{APP_DB_PASSWORD}}@${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQL_DATABASE}}`

#### Step 3: Deployment and Verification
- Deploy the Backend service.
- Wait for it to become ready.
- Verify private connectivity: `curl -s https://quizarena-production-3105.up.railway.app/health`
- **Success Criteria**: HTTP 200 with `{"status":"ok","database":"connected"}`

#### Step 4: Revocation (Safe Point)
- **If Step 3 succeeds**: Securely connect back to MySQL and alter the compromised account password (`ALTER USER 'root'@'%' IDENTIFIED BY ...`), locking it out. Then update the Database service variables to match this new admin password to avoid desyncs.
- **If Step 3 fails (503)**: DO NOT revoke the old account. Roll back the `DATABASE_URL` to `${{MySQL.MYSQL_URL}}` to restore application uptime, and investigate the error.

### Path C: Blocked / Unsupported
If variable composition is not supported or internal SQL execution is not possible without a public TCP proxy, stop immediately. Contact Railway Support to request a secure password rotation.

---

## Operator Checklist
- [ ] **Analyze**: Verify if Path A exists. If not, proceed to Path B.
- [ ] **Review SQL Plan**: Approve the exact SQL statements and verify the database name.
- [ ] **Execute SQL**: Run the `CREATE USER` and `GRANT` statements securely.
- [ ] **Set Variables**: Define `APP_DB_USER`, `APP_DB_PASSWORD`, and compose the private `DATABASE_URL`.
- [ ] **Deploy & Validate**: Ensure `/health` returns 200.
- [ ] **Finalize**: Only lock out the compromised root credential AFTER the app connects successfully.

