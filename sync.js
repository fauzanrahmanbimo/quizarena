// sync.js - Offline-First Sync Manager
(function() {
  const SYNC_QUEUE_KEY = 'quizarena_sync_queue';
  const FAILED_SYNCS_KEY = 'quizarena_failed_syncs';
  const APP = 'quizarena';
  const MAX_FAILED_LOG = 50;
  const MAX_REASON_LEN = 200;

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveQueue(queue) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  function updateSyncStatusUI(statusMsg) {
    let el = document.getElementById('sync-status-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sync-status-indicator';
      el.style.position = 'fixed';
      el.style.bottom = '10px';
      el.style.left = '10px';
      el.style.padding = '4px 8px';
      el.style.fontSize = '12px';
      el.style.borderRadius = '4px';
      el.style.zIndex = '9999';
      el.style.transition = 'opacity 0.5s';
      document.body.appendChild(el);
    }
    el.textContent = statusMsg;
    el.style.opacity = '1';
    
    if (statusMsg === 'Tersinkron' || statusMsg === 'Tersimpan di perangkat') {
      el.style.background = 'var(--success, #10B981)';
      el.style.color = 'white';
      setTimeout(() => { el.style.opacity = '0'; }, 3000);
    } else if (statusMsg === 'Menyinkronkan...') {
      el.style.background = 'var(--warning, #F59E0B)';
      el.style.color = 'black';
    } else {
      el.style.background = 'var(--danger, #EF4444)';
      el.style.color = 'white';
      setTimeout(() => { el.style.opacity = '0'; }, 3000);
    }
  }

  window.enqueueSync = function(attempt) {
    const queue = getQueue();
    
    const snakeAttempt = {
      client_attempt_id: attempt.attemptId || attempt.client_attempt_id || generateUUID(),
      attempt_type: attempt.attemptType,
      level_id: attempt.levelId,
      started_at: new Date(attempt.startedAt).toISOString(),
      completed_at: new Date(attempt.completedAt).toISOString(),
      total_questions: attempt.totalQuestions,
      correct_count: attempt.correctCount,
      incorrect_count: attempt.incorrectCount,
      unanswered_count: attempt.unansweredCount,
      accuracy: attempt.accuracy,
      average_answer_time: attempt.averageAnswerTime,
      passed: attempt.passed,
      answers: (attempt.answers || []).map(a => ({
        question_id: a.questionId,
        topic: a.topic || "General",
        selected_option_id: typeof a.selectedOptionId === "number" ? a.selectedOptionId : null,
        correct_option_id: typeof a.correctOptionId === "number" ? a.correctOptionId : (typeof a.correctOptionIndex === "number" ? a.correctOptionIndex : 0),
        is_correct: a.isCorrect,
        time_spent: a.timeSpent
      }))
    };
    if (attempt.attemptType === "diagnostic" && attempt.weakTopics) {
       snakeAttempt.diagnostic_result = {
          recommended_level: attempt.recommendedLevel || 1,
          weak_topics: attempt.weakTopics
       };
    }
    queue.push(snakeAttempt);

    saveQueue(queue);
    
    updateSyncStatusUI('Tersimpan di perangkat', 'success');
    
    // Only attempt sync if logged in (token exists)
    if (getAuthToken()) {
      processSyncQueue();
    }
  };

  function getAuthToken() {
    const name = 'auth_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  }

  function getCsrfToken() {
    const name = 'csrfToken=';
    const ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++) {
      let c = ca[i].trim();
      if(c.indexOf(name)===0) return c.substring(name.length, c.length);
    }
    return null;
  }

  // ─── Test-only scheduler adapter (Option B) ───────────────────────────────
  // window.__SYNC_TEST_CONFIG__ is ONLY ever injected by Puppeteer in test
  // environments. It does not exist in production HTML and is never shipped.
  // Guards:
  //   1. typeof window.__SYNC_TEST_CONFIG__ checked at call site.
  //   2. Adapter only reads overrideRetryDelayMs and onRetryScheduled callbacks.
  //   3. No production API surface is exposed.
  function getTestRetryDelay(proposedDelay) {
    if (
      typeof window !== 'undefined' &&
      window.__SYNC_TEST_CONFIG__ &&
      typeof window.__SYNC_TEST_CONFIG__.overrideRetryDelayMs === 'number'
    ) {
      return window.__SYNC_TEST_CONFIG__.overrideRetryDelayMs;
    }
    return proposedDelay;
  }

  function notifyTestRetryScheduled(delay) {
    if (
      typeof window !== 'undefined' &&
      window.__SYNC_TEST_CONFIG__ &&
      typeof window.__SYNC_TEST_CONFIG__.onRetryScheduled === 'function'
    ) {
      window.__SYNC_TEST_CONFIG__.onRetryScheduled(delay);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  let isSyncing = false;
  let retryTimeout = null;
  let retryDelay = 2000;
  const MAX_RETRY_DELAY = 60000;

  // ─── Contract Validation ─────────────────────────────────────────────────
  //
  // Returns { valid: true, acceptedIds, rejectedTransient, rejectedPermanent, failedItems }
  // or      { valid: false, reason: string }
  //
  // Rules (Koreksi 5):
  //   - data must exist and data.accepted must be a non-null array.
  //   - Each element of accepted must be a non-empty string.
  //   - accepted must not contain duplicates.
  //   - rejected, if present, must be an array.
  //   - Each rejected item must have:
  //       client_attempt_id: string non-empty
  //       transient: boolean
  //       reason: string (sanitized, truncated to 200 chars)
  //       code: string | null
  //   - Any ID appearing in both accepted and rejected → whole response is malformed.
  //   - Malformed: queue retained, no failed_syncs entry, safe UI error, bounded retry.
  //   - Permanent rejection only processed when schema is fully valid.

  function validateContract(data) {
    if (!data || !Array.isArray(data.accepted)) {
      return { valid: false, reason: 'Malformed response: accepted array missing' };
    }

    // accepted: unique non-empty strings
    const acceptedIds = new Set();
    for (const id of data.accepted) {
      if (typeof id !== 'string' || id.trim() === '') {
        return { valid: false, reason: 'Malformed response: accepted contains invalid entry' };
      }
      if (acceptedIds.has(id)) {
        return { valid: false, reason: 'Malformed response: duplicate ID in accepted' };
      }
      acceptedIds.add(id);
    }

    const rejectedTransient = new Set();
    const rejectedPermanent = new Set();
    const failedItems = [];

    if (data.rejected !== undefined && !Array.isArray(data.rejected)) {
      // rejected present but not an array — treat as if rejected is absent (accepted still usable)
      // This is a partial malform: we process accepted but ignore rejected entirely.
      return { valid: true, acceptedIds, rejectedTransient, rejectedPermanent, failedItems };
    }

    if (Array.isArray(data.rejected)) {
      for (const r of data.rejected) {
        // Validate each rejected item fully
        if (!r || typeof r !== 'object') continue;

        if (typeof r.client_attempt_id !== 'string' || r.client_attempt_id.trim() === '') {
          // Skip items with missing/invalid client_attempt_id — don't abort whole response
          continue;
        }

        if (typeof r.transient !== 'boolean') {
          // transient not a boolean — skip this item
          continue;
        }

        if (typeof r.code !== 'string' && r.code !== null) {
          // code not string or null — skip this item
          continue;
        }

        // Overlap check: same ID in both accepted and rejected = malformed whole response
        if (acceptedIds.has(r.client_attempt_id)) {
          return { valid: false, reason: 'Malformed response: ID in both accepted and rejected: ' + r.client_attempt_id };
        }

        // Sanitize reason: must be string, max 200 chars
        const rawReason = typeof r.reason === 'string' ? r.reason : String(r.reason || '');
        const sanitizedReason = rawReason.substring(0, MAX_REASON_LEN);

        if (r.transient) {
          rejectedTransient.add(r.client_attempt_id);
        } else {
          rejectedPermanent.add(r.client_attempt_id);
          // Store only safe fields in failed log — NO JWT, auth header, raw payload, score, level, user ID, stack trace
          failedItems.push({
            client_attempt_id: r.client_attempt_id,
            reason: sanitizedReason,
            code: r.code
            // timestamp added at write time
          });
        }
      }
    }

    return { valid: true, acceptedIds, rejectedTransient, rejectedPermanent, failedItems };
  }
  // ─────────────────────────────────────────────────────────────────────────

  function scheduleRetry() {
    const delay = getTestRetryDelay(Math.min(retryDelay * 2, MAX_RETRY_DELAY));
    retryDelay = delay;
    clearTimeout(retryTimeout);
    retryTimeout = setTimeout(processSyncQueue, delay);
    notifyTestRetryScheduled(delay);
  }

  async function processSyncQueue() {
    if (isSyncing || !navigator.onLine) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    if (!getAuthToken()) return;

    isSyncing = true;
    updateSyncStatusUI('Menyinkronkan...', 'syncing');
    
    // Take up to 25 items
    const batch = queue.slice(0, 25);
    const syncId = generateUUID();

    try {
      const response = await fetch('/api/progress/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        body: JSON.stringify({
          clientSyncId: syncId,
          attempts: batch
        })
      });

      if (response.status === 401) {
        // Not authenticated, stop trying
        isSyncing = false;
        updateSyncStatusUI('Gagal sinkron — sesi berakhir', 'error');
        return;
      }

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (err) {
          throw new Error('Malformed JSON response');
        }

        const contractResult = validateContract(data);

        if (!contractResult.valid) {
          // Malformed response: retain queue, no log entry, safe error, bounded retry
          console.error('Sync contract violation:', contractResult.reason);
          updateSyncStatusUI('Gagal sinkron — respons tidak valid', 'error');
          scheduleRetry();
          return;
        }

        const { acceptedIds, rejectedTransient, rejectedPermanent, failedItems } = contractResult;
        const currentQueue = getQueue();

        // We ONLY delete an item if it is explicitly in acceptedIds, OR it is in rejectedPermanent.
        // In ALL other cases (not mentioned, transient error), it stays in queue.
        const finalQueue = currentQueue.filter(q =>
          !acceptedIds.has(q.client_attempt_id) && !rejectedPermanent.has(q.client_attempt_id)
        );

        saveQueue(finalQueue);

        if (failedItems.length > 0) {
          let log = [];
          try { log = JSON.parse(localStorage.getItem(FAILED_SYNCS_KEY) || '[]'); } catch(e){}
          // Store only the 4 safe fields + timestamp
          failedItems.forEach(f => log.push({
            client_attempt_id: f.client_attempt_id,
            reason: f.reason,
            timestamp: new Date().toISOString(),
            code: f.code
          }));
          localStorage.setItem(FAILED_SYNCS_KEY, JSON.stringify(log.slice(-MAX_FAILED_LOG)));
        }

        if (rejectedTransient.size > 0) {
          updateSyncStatusUI('Sync tertunda (server sibuk), akan dicoba lagi', 'warning');
          scheduleRetry();
        } else if (rejectedPermanent.size > 0 && acceptedIds.size === 0) {
          updateSyncStatusUI('Sinkronisasi ditolak (Validasi gagal)', 'error');
          retryDelay = 2000; // reset backoff — permanent rejections don't retry
        } else {
          updateSyncStatusUI('Tersinkron', 'success');
          retryDelay = 2000; // reset backoff
          if (finalQueue.length > 0) {
            const nextDelay = getTestRetryDelay(1000);
            setTimeout(processSyncQueue, nextDelay);
          }
        }
      } else {
        throw new Error('Sync failed with status ' + response.status);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      updateSyncStatusUI('Gagal sinkron — akan dicoba otomatis', 'error');
      scheduleRetry();
    } finally {
      isSyncing = false;
    }
  }

  window.addEventListener('online', () => {
    if (getAuthToken()) {
      retryDelay = 2000;
      processSyncQueue();
    }
  });

  window.downloadProgress = async function() {
    if (!getAuthToken()) return;
    try {
      const response = await fetch('/api/progress', {
        headers: { 'x-csrf-token': getCsrfToken() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.progress) {
          localStorage.setItem(APP + '_highest_level', data.progress.highest_unlocked_level || 1);
        }
        if (data.attempts && data.attempts.length > 0) {
           // Merge or replace local attempts log if needed
           // Currently just keeping it local logic minimal
        }
        // Force refresh UI if needed
        if (typeof updateHomeUI === 'function') updateHomeUI();
      }
    } catch (err) {
      console.error('Failed to download progress', err);
    }
  };

  // On boot
  setTimeout(() => {
    if (getAuthToken()) {
      processSyncQueue();
      downloadProgress();
    }
  }, 1000);

})();
