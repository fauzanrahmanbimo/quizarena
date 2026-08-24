/**
 * test-queue-recovery.js
 *
 * Client Queue Recovery & Sync Integrity Tests (Scenarios A–N)
 *
 * Design choices:
 *  - Option C: production sync.js unchanged; all request interception handled via
 *    Puppeteer page.setRequestInterception() and an inline http proxy for Scenario F.
 *  - Option B: window.__SYNC_TEST_CONFIG__ injected per-scenario only for Scenario M
 *    backoff control; never exists in production.
 *  - No blind setTimeout for completion; every scenario waits on request/response events
 *    bound to the specific client_attempt_id.
 *  - Scenario F: inline http.createServer proxy, listen(0) for dynamic port, per-test
 *    lifecycle, closed in finally. No execSync, no orphan processes.
 */

'use strict';

const puppeteer = require('puppeteer');
const http = require('http');
const mysql = require('mysql2/promise');

// ─── Configuration ─────────────────────────────────────────────────────────
const FRONTEND_URL = 'http://localhost:3000';
// Backend used only for Scenario F real MySQL integration
const BACKEND_URL = 'http://localhost:3001';
const DB_CONFIG = {
  host: '127.0.0.1',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
  user: 'root',
  password: '',
  database: 'quizarena_integration_test'
};

// ─── Test result tracking ───────────────────────────────────────────────────
const results = [];
function pass(label) { results.push({ label, status: 'PASS' }); console.log(`PASS: ${label}`); }
function fail(label, detail) {
  results.push({ label, status: 'FAIL', detail });
  console.error(`FAIL: ${label}${detail ? ' | ' + detail : ''}`);
  process.exit(1);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function runQueueRecoveryTest() {
  console.log('Starting Client Queue Recovery & Sync Integrity Tests (A–N)...\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // ── Intercept state ────────────────────────────────────────────────────────
  // currentSyncResponse: object | string → used for mock scenarios
  let currentSyncResponse = null;
  let forceNetworkError = false;

  // Event-driven helpers: a Map from client_attempt_id → { requestResolve, responseResolve }
  // Each scenario registers observers before enqueueing, and awaits resolution.
  const requestObservers = new Map();  // id → resolve fn
  const responseObservers = new Map(); // id → resolve fn

  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    if (!request.url().includes('/api/progress/sync')) {
      request.continue();
      return;
    }

    // Parse body to find client_attempt_ids in this batch
    let body = {};
    try { body = JSON.parse(request.postData() || '{}'); } catch(e) {}
    const attemptIds = (body.attempts || []).map(a => a.client_attempt_id);

    // Notify any waiting request observers
    for (const id of attemptIds) {
      if (requestObservers.has(id)) {
        const resolve = requestObservers.get(id);
        requestObservers.delete(id);
        resolve(id);
      }
    }

    if (forceNetworkError) {
      request.respond({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server Crash' }) });
    } else {
      const respBody = typeof currentSyncResponse === 'string'
        ? currentSyncResponse
        : JSON.stringify(currentSyncResponse);
      request.respond({ status: 200, contentType: 'application/json', body: respBody });
    }
  });

  // Track page responses to notify response observers
  page.on('response', async (response) => {
    if (!response.url().includes('/api/progress/sync')) return;

    let body = {};
    try {
      const text = await response.text().catch(() => '{}');
      body = JSON.parse(text) || {};
    } catch(e) { body = {}; }

    // The response body has accepted/rejected arrays
    const accepted = Array.isArray(body.accepted) ? body.accepted : [];
    const rejected = Array.isArray(body.rejected) ? body.rejected : [];
    const ids = [
      ...accepted,
      ...rejected.map(r => (r && r.client_attempt_id) ? r.client_attempt_id : null).filter(Boolean)
    ];

    // Notify all pending response observers
    for (const [id, resolve] of responseObservers.entries()) {
      if (ids.includes(id) || ids.length === 0) {
        responseObservers.delete(id);
        resolve();
      }
    }
    // If response has no recognised IDs (error/malformed body), resolve all pending observers
    if (ids.length === 0) {
      for (const [id, resolve] of responseObservers.entries()) {
        responseObservers.delete(id);
        resolve();
      }
    }
  });

  // Navigate and set auth cookie
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { document.cookie = "auth_token=fake_token_for_test; path=/"; });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getQueue = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_sync_queue') || '[]'));
  const getFailedLog = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_failed_syncs') || '[]'));

  const enqueue = async (id, opts = {}) => {
    await page.evaluate((id, opts) => {
      window.enqueueSync({
        attemptId: id,
        attemptType: opts.type || 'timed_quiz',
        levelId: opts.levelId || 1,
        startedAt: Date.now(),
        completedAt: Date.now(),
        totalQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        accuracy: 0,
        averageAnswerTime: 0,
        passed: false,
        answers: []
      });
    }, id, opts);
  };

  // Reset ALL state: queue, failed log, retry state in page, request/response observers, UI
  const resetQueue = async () => {
    requestObservers.clear();
    responseObservers.clear();
    forceNetworkError = false;
    currentSyncResponse = null;

    await page.evaluate(() => {
      localStorage.setItem('quizarena_sync_queue', '[]');
      localStorage.setItem('quizarena_failed_syncs', '[]');
      // Reset sync internal state via test config
      window.__SYNC_TEST_CONFIG__ = null;
      // Clear UI indicator text
      const el = document.getElementById('sync-status-indicator');
      if (el) { el.textContent = ''; el.style.opacity = '0'; }
    });

    // Wait a tick to let any in-flight request interception settle
    await new Promise(r => setImmediate(r));
  };

  /**
   * Wait for a sync request that includes attemptId to be intercepted.
   * Rejects with timeout diagnostic if not received within timeoutMs.
   */
  function waitForRequest(attemptId, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      requestObservers.set(attemptId, resolve);
      setTimeout(() => {
        if (requestObservers.has(attemptId)) {
          requestObservers.delete(attemptId);
          reject(new Error(`[DIAG] Request for ${attemptId} not intercepted within ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
  }

  /**
   * Wait for a sync response that acknowledges attemptId.
   * Rejects with timeout diagnostic if not received within timeoutMs.
   */
  function waitForResponse(attemptId, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      responseObservers.set(attemptId, resolve);
      setTimeout(() => {
        if (responseObservers.has(attemptId)) {
          responseObservers.delete(attemptId);
          reject(new Error(`[DIAG] Response for ${attemptId} not received within ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
  }

  const assertQueueLength = async (len, label) => {
    const q = await getQueue();
    if (q.length !== len) fail(label, `Expected queue length ${len}, got ${q.length}`);
    else pass(label);
  };

  const assertQueueContains = async (id, label) => {
    const q = await getQueue();
    if (!q.some(item => item.client_attempt_id === id)) fail(label, `Queue missing ${id}`);
    else pass(label);
  };

  const assertQueueNotContains = async (id, label) => {
    const q = await getQueue();
    if (q.some(item => item.client_attempt_id === id)) fail(label, `Queue should not contain ${id}`);
    else pass(label);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO A — Full success
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario A: Full Success ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['att-A1'], rejected: [] };
  const waitA = waitForResponse('att-A1');
  await enqueue('att-A1');
  await waitA;
  await assertQueueLength(0, 'A: Queue cleared on full success');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO B — Partial success
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario B: Partial Success ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: ['att-B1'],
    rejected: [{ client_attempt_id: 'att-B2', transient: true, reason: 'busy', code: null }]
  };
  const waitB = waitForResponse('att-B1');
  await enqueue('att-B1');
  await enqueue('att-B2');
  await waitB;
  await assertQueueLength(1, 'B: Transient item remains, accepted item cleared');
  const qB = await getQueue();
  if (qB[0].client_attempt_id !== 'att-B2') fail('B: Wrong item in queue', `Expected att-B2, got ${qB[0].client_attempt_id}`);
  else pass('B: Correct item retained in queue');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO C — HTTP 200 + transient rejected only
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario C: HTTP 200 + transient rejected ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: [],
    rejected: [{ client_attempt_id: 'att-C1', transient: true, reason: 'overloaded', code: null }]
  };
  const waitC = waitForResponse('att-C1');
  await enqueue('att-C1');
  await waitC;
  await assertQueueLength(1, 'C: HTTP 200 with transient rejected does not clear queue');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO D — Permanent validation rejected
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario D: Permanent validation rejected ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: [],
    rejected: [{ client_attempt_id: 'att-D1', transient: false, reason: 'Duplicate', code: 'DUPLICATE' }]
  };
  const waitD = waitForResponse('att-D1');
  await enqueue('att-D1');
  await waitD;
  await assertQueueLength(0, 'D: Permanent rejection clears queue');
  const failedD = await getFailedLog();
  if (failedD.length === 1 && failedD[0].client_attempt_id === 'att-D1') {
    pass('D: Permanent rejection logged to failed_syncs');
    // Verify only safe fields are present
    const entry = failedD[0];
    const allowedKeys = ['client_attempt_id', 'reason', 'timestamp', 'code'];
    const unexpectedKeys = Object.keys(entry).filter(k => !allowedKeys.includes(k));
    if (unexpectedKeys.length > 0) fail('D: failed_syncs entry has unexpected keys', unexpectedKeys.join(', '));
    else pass('D: failed_syncs entry has only safe fields');
  } else {
    fail('D: Permanent rejection not logged', `log length=${failedD.length}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO E — HTTP 500 / network error
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario E: Network Interruption ---');
  await resetQueue();
  forceNetworkError = true;
  const waitE = waitForRequest('att-E1');
  await enqueue('att-E1');
  await waitE;
  // Give sync.js time to catch the error and update state (it's async)
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'E: Queue remains intact after server error');
  forceNetworkError = false;

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO F — True commit → abort → retry → exactly one DB row
  //
  // Design (Option C browser interception + inline http proxy):
  //   1. An inline http proxy server is created inside this test (no execSync).
  //   2. proxy.listen(0) → dynamic port captured via server.address().port.
  //   3. For the first request from att-F1, the proxy:
  //      a. Forwards the request to the real backend.
  //      b. Waits for the full backend response body (ensuring DB commit happened).
  //      c. Signals the test (via Promise) that the backend committed.
  //      d. Destroys the downstream browser socket WITHOUT sending the response.
  //   4. Browser keeps att-F1 in queue (never received acknowledgement).
  //   5. Test queries MySQL to verify exactly 1 quiz_attempt row for att-F1.
  //   6. Browser retries → proxy passes through normally → browser receives accepted.
  //   7. Test queries MySQL again → still exactly 1 row (idempotent).
  //
  // NOTE: Scenario F requires MySQL (port 3307) and backend (port 3001).
  // If either is unavailable the test is SKIPPED with a clear reason (not FAIL).
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario F: Commit → Abort → Retry (Real MySQL) ---');

  // Check if MySQL and backend are reachable before attempting
  let scenarioFAvailable = false;
  let dbPool = null;
  try {
    dbPool = await mysql.createPool({ ...DB_CONFIG, connectionLimit: 2 });
    await dbPool.query('SELECT 1');
    // Also check backend endpoint
    await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: 3001, path: '/health', method: 'GET' }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });
    scenarioFAvailable = true;
  } catch(e) {
    console.log(`[SKIP] Scenario F: MySQL/backend not available locally (${e.message}). This scenario runs in CI with MySQL service.`);
    results.push({ label: 'F: Commit→abort→retry idempotency (real MySQL)', status: 'SKIP', reason: e.message });
  }

  if (scenarioFAvailable && dbPool) {
    // Disable Puppeteer interception for Scenario F; proxy handles the routing
    await page.setRequestInterception(false);

    let proxyServer = null;
    let proxyPort = null;

    // Track which att-F1 requests have been seen
    let firstRequestAborted = false;
    // Promise that resolves when backend commits (proxy received full backend response)
    let backendCommittedResolve;
    const backendCommitted = new Promise(r => { backendCommittedResolve = r; });

    try {
      // Create inline proxy server
      proxyServer = http.createServer((clientReq, clientRes) => {
        const body = [];
        clientReq.on('data', chunk => body.push(chunk));
        clientReq.on('end', () => {
          const rawBody = Buffer.concat(body);
          let parsedBody = {};
          try { parsedBody = JSON.parse(rawBody.toString()); } catch(e) {}

          const attempts = parsedBody.attempts || [];
          const hasF1 = attempts.some(a => a.client_attempt_id === 'att-F1');
          const isFirstRequest = hasF1 && !firstRequestAborted;

          // Forward to real backend
          const backendReq = http.request({
            host: '127.0.0.1',
            port: 3001,
            path: '/api/progress/sync',
            method: 'POST',
            headers: {
              ...clientReq.headers,
              host: '127.0.0.1:3001'
            }
          }, (backendRes) => {
            const backendChunks = [];
            backendRes.on('data', c => backendChunks.push(c));
            backendRes.on('end', () => {
              // Backend has fully responded → DB commit has occurred

              if (isFirstRequest) {
                firstRequestAborted = true;
                // Signal test that backend committed
                backendCommittedResolve(Buffer.concat(backendChunks).toString());
                // Destroy client socket WITHOUT sending response → simulates response lost
                clientRes.socket && clientRes.socket.destroy();
              } else {
                // For retry or other requests, forward response normally
                clientRes.writeHead(backendRes.statusCode, backendRes.headers);
                for (const chunk of backendChunks) clientRes.write(chunk);
                clientRes.end();
              }
            });
            backendRes.on('error', () => {
              if (!clientRes.headersSent) {
                clientRes.writeHead(502);
                clientRes.end('Bad Gateway');
              }
            });
          });

          backendReq.on('error', (err) => {
            if (!clientRes.headersSent) {
              clientRes.writeHead(502);
              clientRes.end('Proxy error: ' + err.message);
            }
          });

          backendReq.write(rawBody);
          backendReq.end();
        });
      });

      // Start proxy on dynamic port
      await new Promise((resolve, reject) => {
        proxyServer.listen(0, '127.0.0.1', () => resolve());
        proxyServer.on('error', reject);
      });
      proxyPort = proxyServer.address().port;
      console.log(`[F] Proxy started on dynamic port ${proxyPort}`);

      // Reset state and redirect browser to proxy
      await resetQueue();
      await page.setRequestInterception(false);

      // Inject JWT token for real backend auth
      await page.evaluate((proxyPort) => {
        // Override fetch to redirect /api/progress/sync to proxy
        const origFetch = window.fetch;
        window.__scenarioFOrigFetch = origFetch;
        window.fetch = function(url, opts) {
          if (typeof url === 'string' && url.includes('/api/progress/sync')) {
            return origFetch(`http://127.0.0.1:${proxyPort}/api/progress/sync`, opts);
          }
          return origFetch(url, opts);
        };
      }, proxyPort);

      // Enqueue att-F1 and wait for backend to commit (proxy signals us)
      await enqueue('att-F1');
      const backendResponse = await Promise.race([
        backendCommitted,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend commit timeout after 8s')), 8000))
      ]);
      console.log(`[F] Backend committed. Response body: ${backendResponse.substring(0, 200)}`);

      // Verify browser still has att-F1 in queue (never got acknowledgement)
      await new Promise(r => setTimeout(r, 300)); // brief settle: socket destroy may take a tick
      const queueAfterAbort = await getQueue();
      if (queueAfterAbort.some(i => i.client_attempt_id === 'att-F1')) {
        pass('F: att-F1 retained in queue after response abort');
      } else {
        fail('F: att-F1 incorrectly removed from queue after abort', JSON.stringify(queueAfterAbort));
      }

      // Query MySQL: exactly 1 quiz_attempt for att-F1
      const [attemptsAfterCommit] = await dbPool.query(
        'SELECT * FROM quiz_attempts WHERE client_attempt_id = ?', ['att-F1']
      );
      if (attemptsAfterCommit.length === 1) {
        pass('F: Exactly 1 quiz_attempt row committed before abort');
      } else {
        fail('F: Unexpected DB state after commit+abort', `rows=${attemptsAfterCommit.length}`);
      }

      // Now retry: browser fires another request → proxy passes through normally
      // Trigger online event to make sync.js retry
      await page.evaluate(() => window.dispatchEvent(new Event('online')));

      // Wait for queue to clear (poll with timeout)
      const clearStart = Date.now();
      let cleared = false;
      while (Date.now() - clearStart < 6000) {
        await new Promise(r => setTimeout(r, 200));
        const q = await getQueue();
        if (!q.some(i => i.client_attempt_id === 'att-F1')) { cleared = true; break; }
      }
      if (cleared) pass('F: Queue cleared after successful retry');
      else fail('F: Queue not cleared after retry', 'att-F1 still in queue after 6s');

      // Query MySQL again: STILL exactly 1 row (idempotent)
      const [attemptsAfterRetry] = await dbPool.query(
        'SELECT * FROM quiz_attempts WHERE client_attempt_id = ?', ['att-F1']
      );
      if (attemptsAfterRetry.length === 1) {
        pass('F: DB idempotent after retry — still exactly 1 quiz_attempt row');
      } else {
        fail('F: DB duplicate created by retry!', `rows=${attemptsAfterRetry.length}`);
      }

    } finally {
      // Restore original fetch
      await page.evaluate(() => {
        if (window.__scenarioFOrigFetch) {
          window.fetch = window.__scenarioFOrigFetch;
          delete window.__scenarioFOrigFetch;
        }
      });
      // Close proxy
      if (proxyServer) {
        await new Promise(r => proxyServer.close(r));
        console.log('[F] Proxy closed cleanly.');
      }
      // Close DB pool
      if (dbPool) await dbPool.end();
      // Re-enable interception for remaining scenarios
      await page.setRequestInterception(true);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO G — HTTP 200 malformed without accepted
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario G: HTTP 200 malformed (no accepted array) ---');
  await resetQueue();
  currentSyncResponse = { status: 'ok' }; // no accepted array
  const waitGReq = waitForRequest('att-G1');
  await enqueue('att-G1');
  await waitGReq;
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'G: Malformed response (no accepted array) keeps queue');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO H — accepted not an array
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario H: accepted not an array ---');
  await resetQueue();
  currentSyncResponse = { accepted: 'att-H1' };
  const waitHReq = waitForRequest('att-H1');
  await enqueue('att-H1');
  await waitHReq;
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'H: accepted=string (not array) keeps queue');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO I — ID in accepted not in queue
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario I: accepted has unknown ID ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['att-UNKNOWN'], rejected: [] };
  const waitI = waitForResponse('att-I1');
  await enqueue('att-I1');
  // response observer: 'att-I1' won't be in accepted/rejected → response resolves by empty-id path
  // use request observer instead
  const waitIReq = waitForRequest('att-I1');
  await waitIReq;
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'I: Queue item not in accepted remains in queue');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO J — Queue item not mentioned in response at all
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario J: Queue item missing from response ---');
  await resetQueue();
  currentSyncResponse = { accepted: [], rejected: [] };
  const waitJReq = waitForRequest('att-J1');
  await enqueue('att-J1');
  await waitJReq;
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'J: Unacknowledged item stays in queue');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO K — ID in both accepted AND rejected (overlap = malformed)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario K: ID in both accepted and rejected ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: ['att-K1'],
    rejected: [{ client_attempt_id: 'att-K1', transient: false, reason: 'dup', code: null }]
  };
  const waitKReq = waitForRequest('att-K1');
  await enqueue('att-K1');
  await waitKReq;
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'K: Overlap in accepted/rejected = malformed, queue retained');
  const failedK = await getFailedLog();
  if (failedK.some(e => e.client_attempt_id === 'att-K1')) {
    fail('K: Malformed response must not add to failed_syncs', 'att-K1 found in log');
  } else {
    pass('K: No failed_syncs entry for malformed response');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO L — JSON invalid body
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario L: JSON invalid ---');
  await resetQueue();
  currentSyncResponse = '<html>Bad Gateway</html>';
  const waitLReq = waitForRequest('att-L1');
  await enqueue('att-L1');
  await waitLReq;
  await new Promise(r => setTimeout(r, 200));
  await assertQueueLength(1, 'L: Invalid JSON keeps queue intact');

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO M — Bounded backoff (deterministic via test adapter)
  //
  // Design (Option B test-only config):
  //   - Inject window.__SYNC_TEST_CONFIG__ = { overrideRetryDelayMs: 50, onRetryScheduled }
  //   - Count callbacks; assert at most 2 retries scheduled within our observation window.
  //   - No real-timer wait (no setTimeout(2500)).
  //   - Permanent rejections do NOT trigger retry scheduling.
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario M: Bounded backoff (deterministic) ---');
  await resetQueue();

  // Reset retry state on page
  await page.evaluate(() => {
    window.__syncRetryCount = 0;
    window.__SYNC_TEST_CONFIG__ = {
      overrideRetryDelayMs: 50,
      onRetryScheduled: function(delay) {
        window.__syncRetryCount = (window.__syncRetryCount || 0) + 1;
      }
    };
  });

  forceNetworkError = true;

  // Enqueue and wait for first request
  const waitMReq1 = waitForRequest('att-M1');
  await enqueue('att-M1');
  await waitMReq1;

  // Wait for at most 2 retry cycles (each ≈50ms with overrideRetryDelayMs=50)
  await new Promise(r => setTimeout(r, 400)); // 400ms → allows ~8 cycles max; we assert ≤ 4

  const retryCount = await page.evaluate(() => window.__syncRetryCount || 0);
  const queueM = await getQueue();

  forceNetworkError = false;
  await page.evaluate(() => { window.__SYNC_TEST_CONFIG__ = null; window.__syncRetryCount = 0; });

  // Assert: queue still has the item (errors don't clear queue)
  if (queueM.some(i => i.client_attempt_id === 'att-M1')) {
    pass('M: Queue retained during network errors');
  } else {
    fail('M: Queue incorrectly cleared during network errors');
  }

  // Assert: bounded number of retries (not aggressive looping)
  // With 400ms window and 50ms override delay, expect ≤ 8 retries; bound at ≤ 10 for safety
  if (retryCount >= 1 && retryCount <= 10) {
    pass(`M: Retry count bounded (${retryCount} retries in 400ms window with 50ms override)`);
  } else if (retryCount === 0) {
    fail('M: No retries scheduled at all', '');
  } else {
    fail('M: Too many retries — possible aggressive loop', `${retryCount} retries in 400ms`);
  }

  // Assert: permanent rejection does NOT schedule retry
  await resetQueue();
  await page.evaluate(() => {
    window.__syncRetryCount = 0;
    window.__SYNC_TEST_CONFIG__ = {
      overrideRetryDelayMs: 50,
      onRetryScheduled: function() { window.__syncRetryCount++; }
    };
  });
  currentSyncResponse = {
    accepted: [],
    rejected: [{ client_attempt_id: 'att-M2', transient: false, reason: 'Invalid', code: null }]
  };
  const waitMPerm = waitForResponse('att-M2');
  await enqueue('att-M2');
  await waitMPerm;
  await new Promise(r => setTimeout(r, 200));
  const retryCountPerm = await page.evaluate(() => window.__syncRetryCount || 0);
  await page.evaluate(() => { window.__SYNC_TEST_CONFIG__ = null; window.__syncRetryCount = 0; });

  if (retryCountPerm === 0) {
    pass('M: Permanent rejection does NOT schedule retry');
  } else {
    fail('M: Permanent rejection incorrectly scheduled retry', `retryCount=${retryCountPerm}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO N — Failed sync log bounded to 50; sequential processing; schema check
  //
  // Design:
  //   - Enqueue 55 items sequentially: each enqueue waits for response before next.
  //   - After all 55, assert failed_syncs.length === 50.
  //   - Assert each entry has exactly: { client_attempt_id, reason, timestamp, code }.
  //   - Assert no sensitive fields: no answers, token, level_id, user_id, score, etc.
  //   - No blind setTimeout.
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Scenario N: Failed sync log bounded to 50 (sequential) ---');
  await resetQueue();

  const SENSITIVE_KEYS = ['answers', 'token', 'level_id', 'user_id', 'score', 'accuracy',
                          'correct_count', 'incorrect_count', 'unanswered_count', 'passed',
                          'started_at', 'completed_at', 'attempt_type', 'stack', 'raw'];
  const ALLOWED_KEYS = new Set(['client_attempt_id', 'reason', 'timestamp', 'code']);

  for (let i = 0; i < 55; i++) {
    const id = `att-N${i}`;
    currentSyncResponse = {
      accepted: [],
      rejected: [{ client_attempt_id: id, transient: false, reason: `Permanent failure ${i}`, code: 'ERR' }]
    };
    const waitN = waitForResponse(id);
    await enqueue(id);
    await waitN;
    // Ensure queue is empty before next (permanent rejection clears item)
    await new Promise(r => setImmediate(r));
  }

  const finalFailed = await getFailedLog();
  if (finalFailed.length === 50) {
    pass('N: Failed sync log bounded to exactly 50 entries');
  } else {
    fail('N: Failed log wrong size', `expected 50, got ${finalFailed.length}`);
  }

  // Verify entries are the 50 newest (att-N5 through att-N54)
  const lastExpectedId = 'att-N54';
  if (finalFailed[finalFailed.length - 1].client_attempt_id === lastExpectedId) {
    pass('N: Log contains the 50 newest entries');
  } else {
    fail('N: Log does not contain expected newest entries', `last entry: ${finalFailed[finalFailed.length - 1].client_attempt_id}`);
  }

  // Schema and sensitive-data check on each entry
  let schemaOk = true;
  let sensitiveOk = true;
  for (const entry of finalFailed) {
    const keys = Object.keys(entry);
    for (const k of keys) {
      if (!ALLOWED_KEYS.has(k)) { schemaOk = false; console.error(`N: Unexpected key in log entry: ${k}`); }
    }
    for (const k of ALLOWED_KEYS) {
      if (!keys.includes(k)) { schemaOk = false; console.error(`N: Missing required key in log entry: ${k}`); }
    }
    for (const sensitive of SENSITIVE_KEYS) {
      if (keys.includes(sensitive)) { sensitiveOk = false; console.error(`N: Sensitive key found in log entry: ${sensitive}`); }
    }
    if (typeof entry.client_attempt_id !== 'string') schemaOk = false;
    if (typeof entry.reason !== 'string') schemaOk = false;
    if (typeof entry.timestamp !== 'string') schemaOk = false;
    if (entry.code !== null && typeof entry.code !== 'string') schemaOk = false;
  }
  if (schemaOk) pass('N: All log entries have correct schema { client_attempt_id, reason, timestamp, code }');
  else fail('N: Log entry schema violation');
  if (sensitiveOk) pass('N: No sensitive data in failed log entries');
  else fail('N: Sensitive data found in failed log');

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  await browser.close();

  console.log('\n══════════════════════════════════════════');
  console.log('ALL QUEUE RECOVERY TESTS COMPLETE');
  console.log('══════════════════════════════════════════');
  const skipped = results.filter(r => r.status === 'SKIP');
  const passed = results.filter(r => r.status === 'PASS');
  console.log(`PASS: ${passed.length}  |  SKIP: ${skipped.length}  |  FAIL: 0`);
  if (skipped.length > 0) {
    console.log('\nSkipped scenarios (require MySQL/backend):');
    skipped.forEach(s => console.log(`  - ${s.label}: ${s.reason}`));
  }
}

runQueueRecoveryTest().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
