// sync.js - Offline-First Sync Manager
(function() {
  const SYNC_QUEUE_KEY = 'quizarena_sync_queue';
  const APP = 'quizarena';

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

  let isSyncing = false;
  let retryTimeout = null;
  let retryDelay = 2000;
  const MAX_RETRY_DELAY = 60000;

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
        
        if (!data || !Array.isArray(data.accepted)) {
           throw new Error('Invalid response contract: missing or malformed accepted array');
        }

        const currentQueue = getQueue();
        const acceptedIds = new Set(data.accepted);
        const rejectedTransient = new Set();
        const rejectedPermanent = new Set();
        const failedItemsForLog = [];
        
        if (Array.isArray(data.rejected)) {
          data.rejected.forEach(r => {
            if (!r || !r.client_attempt_id) return;
            
            // If an ID is in BOTH accepted and rejected, it's a malformed backend response.
            // Treat as transient and REMOVE from acceptedIds so it stays in queue!
            if (acceptedIds.has(r.client_attempt_id)) {
               acceptedIds.delete(r.client_attempt_id);
               rejectedTransient.add(r.client_attempt_id);
               console.error('Ambiguous sync contract: ID in both accepted and rejected', r.client_attempt_id);
               return;
            }
            
            if (r.transient || r.reason === 'Internal server error during transaction') {
              rejectedTransient.add(r.client_attempt_id);
            } else {
              rejectedPermanent.add(r.client_attempt_id);
              failedItemsForLog.push(r);
            }
          });
        }

        // We ONLY delete an item if it is explicitly in acceptedIds, OR it is in rejectedPermanent
        // In ALL other cases (not mentioned, malformed, transient error), it stays in queue.
        const finalQueue = currentQueue.filter(q => 
          !acceptedIds.has(q.client_attempt_id) && !rejectedPermanent.has(q.client_attempt_id)
        );

        saveQueue(finalQueue);
        
        if (failedItemsForLog.length > 0) {
           let log = [];
           try { log = JSON.parse(localStorage.getItem('quizarena_failed_syncs') || '[]'); } catch(e){}
           failedItemsForLog.forEach(f => log.push({...f, timestamp: new Date().toISOString()}));
           localStorage.setItem('quizarena_failed_syncs', JSON.stringify(log.slice(-50)));
        }

        if (rejectedTransient.size > 0) {
          updateSyncStatusUI('Sync tertunda (server sibuk), akan dicoba lagi', 'warning');
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
          clearTimeout(retryTimeout);
          retryTimeout = setTimeout(processSyncQueue, retryDelay);
        } else if (rejectedPermanent.size > 0 && acceptedIds.size === 0) {
          updateSyncStatusUI('Sinkronisasi ditolak (Validasi gagal)', 'error');
        } else {
          updateSyncStatusUI('Tersinkron', 'success');
          retryDelay = 2000; // reset backoff
          if (finalQueue.length > 0) {
            setTimeout(processSyncQueue, 1000);
          }
        }
      } else {
        throw new Error('Sync failed with status ' + response.status);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      updateSyncStatusUI('Gagal sinkron — akan dicoba otomatis', 'error');
      
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
      clearTimeout(retryTimeout);
      retryTimeout = setTimeout(processSyncQueue, retryDelay);
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
