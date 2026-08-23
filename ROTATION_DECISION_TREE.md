# Railway MySQL Credential Rotation Decision Tree

## Incident Context
The database credential (embedded in DATABASE_URL / MYSQL_URL) was exposed in a terminal transcript. The database currently hosts the P1 schema and 900 question bank records.

## Technical Risk: The Initialization Trap
In standard MySQL Docker images (which Railway uses under the hood for its managed MySQL plugins), environment variables like MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, MYSQL_USER, and MYSQL_DATABASE are **only consumed during the initial startup** (when the /var/lib/mysql data directory is empty).

> [!WARNING]
> If you blindly click "Generate" to change MYSQLPASSWORD or MYSQL_ROOT_PASSWORD in the Railway Variables tab on an *existing* database, the environment variables will change, but the actual password stored inside the MySQL database *will remain the old password*.
> This causes a desync: ${{MySQL.MYSQL_URL}} will inject the *new* (incorrect) password into the backend, causing the backend to fail to connect with "Access denied for user".

## Decision Tree

### Path A: Railway Official Reset (Recommended if available)
If Railway provides a native, official way to reset credentials that handles both the environment variables and the internal database user:
1. Trigger the official reset via the Railway Dashboard.
2. Ensure the backend uses the dynamic reference ${{MySQL.MYSQL_URL}}.
3. Redeploy the backend.
4. Verify /health returns 200 OK.

### Path B: Zero-Downtime Manual Least-Privilege User (Verified Fallback)
If Path A is unavailable or untrusted, we manually provision a new user, switch the backend, and then revoke the compromised user.

1. **Create New Application User**
   Connect to the MySQL instance via the Railway CLI or internal query runner using the *current* (compromised) root credentials.
   ```sql
   CREATE USER 'quizarena_app'@'%' IDENTIFIED BY '<NEW_STRONG_PASSWORD>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON railway.* TO 'quizarena_app'@'%';
   FLUSH PRIVILEGES;
   ```
2. **Update Backend Variables**
   In the Railway Dashboard for the Backend service, change DATABASE_URL from the auto-reference to a manually constructed URL using the new user:
   mysql://quizarena_app:<NEW_STRONG_PASSWORD>@<RAILWAY_TCP_PROXY_HOST>:<PORT>/railway
   *(Alternatively, configure Railway custom variables if available).*
3. **Redeploy and Verify**
   Deploy the backend and run the health check:
   curl -s https://quizarena-production-3105.up.railway.app/health
   Ensure it returns {"status":"ok","database":"connected"}.
4. **Revoke Compromised Credentials**
   Only after Step 3 succeeds, return to the database and change the root/compromised user password to lock out the exposed credential:
   ```sql
   ALTER USER 'root'@'%' IDENTIFIED BY '<ANOTHER_NEW_RANDOM_PASSWORD>';
   FLUSH PRIVILEGES;
   ```
   *Update the Railway Variables tab to match this new root password so ${{MySQL.MYSQL_URL}} stays in sync for future admin use.*

### Path C: Blocked / Unsupported
If neither Path A nor Path B is feasible (e.g., lack of CLI access, lack of admin rights to CREATE USER), stop immediately. **Do not** delete the database or attempt destructive changes. Contact Railway Support to request a secure password rotation.

---

## Operator Checklist
- [ ] **Analyze**: Check the Railway MySQL Dashboard. Does a specific "Reset Credentials" button exist that guarantees internal sync?
  - Yes: Use Path A.
  - No: Use Path B.
- [ ] **Execute**: Follow the steps in the chosen path carefully.
- [ ] **Validate**:
  - GET /health must return HTTP 200 {"status":"ok","database":"connected"}
- [ ] **Finalize**: Revoke or lock out the old credentials. If /health returns 503, **STOP** and do not drop the old user. Revert the DATABASE_URL to the old credential if needed to restore service while debugging.
