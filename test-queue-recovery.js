const puppeteer = require('puppeteer');

async function runQueueRecoveryTest() {
  console.log('Starting Client Queue Recovery & Sync Integrity Tests...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  
  let currentSyncResponse = null;
  let forceNetworkError = false;
  let interceptedRequests = 0;
  
  page.on('request', request => {
    if (request.url().includes('/api/progress/sync')) {
      interceptedRequests++;
      if (forceNetworkError) {
        request.respond({ status: 500, body: 'Server Crash' });
      } else {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: typeof currentSyncResponse === 'string' ? currentSyncResponse : JSON.stringify(currentSyncResponse)
        });
      }
    } else {
      request.continue();
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.evaluate(() => { document.cookie = "auth_token=fake_token_for_test; path=/"; });

  const getQueue = async () => page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_sync_queue') || '[]'));
  const getFailedLog = async () => page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_failed_syncs') || '[]'));
  
  const enqueue = async (id) => {
    await page.evaluate((id) => {
      window.enqueueSync({ attemptId: id, attemptType: 'timed_quiz', levelId: 1, startedAt: Date.now(), completedAt: Date.now(), answers: [] });
    }, id);
  };
  
  const resetQueue = async () => {
    await page.evaluate(() => { localStorage.setItem('quizarena_sync_queue', '[]'); localStorage.setItem('quizarena_failed_syncs', '[]'); });
    interceptedRequests = 0;
  };

  const waitForSyncToFinish = async () => {
    await page.waitForFunction(() => {
      const el = document.getElementById('sync-status-indicator');
      return el && (el.textContent === 'Tersinkron' || el.textContent.includes('Gagal') || el.textContent.includes('tertunda') || el.textContent.includes('ditolak'));
    }, { timeout: 3000 }).catch(() => {});
  };

  const assertQueueLength = async (len, msg) => {
    const q = await getQueue();
    if (q.length !== len) { console.error(`FAIL: ${msg} | Expected ${len}, got ${q.length} | Queue:`, q); process.exit(1); }
    console.log(`PASS: ${msg}`);
  };

  // A. Full success
  console.log('\n--- Scenario A: Full Success ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['att-A1'], rejected: [] };
  await enqueue('att-A1');
  await waitForSyncToFinish();
  await assertQueueLength(0, 'Queue cleared on full success.');

  // B. Partial success
  console.log('\n--- Scenario B: Partial Success ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['att-B1'], rejected: [{ client_attempt_id: 'att-B2', transient: true }] };
  await enqueue('att-B1');
  await enqueue('att-B2');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Transient error item remains in queue while successful item is cleared.');
  let q = await getQueue();
  if (q[0].client_attempt_id !== 'att-B2') { console.error('Wrong item in queue'); process.exit(1); }

  // C. HTTP 200 + transient rejected
  console.log('\n--- Scenario C: HTTP 200 + transient rejected ---');
  await resetQueue();
  currentSyncResponse = { accepted: [], rejected: [{ client_attempt_id: 'att-C1', transient: true }] };
  await enqueue('att-C1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'HTTP 200 with transient rejected does not clear queue.');

  // D. Permanent validation rejected
  console.log('\n--- Scenario D: Permanent validation rejected ---');
  await resetQueue();
  currentSyncResponse = { accepted: [], rejected: [{ client_attempt_id: 'att-D1', transient: false, reason: 'Duplicate' }] };
  await enqueue('att-D1');
  await waitForSyncToFinish();
  await assertQueueLength(0, 'Permanent validation error clears queue.');
  const failed = await getFailedLog();
  if (failed.length === 1 && failed[0].client_attempt_id === 'att-D1') console.log('PASS: Logged to failed_syncs.');
  else { console.error('FAIL: Not logged to failed_syncs'); process.exit(1); }

  // E. HTTP 500/network failure
  console.log('\n--- Scenario E: Network Interruption ---');
  await resetQueue();
  forceNetworkError = true;
  await enqueue('att-E1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Queue remains intact after Network/Server Error.');
  forceNetworkError = false;

  // F. Retry Idempotent
  console.log('\n--- Scenario F: Idempotent Retry ---');
  await resetQueue();
  forceNetworkError = true; // Simulating response lost
  await enqueue('att-F1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'First try response lost, item remains.');
  
  // Now simulate retry succeeding
  forceNetworkError = false;
  currentSyncResponse = { accepted: ['att-F1'], rejected: [] };
  // Trigger retry manually for test speed
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitForSyncToFinish();
  await assertQueueLength(0, 'Retry success clears queue based on explicit acknowledgement.');

  // G. HTTP 200 malformed without accepted
  console.log('\n--- Scenario G: HTTP 200 malformed ---');
  await resetQueue();
  currentSyncResponse = { status: "ok" }; // no accepted array
  await enqueue('att-G1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Malformed response (no accepted array) keeps queue intact.');

  // H. accepted not an array
  console.log('\n--- Scenario H: accepted not an array ---');
  await resetQueue();
  currentSyncResponse = { accepted: "att-H1" };
  await enqueue('att-H1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Malformed accepted (string instead of array) keeps queue intact.');

  // I. ID in accepted not in queue
  console.log('\n--- Scenario I: accepted has unknown ID ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['att-UNKNOWN'], rejected: [] };
  await enqueue('att-I1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Queue item not mentioned in accepted remains intact.');

  // J. Queue item not in accepted/rejected
  console.log('\n--- Scenario J: Queue item missing from response ---');
  await resetQueue();
  currentSyncResponse = { accepted: [], rejected: [] }; // completely ignores the item
  await enqueue('att-J1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Unacknowledged item stays in queue.');

  // K. ID in accepted AND rejected
  console.log('\n--- Scenario K: ID in both accepted and rejected ---');
  await resetQueue();
  currentSyncResponse = { accepted: ['att-K1'], rejected: [{ client_attempt_id: 'att-K1', transient: false }] };
  await enqueue('att-K1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Item in both accepted and rejected is treated as malformed/transient (retained safely).');

  // L. JSON invalid
  console.log('\n--- Scenario L: JSON invalid ---');
  await resetQueue();
  currentSyncResponse = '<html>Bad Gateway</html>';
  await enqueue('att-L1');
  await waitForSyncToFinish();
  await assertQueueLength(1, 'Invalid JSON body keeps queue intact.');

  // M. Backoff bounded
  console.log('\n--- Scenario M: Bounded backoff ---');
  await resetQueue();
  forceNetworkError = true;
  await enqueue('att-M1');
  // Should trigger immediately, then wait 2000, 4000, etc.
  await new Promise(r => setTimeout(r, 2500));
  // We expect a small number of requests (initial + backoff + maybe a rogue timer from prior test)
  if (interceptedRequests <= 4) {
    console.log(`PASS: Backoff prevented aggressive loops. Total requests: ${interceptedRequests}`);
  } else {
    console.error(`FAIL: Backoff loop too aggressive: ${interceptedRequests} requests.`);
    process.exit(1);
  }
  forceNetworkError = false;

  // N. Failed sync log bounded
  console.log('\n--- Scenario N: Failed sync log bounded to 50 ---');
  await resetQueue();
  currentSyncResponse = { accepted: [], rejected: [{ client_attempt_id: 'att-N1', transient: false }] };
  
  // Enqueue 55 items
  for(let i=0; i<55; i++) {
    currentSyncResponse.rejected[0].client_attempt_id = 'att-N' + i;
    await enqueue('att-N' + i);
    await new Promise(r => setTimeout(r, 100)); // allow sync to process
  }
  
  const finalFailed = await getFailedLog();
  if (finalFailed.length === 50) {
    console.log('PASS: Failed sync log bounded to 50 items.');
  } else {
    console.error(`FAIL: Failed log size is ${finalFailed.length}`);
    process.exit(1);
  }

  await browser.close();
  console.log('\nALL QUEUE RECOVERY TESTS (A-N) PASSED.');
}

runQueueRecoveryTest().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
