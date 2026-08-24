const crypto = require('crypto');
const db = require('../config/database');

const MAX_ATTEMPTS = 25;
const MAX_ANSWERS_PER_ATTEMPT = 50;
const VALID_TYPES = ['diagnostic', 'practice', 'timed_quiz'];

function validateAttempt(a) {
  if (!a || typeof a !== 'object') return 'Attempt must be an object';
  if (typeof a.client_attempt_id !== 'string' || !a.client_attempt_id.trim() || a.client_attempt_id.length > 100) return 'Invalid client_attempt_id';
  if (!VALID_TYPES.includes(a.attempt_type)) return 'Invalid attempt_type';
  if (a.level_id !== null && typeof a.level_id !== 'number') return 'Invalid level_id';
  if (isNaN(Date.parse(a.started_at))) return 'Invalid started_at';
  if (isNaN(Date.parse(a.completed_at))) return 'Invalid completed_at';
  if (typeof a.total_questions !== 'number' || a.total_questions < 0) return 'Invalid total_questions';
  if (typeof a.correct_count !== 'number' || a.correct_count < 0) return 'Invalid correct_count';
  if (typeof a.incorrect_count !== 'number' || a.incorrect_count < 0) return 'Invalid incorrect_count';
  if (typeof a.unanswered_count !== 'number' || a.unanswered_count < 0) return 'Invalid unanswered_count';
  if (a.correct_count + a.incorrect_count + a.unanswered_count !== a.total_questions) return 'Counts do not sum to total_questions';
  if (typeof a.accuracy !== 'number' || a.accuracy < 0 || a.accuracy > 100) return 'Invalid accuracy';
  if (typeof a.average_answer_time !== 'number' || a.average_answer_time < 0) return 'Invalid average_answer_time';
  if (a.passed !== null && typeof a.passed !== 'boolean') return 'Invalid passed';
  
  if (!Array.isArray(a.answers) || a.answers.length > MAX_ANSWERS_PER_ATTEMPT) return 'Invalid or too many answers';
  
  for (const ans of a.answers) {
    if (!ans || typeof ans !== 'object') return 'Answer must be an object';
    if (typeof ans.question_id !== 'string' || ans.question_id.length > 50) return 'Invalid question_id';
    if (typeof ans.topic !== 'string' || ans.topic.length > 50) return 'Invalid topic';
    if (ans.selected_option_id !== null && typeof ans.selected_option_id !== 'number') return 'Invalid selected_option_id';
    if (typeof ans.correct_option_id !== 'number') return 'Invalid correct_option_id';
    if (typeof ans.is_correct !== 'boolean') return 'Invalid is_correct';
    if (typeof ans.time_spent !== 'number' || ans.time_spent < 0) return 'Invalid time_spent';
  }
  
  if (a.attempt_type === 'diagnostic') {
    if (!a.diagnostic_result || typeof a.diagnostic_result !== 'object') return 'Missing diagnostic_result';
    if (typeof a.diagnostic_result.recommended_level !== 'number') return 'Invalid recommended_level';
    if (!Array.isArray(a.diagnostic_result.weak_topics)) return 'Invalid weak_topics';
  }
  
  return null;
}

exports.sync = async (req, res) => {
  try {
  if (process.env.ENABLE_SYNC !== 'true') return res.status(501).json({ error: 'Sync feature is disabled pending question bank parity.' });
  const userId = req.user.id;
  const { clientSyncId, attempts } = req.body;
  
  if (!clientSyncId || typeof clientSyncId !== 'string') {
    return res.status(400).json({ error: 'clientSyncId must be a string' });
  }
  
  if (!Array.isArray(attempts)) {
    return res.status(400).json({ error: 'attempts must be an array' });
  }
  
  if (attempts.length > MAX_ATTEMPTS) {
    return res.status(413).json({ error: `Payload too large. Max ${MAX_ATTEMPTS} attempts allowed.` });
  }

  // Check if payload contains unrecognized fields (Strict Schema Validation)
  const allowedRootKeys = ['clientSyncId', 'attempts', 'clientUpdatedAt', 'progress'];
  for (const key of Object.keys(req.body)) {
    if (!allowedRootKeys.includes(key)) {
      return res.status(400).json({ error: `Unrecognized field: ${key}` });
    }
  }

  const accepted = [];
  const rejected = [];

  let highestLevelUnlocked = 1;
  let finalRecommendedLevel = null;
  let latestDiagnosticDate = 0;

  
  // --- SERVER-SIDE VALIDATION PREP ---
  const PASS = 70;
  const allQuestionKeys = new Set();
  for (const attempt of attempts) {
    if (Array.isArray(attempt.answers)) {
      for (const ans of attempt.answers) {
        if (ans.question_id) allQuestionKeys.add(ans.question_id);
      }
    }
  }

  const correctMap = {};
  if (allQuestionKeys.size > 0) {
    const keysArray = Array.from(allQuestionKeys);
    try {
      const [rows] = await db.query('SELECT question_key, correct_index, level_id, JSON_LENGTH(options) as options_count FROM questions WHERE question_key IN (?)', [keysArray]);
      for (const row of rows) {
        correctMap[row.question_key] = row;
      }
    } catch(err) {
      console.error('Error fetching questions for validation', err.message);
    }
  }

  const levelTotals = {};
  try {
    const [levelRows] = await db.query('SELECT level_id, COUNT(*) as cnt FROM questions WHERE level_id IS NOT NULL AND is_active = TRUE GROUP BY level_id');
    for (const r of levelRows) {
      levelTotals[r.level_id] = r.cnt;
    }
  } catch(err) {
    console.error('Error fetching level totals', err.message);
  }
  // --- END PREP ---

  for (const attempt of attempts) {
    const errorMsg = validateAttempt(attempt);
    if (errorMsg) {
      rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: errorMsg });
      continue;
    }
    
    // --- EXECUTE VALIDATION ---
    const PASS = 70;
    let actualCorrect = 0;
    let actualIncorrect = 0;
    let hasInvalidQuestion = false;
    const seenQuestions = new Set();

    let actualTotal = attempt.total_questions;
    if (attempt.attempt_type === 'timed_quiz' && attempt.level_id && levelTotals[attempt.level_id]) {
       actualTotal = levelTotals[attempt.level_id];
    } else if (attempt.attempt_type === 'diagnostic') {
       actualTotal = 15;
    }
    
    if (attempt.answers.length > actualTotal) {
      rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: 'Too many answers for this level/attempt type' });
      continue;
    }
    
    for (const ans of attempt.answers) {
       if (seenQuestions.has(ans.question_id)) {
           hasInvalidQuestion = true;
           rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: 'Duplicate question_id in attempt' });
           break;
       }
       seenQuestions.add(ans.question_id);

       const qData = correctMap[ans.question_id];
       if (!qData) {
           hasInvalidQuestion = true;
           rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: 'Unknown question_id' });
           break;
       }

       if (attempt.attempt_type === 'timed_quiz' && qData.level_id !== attempt.level_id) {
           hasInvalidQuestion = true;
           rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: 'Question ownership mismatch (cross-level exploit)' });
           break;
       }

       if (ans.selected_option_id !== null) {
           if (!Number.isInteger(ans.selected_option_id) || ans.selected_option_id < 0 || ans.selected_option_id >= qData.options_count) {
               hasInvalidQuestion = true;
               rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: 'Invalid selected_option_id' });
               break;
           }
       }

       if (ans.selected_option_id === qData.correct_index) {
         ans.is_correct = true;
         actualCorrect++;
       } else {
         ans.is_correct = false;
         actualIncorrect++;
       }
       ans.correct_option_id = qData.correct_index;
    }

    if (hasInvalidQuestion) continue;

    if (actualTotal < attempt.answers.length) actualTotal = attempt.answers.length;
    if (actualTotal === 0) actualTotal = 1;

    const actualUnanswered = Math.max(0, actualTotal - actualCorrect - actualIncorrect);
    const actualAccuracy = Math.round((actualCorrect / actualTotal) * 100);
    const actualPassed = actualAccuracy >= PASS;

    attempt.correct_count = actualCorrect;
    attempt.incorrect_count = actualIncorrect;
    attempt.unanswered_count = actualUnanswered;
    attempt.accuracy = actualAccuracy;
    attempt.passed = actualPassed;
    // --- END EXECUTE ---

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Attempt to insert quiz_attempt
      let insertAttemptResult;
      try {
        [insertAttemptResult] = await connection.query(`
          INSERT INTO quiz_attempts 
          (client_attempt_id, user_id, attempt_type, level_id, started_at, completed_at, 
           total_questions, correct_count, incorrect_count, unanswered_count, accuracy, 
           average_answer_time, passed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          attempt.client_attempt_id, userId, attempt.attempt_type, attempt.level_id, 
          new Date(attempt.started_at), new Date(attempt.completed_at),
          actualTotal, attempt.correct_count, attempt.incorrect_count, 
          attempt.unanswered_count, attempt.accuracy, attempt.average_answer_time, attempt.passed
        ]);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          await connection.rollback();
          accepted.push(attempt.client_attempt_id);
          continue;
        }
        throw err;
      }

      const attemptId = insertAttemptResult.insertId;

      // Insert Answers
      if (attempt.answers.length > 0) {
        const answerValues = attempt.answers.map(ans => [
          attemptId, ans.question_id, ans.topic, ans.selected_option_id, 
          ans.correct_option_id, ans.is_correct, ans.time_spent
        ]);
        await connection.query(`
          INSERT INTO quiz_answers 
          (attempt_id, question_id, topic, selected_option_id, correct_option_id, is_correct, time_spent)
          VALUES ?
        `, [answerValues]);
      }

      // Insert Diagnostic Result
      let newDiagRecLevel = null;
      if (attempt.attempt_type === 'diagnostic') {
        newDiagRecLevel = attempt.diagnostic_result.recommended_level;
        await connection.query(`
          INSERT INTO diagnostic_results (user_id, attempt_id, recommended_level, weak_topics_json, completed_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          userId, attemptId, newDiagRecLevel, 
          JSON.stringify(attempt.diagnostic_result.weak_topics), new Date(attempt.completed_at)
        ]);
        
        const completedTime = new Date(attempt.completed_at).getTime();
        if (completedTime > latestDiagnosticDate) {
           latestDiagnosticDate = completedTime;
           finalRecommendedLevel = newDiagRecLevel;
        }
      }

      // Lock user_progress for update to ensure atomicity
      const [upRows] = await connection.query('SELECT highest_unlocked_level, recommended_level FROM user_progress WHERE user_id = ? FOR UPDATE', [userId]);
      
      let targetUnlock = 1;
      let targetRec = null;
      if (upRows.length > 0) {
         targetUnlock = upRows[0].highest_unlocked_level;
         targetRec = upRows[0].recommended_level;
      }
      
      if (attempt.attempt_type === 'diagnostic' && newDiagRecLevel !== null) {
         targetRec = newDiagRecLevel;
      }

      if (attempt.passed && attempt.attempt_type === 'timed_quiz' && attempt.level_id) {
         if (attempt.level_id + 1 > targetUnlock) {
            targetUnlock = attempt.level_id + 1;
         }
      }

      await connection.query(`
         INSERT INTO user_progress (user_id, recommended_level, highest_unlocked_level)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           recommended_level = VALUES(recommended_level),
           highest_unlocked_level = VALUES(highest_unlocked_level)
      `, [userId, targetRec, targetUnlock]);

      await connection.commit();
      accepted.push(attempt.client_attempt_id);
    } catch (err) {
      await connection.rollback();
      console.error('Transaction failed for attempt', attempt.client_attempt_id, err.message);
      rejected.push({ client_attempt_id: attempt.client_attempt_id, reason: 'Internal server error during transaction', transient: true });
    } finally {
      connection.release();
    }
  }

  const reqId = crypto.randomUUID();
  let logIdentifier = reqId;
  if (process.env.SYNC_LOG_HASH_SECRET) {
    logIdentifier = crypto.createHmac('sha256', process.env.SYNC_LOG_HASH_SECRET).update(String(userId)).digest('hex').substring(0, 16);
  }
  console.log(JSON.stringify({
    level: 'info',
    action: 'cloud_sync',
    reqId,
    user: logIdentifier,
    accepted: accepted.length,
    rejected: rejected.length
  }));
  return res.status(200).json({
    status: 'ok',

    accepted,
    rejected,
    serverTime: new Date().toISOString()
  });
  } catch (err) {
    const errorReqId = typeof reqId !== 'undefined' ? reqId : crypto.randomUUID();
    console.error(JSON.stringify({
      level: 'error',
      action: 'cloud_sync',
      reqId: errorReqId,
      errorCategory: err.code === 'ER_DUP_ENTRY' ? 'Database_Duplicate' : 'Database_Transaction_Error'
    }));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProgress = async (req, res) => {
  const userId = req.user.id;
  try {
    const [progressRows] = await db.query('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    const [attemptsRows] = await db.query('SELECT client_attempt_id, attempt_type, level_id, accuracy, passed, completed_at FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at ASC', [userId]);
    
    // Convert dates to ISO strings explicitly
    const attempts = attemptsRows.map(row => ({
       ...row,
       passed: !!row.passed, // map 1/0 to true/false
       completed_at: new Date(row.completed_at).toISOString()
    }));

    return res.status(200).json({
      progress: progressRows[0] || null,
      attempts,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to get progress', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
