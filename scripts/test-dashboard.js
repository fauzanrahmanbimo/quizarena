const assert = require('assert');
const logic = require('./dashboard-logic.js');

function runUnitTests() {
    // 1. Safe handling corrupted JSON
    assert.deepStrictEqual(logic.sanitizeAttempts("not a json"), []);
    assert.deepStrictEqual(logic.sanitizeAttempts("[{}]"), []);
    
    const badSchema = [{ attemptId: "u1", attemptType: "invalid_type", answers: null }];
    const sanitizedBad = logic.sanitizeAttempts(JSON.stringify(badSchema));
    assert(sanitizedBad[0].attemptType === 'unknown');
    assert.deepStrictEqual(sanitizedBad[0].answers, []);
    
    assert(logic.getRegularAttempts(sanitizedBad).length === 0);
    assert(logic.getDashboardStats(sanitizedBad).totalAttempts === 0);

    
    const logs = [
        // diagnostic
        { attemptId: "d1", attemptType: "diagnostic", levelId: null, startedAt: 100, completedAt: 200, totalQuestions: 15, correctCount: 15, incorrectCount: 0, unansweredCount: 0, accuracy: 100, averageAnswerTime: 1, passed: null, answers: [] },
        // regular failed
        { attemptId: "r1", attemptType: "timed_quiz", levelId: 1, startedAt: 300, completedAt: 500, totalQuestions: 10, correctCount: 2, incorrectCount: 8, unansweredCount: 0, accuracy: 20, averageAnswerTime: 2, passed: false, answers: [
            { topic: "Grammar", isCorrect: false },
            { topic: "Grammar", isCorrect: false },
            { topic: "Grammar", isCorrect: false }
        ] },
        // regular passed
        { attemptId: "r2", attemptType: "practice", levelId: 2, startedAt: 600, completedAt: 1000, totalQuestions: 10, correctCount: 8, incorrectCount: 2, unansweredCount: 0, accuracy: 80, averageAnswerTime: 3, passed: true, answers: [
            { topic: "Vocabulary", isCorrect: true },
            { topic: "Vocabulary", isCorrect: true },
            { topic: "Vocabulary", isCorrect: true },
            { topic: "Grammar", isCorrect: true }
        ] }
    ];

    const cleanLogs = logic.sanitizeAttempts(JSON.stringify(logs));

    // 2. Diagnostic excluded from average
    const stats = logic.getDashboardStats(cleanLogs);
    assert(stats.totalAttempts === 2);
    assert(stats.avgTimedAcc === 20);
    assert(stats.avgPracticeAcc === 80);

    // 3. Topic insight requires >= 3 answers
    const topics = logic.getTopicPerformance(cleanLogs);
    assert(topics.weak.length === 1);
    assert(topics.weak[0].topic === 'Grammar'); // 3 failed, 1 correct total = 25% accuracy
    assert(topics.strong.length === 1);
    assert(topics.strong[0].topic === 'Vocabulary'); // 3 correct total = 100% accuracy

    // 4. Sorting recent attempts
    const recent = logic.getRecentAttempts(cleanLogs, 2);
    assert(recent.length === 2);
    assert(recent[0].attemptId === "r2"); // most recent
    assert(recent[1].attemptId === "r1");

    // 5. Recommended action
    assert(logic.getRecommendedAction([]).action === 'TAKE_DIAGNOSTIC');
    assert(logic.getRecommendedAction([cleanLogs[0]]).action === 'START_RECOMMENDED');
    assert(logic.getRecommendedAction(cleanLogs).action === 'NEXT_LEVEL');

    console.log("Dashboard Unit Tests: PASS");
}

try {
    runUnitTests();
} catch (e) {
    console.error("Dashboard Unit Tests: FAIL\n", e);
    process.exit(1);
}
