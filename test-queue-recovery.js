const puppeteer = require('puppeteer');

async function runQueueRecoveryTest() {
  console.log('Starting Client Queue Recovery Test...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Intercept network
  await page.setRequestInterception(true);
  
  let currentSyncResponse = { accepted: [], rejected: [] };
  
  page.on('request', request => {
    if (request.url().includes('/api/progress/sync')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentSyncResponse)
      });
    } else {
      request.continue();
    }
  });

  // Navigate to page to load sync.js
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Inject a mock auth token so sync will run
  await page.evaluate(() => {
    document.cookie = "auth_token=fake_token_for_test; path=/";
  });

  const getQueue = async () => page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_sync_queue') || '[]'));
  const enqueue = async (id) => page.evaluate((id) => {
    window.enqueueSync({
      attemptId: id, attemptType: 'timed_quiz', levelId: 1, startedAt: Date.now(), completedAt: Date.now(),
      totalQuestions: 1, correctCount: 1, incorrectCount: 0, unansweredCount: 0, accuracy: 100, passed: true,
      answers: []
    });
  }, id);

  // Scenario A: Full Success
  console.log('\n--- Scenario A: Full Success ---');
  await page.evaluate(() => localStorage.setItem('quizarena_sync_queue', '[]')); // reset
  currentSyncResponse = { accepted: ['att-A1'], rejected: [] };
  await enqueue('att-A1');
  await new Promise(r => setTimeout(r, 1500)); // wait for sync to process
  let q = await getQueue();
  if (q.length === 0) console.log('PASS: Queue cleared on full success.');
  else { console.error('FAIL:', q); process.exit(1); }

  // Scenario B: Partial Batch Success with transient error
  console.log('\n--- Scenario B: Partial Batch Success ---');
  currentSyncResponse = { 
    accepted: ['att-B1'], 
    rejected: [{ client_attempt_id: 'att-B2', reason: 'DB Lock', transient: true }] 
  };
  await enqueue('att-B1');
  await enqueue('att-B2');
  await new Promise(r => setTimeout(r, 1500));
  q = await getQueue();
  if (q.length === 1 && q[0].client_attempt_id === 'att-B2') {
    console.log('PASS: Transient error item remains in queue while successful item is cleared.');
  } else { console.error('FAIL:', q); process.exit(1); }

  // Scenario C: HTTP 200 but internal rejection (transient)
  console.log('\n--- Scenario C: HTTP 200 but internal rejection ---');
  await page.evaluate(() => localStorage.setItem('quizarena_sync_queue', '[]'));
  currentSyncResponse = { accepted: [], rejected: [{ client_attempt_id: 'att-C1', reason: 'Internal error', transient: true }] };
  await enqueue('att-C1');
  await new Promise(r => setTimeout(r, 1500));
  q = await getQueue();
  if (q.length === 1 && q[0].client_attempt_id === 'att-C1') {
    console.log('PASS: HTTP 200 alone does not clear queue if item is rejected with transient error.');
  } else { console.error('FAIL:', q); process.exit(1); }

  // Scenario D: Validation Rejection
  console.log('\n--- Scenario D: Validation Rejection (Permanent) ---');
  await page.evaluate(() => localStorage.setItem('quizarena_sync_queue', '[]'));
  currentSyncResponse = { accepted: [], rejected: [{ client_attempt_id: 'att-D1', reason: 'Duplicate question_id', transient: false }] };
  await enqueue('att-D1');
  await new Promise(r => setTimeout(r, 1500));
  q = await getQueue();
  if (q.length === 0) {
    const failedLog = await page.evaluate(() => JSON.parse(localStorage.getItem('quizarena_failed_syncs') || '[]'));
    if (failedLog.length > 0 && failedLog.some(f => f.client_attempt_id === 'att-D1')) {
      console.log('PASS: Permanent validation error clears queue and moves to failed_syncs log.');
    } else {
      console.error('FAIL: Item not in failed log.', failedLog); process.exit(1);
    }
  } else { console.error('FAIL:', q); process.exit(1); }

  // Scenario E: Network Interruption
  console.log('\n--- Scenario E: Network Interruption (HTTP 500) ---');
  await page.evaluate(() => localStorage.setItem('quizarena_sync_queue', '[]'));
  page.removeAllListeners('request'); // reset interception
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/progress/sync')) {
      request.respond({ status: 500, body: 'Server Crash' }); // Force HTTP error
    } else { request.continue(); }
  });
  await enqueue('att-E1');
  await new Promise(r => setTimeout(r, 1500));
  q = await getQueue();
  if (q.length === 1 && q[0].client_attempt_id === 'att-E1') {
    console.log('PASS: Queue remains intact after HTTP 500 Network/Server Error.');
  } else { console.error('FAIL:', q); process.exit(1); }

  await browser.close();
  console.log('\nALL QUEUE RECOVERY TESTS PASSED.');
}

runQueueRecoveryTest().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
