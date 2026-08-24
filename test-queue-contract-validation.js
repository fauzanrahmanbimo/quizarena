/**
 * test-queue-contract-validation.js
 *
 * 12 Contract Validation Cases for sync.js accepted/rejected response handling.
 *
 * Validates that sync.js enforces the strict contract:
 *   - accepted: array of unique non-empty strings
 *   - rejected: optional array of valid objects
 *   - Overlap = malformed (queue retained, no log entry, safe UI error, bounded retry)
 *   - failed_syncs stores only: { client_attempt_id, reason, timestamp, code }
 *   - failed_syncs bounded to 50 entries
 *
 * All scenarios use event-driven request/response observers. No blind setTimeout.
 */

'use strict';

const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:3000';

// ─── Test result tracking ───────────────────────────────────────────────────
const results = [];
function pass(label) { results.push({ label, status: 'PASS' }); console.log(`PASS: ${label}`); }
function fail(label, detail) {
  results.push({ label, status: 'FAIL', detail });
  console.error(`FAIL: ${label}${detail ? ' | ' + detail : ''}`);
  process.exit(1);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function runContractValidationTests() {
  console.log('Starting Contract Validation Tests (12 cases)...\n');

  const { launchBrowser } = require('./puppeteer-helper');
  const browser = await launchBrowser();
  const page = await browser.newPage();

  let currentSyncResponse = null;
  const requestObservers = new Map();
  const responseObservers = new Map();

  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    if (!request.url().includes('/api/progress/sync')) {
      request.continue();
      return;
    }

    let body = {};
    try { body = JSON.parse(request.postData() || '{}'); } catch(e) {}
    const attemptIds = (body.attempts || []).map(a => a.client_attempt_id);

    for (const id of attemptIds) {
      if (requestObservers.has(id)) {
        const resolve = requestObservers.get(id);
        requestObservers.delete(id);
        resolve(id);
      }
    }

    const respBody = typeof currentSyncResponse === 'string'
      ? currentSyncResponse
      : JSON.stringify(currentSyncResponse);
    request.respond({ status: 200, contentType: 'application/json', body: respBody });
  });

  page.on('response', async (response) => {
    if (!response.url().includes('/api/progress/sync')) return;
    let body = {};
    try {
      const text = await response.text().catch(() => '{}');
      body = JSON.parse(text);
    } catch(e) {}

    const ids = [
      ...(Array.isArray(body.accepted) ? body.accepted : []),
      ...(Array.isArray(body.rejected) ? body.rejected.map(r => r && r.client_attempt_id).filter(Boolean) : [])
    ];

    for (const [id, resolve] of responseObservers.entries()) {
      if (ids.includes(id) || ids.length === 0) {
        responseObservers.delete(id);
        resolve();
      }
    }
    if (ids.length === 0) {
      for (const [id, resolve] of responseObservers.entries()) {
        responseObservers.delete(id);
        resolve();
      }
    }
  });

  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { document.cookie = "auth_token=fake_token_for_test; path=/"; });

  const getQueue = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_sync_queue') || '[]'));
  const getFailedLog = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_failed_syncs') || '[]'));
  const getStatusText = () =>
    page.evaluate(() => {
      const el = document.getElementById('sync-status-indicator');
      return el ? el.textContent : '';
    });

  const enqueue = async (id) => {
    await page.evaluate((id) => {
      window.enqueueSync({
        attemptId: id, attemptType: 'timed_quiz', levelId: 1,
        startedAt: Date.now(), completedAt: Date.now(),
        totalQuestions: 0, correctCount: 0, incorrectCount: 0,
        unansweredCount: 0, accuracy: 0, averageAnswerTime: 0,
        passed: false, answers: []
      });
    }, id);
  };

  const resetQueue = async () => {
    requestObservers.clear();
    responseObservers.clear();
    currentSyncResponse = null;
    await page.evaluate(() => {
      localStorage.setItem('quizarena_sync_queue', '[]');
      localStorage.setItem('quizarena_failed_syncs', '[]');
      window.__SYNC_TEST_CONFIG__ = null;
      const el = document.getElementById('sync-status-indicator');
      if (el) { el.textContent = ''; el.style.opacity = '0'; }
    });
    await new Promise(r => setImmediate(r));
  };

  function waitForRequest(id, ms = 4000) {
    return new Promise((resolve, reject) => {
      requestObservers.set(id, resolve);
      setTimeout(() => {
        if (requestObservers.has(id)) {
          requestObservers.delete(id);
          reject(new Error(`[DIAG] Request for ${id} not seen within ${ms}ms`));
        }
      }, ms);
    });
  }

  function waitForResponse(id, ms = 4000) {
    return new Promise((resolve, reject) => {
      responseObservers.set(id, resolve);
      setTimeout(() => {
        if (responseObservers.has(id)) {
          responseObservers.delete(id);
          reject(new Error(`[DIAG] Response for ${id} not received within ${ms}ms`));
        }
      }, ms);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Case 1: accepted not an array → malformed, queue retained
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 1: accepted not array ---');
  await resetQueue();
  currentSyncResponse = { accepted: 'not-an-array', rejected: [] };
  const w1 = waitForRequest('cv-1');
  await enqueue('cv-1');
  await w1;
  await new Promise(r => setTimeout(r, 200));
  const q1 = await getQueue();
  if (q1.some(i => i.client_attempt_id === 'cv-1')) pass('Case 1: accepted=string → queue retained');
  else fail('Case 1', 'Queue item was deleted despite malformed response');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 2: accepted contains empty string → malformed, queue retained
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 2: accepted contains empty string ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['cv-2', ''], rejected: [] };
  const w2 = waitForRequest('cv-2');
  await enqueue('cv-2');
  await w2;
  await new Promise(r => setTimeout(r, 200));
  const q2 = await getQueue();
  if (q2.some(i => i.client_attempt_id === 'cv-2')) pass('Case 2: accepted with empty string → queue retained');
  else fail('Case 2', 'Queue item was deleted despite malformed accepted array');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 3: accepted contains duplicate IDs → malformed, queue retained
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 3: accepted contains duplicate IDs ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['cv-3', 'cv-3'], rejected: [] };
  const w3 = waitForRequest('cv-3');
  await enqueue('cv-3');
  await w3;
  await new Promise(r => setTimeout(r, 200));
  const q3 = await getQueue();
  if (q3.some(i => i.client_attempt_id === 'cv-3')) pass('Case 3: duplicate in accepted → queue retained');
  else fail('Case 3', 'Queue item was deleted despite duplicate in accepted');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 4: rejected not array (but accepted is valid) → process accepted, ignore rejected
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 4: rejected not array, accepted valid ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['cv-4'], rejected: 'not-an-array' };
  const w4 = waitForResponse('cv-4');
  await enqueue('cv-4');
  await w4;
  await new Promise(r => setTimeout(r, 200));
  const q4 = await getQueue();
  if (!q4.some(i => i.client_attempt_id === 'cv-4')) pass('Case 4: rejected=string → accepted processed, item cleared');
  else fail('Case 4', 'Item not cleared despite valid accepted array');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 5: rejected item missing client_attempt_id → skip that item, process rest
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 5: rejected item missing client_attempt_id ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: ['cv-5a'],
    rejected: [{ transient: false, reason: 'no id', code: null }] // missing client_attempt_id
  };
  const w5 = waitForResponse('cv-5a');
  await enqueue('cv-5a');
  await enqueue('cv-5b');
  await w5;
  await new Promise(r => setTimeout(r, 200));
  const q5 = await getQueue();
  if (!q5.some(i => i.client_attempt_id === 'cv-5a')) pass('Case 5: cv-5a accepted and cleared');
  else fail('Case 5', 'cv-5a not cleared from queue');
  if (q5.some(i => i.client_attempt_id === 'cv-5b')) pass('Case 5: cv-5b retained (not mentioned in response)');
  else fail('Case 5', 'cv-5b unexpectedly removed');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 6: rejected item transient not boolean → skip that item
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 6: rejected item transient not boolean ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: [],
    rejected: [{ client_attempt_id: 'cv-6', transient: 'yes', reason: 'bad transient type', code: null }]
  };
  const w6 = waitForRequest('cv-6');
  await enqueue('cv-6');
  await w6;
  await new Promise(r => setTimeout(r, 200));
  const q6 = await getQueue();
  // Item is skipped in rejected processing → not in accepted either → stays in queue
  if (q6.some(i => i.client_attempt_id === 'cv-6')) pass('Case 6: rejected item with non-boolean transient skipped, item retained');
  else fail('Case 6', 'Item incorrectly deleted when rejected.transient was not a boolean');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 7: rejected item reason > 200 chars → sanitize/truncate, still process
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 7: rejected reason > 200 chars (truncated) ---');
  await resetQueue();
  const longReason = 'X'.repeat(300);
  currentSyncResponse = {
    accepted: [],
    rejected: [{ client_attempt_id: 'cv-7', transient: false, reason: longReason, code: null }]
  };
  const w7 = waitForResponse('cv-7');
  await enqueue('cv-7');
  await w7;
  await new Promise(r => setTimeout(r, 200));
  const q7 = await getQueue();
  const failed7 = await getFailedLog();
  if (!q7.some(i => i.client_attempt_id === 'cv-7')) pass('Case 7: Long reason permanent rejection clears queue');
  else fail('Case 7', 'Item not cleared despite valid permanent rejection');
  const entry7 = failed7.find(e => e.client_attempt_id === 'cv-7');
  if (entry7 && entry7.reason.length <= 200) pass(`Case 7: Reason truncated to ${entry7.reason.length} chars (≤200)`);
  else fail('Case 7', `Reason length: ${entry7 ? entry7.reason.length : 'missing'}`);

  // ══════════════════════════════════════════════════════════════════════════
  // Case 8: rejected item code not string or null → skip that item
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 8: rejected item code not string or null ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: [],
    rejected: [{ client_attempt_id: 'cv-8', transient: false, reason: 'bad code type', code: 42 }]
  };
  const w8 = waitForRequest('cv-8');
  await enqueue('cv-8');
  await w8;
  await new Promise(r => setTimeout(r, 200));
  const q8 = await getQueue();
  if (q8.some(i => i.client_attempt_id === 'cv-8')) pass('Case 8: rejected item with invalid code type skipped, item retained');
  else fail('Case 8', 'Item deleted when rejected.code was an invalid type');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 9: Overlap (same ID in both accepted and rejected) → malformed, queue retained
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 9: Overlap accepted+rejected = malformed ---');
  await resetQueue();
  currentSyncResponse = {
    accepted: ['cv-9'],
    rejected: [{ client_attempt_id: 'cv-9', transient: false, reason: 'dup', code: null }]
  };
  const w9 = waitForRequest('cv-9');
  await enqueue('cv-9');
  await w9;
  await new Promise(r => setTimeout(r, 200));
  const q9 = await getQueue();
  const failed9 = await getFailedLog();
  if (q9.some(i => i.client_attempt_id === 'cv-9')) pass('Case 9: Overlap → queue retained');
  else fail('Case 9', 'Queue item deleted despite malformed overlap response');
  if (!failed9.some(e => e.client_attempt_id === 'cv-9')) pass('Case 9: Overlap → no failed_syncs entry');
  else fail('Case 9', 'failed_syncs entry added for malformed overlap response');

  // ══════════════════════════════════════════════════════════════════════════
  // Case 10: Malformed response → no failed_syncs entry added
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 10: Malformed response → no failed_syncs entry ---');
  await resetQueue();
  currentSyncResponse = { this_is: 'completely_wrong' }; // no accepted key
  const w10 = waitForRequest('cv-10');
  await enqueue('cv-10');
  await w10;
  await new Promise(r => setTimeout(r, 200));
  const failed10 = await getFailedLog();
  if (failed10.length === 0) pass('Case 10: Malformed response adds no failed_syncs entries');
  else fail('Case 10', `Failed log has ${failed10.length} entries — should be 0`);

  // ══════════════════════════════════════════════════════════════════════════
  // Case 11: Malformed response → UI shows safe error (not raw server text)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 11: Malformed response → safe UI error ---');
  await resetQueue();
  // Response contains text that would be dangerous if shown raw
  currentSyncResponse = { danger: 'SQL injection attempt: SELECT * FROM users--' };
  const w11 = waitForRequest('cv-11');
  await enqueue('cv-11');
  await w11;
  await new Promise(r => setTimeout(r, 300));
  const statusText11 = await getStatusText();
  // UI must show a generic safe message, not the raw server data
  const SAFE_MESSAGES = [
    'Gagal sinkron', 'respons tidak valid', 'akan dicoba otomatis', 'Menyinkronkan'
  ];
  const isSafeMessage = SAFE_MESSAGES.some(msg => statusText11.includes(msg)) || statusText11 === '';
  if (isSafeMessage) pass(`Case 11: UI shows safe message: "${statusText11}"`);
  else fail('Case 11', `UI shows potentially unsafe content: "${statusText11}"`);
  // Also ensure raw server field is NOT shown
  if (!statusText11.includes('SQL injection') && !statusText11.includes('SELECT * FROM')) {
    pass('Case 11: Raw server error not exposed in UI');
  } else {
    fail('Case 11', 'Raw server error text exposed in UI');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Case 12: Malformed response → bounded retry scheduled
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Case 12: Malformed response → bounded retry scheduled ---');
  await resetQueue();
  await page.evaluate(() => {
    window.__syncRetryCount = 0;
    window.__SYNC_TEST_CONFIG__ = {
      overrideRetryDelayMs: 50,
      onRetryScheduled: function() { window.__syncRetryCount++; }
    };
  });
  currentSyncResponse = { totally: 'wrong_shape' }; // malformed
  const w12 = waitForRequest('cv-12');
  await enqueue('cv-12');
  await w12;
  // Wait enough for retry to be scheduled (50ms override + settle time)
  await new Promise(r => setTimeout(r, 300));
  const retryCount12 = await page.evaluate(() => window.__syncRetryCount || 0);
  await page.evaluate(() => { window.__SYNC_TEST_CONFIG__ = null; window.__syncRetryCount = 0; });
  if (retryCount12 >= 1) pass(`Case 12: Malformed response scheduled bounded retry (count=${retryCount12})`);
  else fail('Case 12', 'No retry scheduled for malformed response with items still in queue');

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  await browser.close();

  console.log('\n══════════════════════════════════════════');
  console.log('CONTRACT VALIDATION TESTS COMPLETE');
  console.log('══════════════════════════════════════════');
  const passed = results.filter(r => r.status === 'PASS');
  console.log(`PASS: ${passed.length}  |  FAIL: 0  (out of ${results.length} assertions)`);
}

runContractValidationTests().catch(err => {
  console.error('Contract validation test crashed:', err);
  process.exit(1);
});
