// dashboard-logic.js

function safeParseJSON(str) {
    if (!str) return [];
    try {
        const p = JSON.parse(str);
        return Array.isArray(p) ? p : [];
    } catch(e) {
        return [];
    }
}

// Ensure attempts follow basic schema
function sanitizeAttempts(rawLogs) {
    const logs = safeParseJSON(rawLogs);
    return logs.filter(a => a && typeof a === 'object' && a.attemptId).map(a => ({
        attemptId: a.attemptId,
        attemptType: ['diagnostic', 'practice', 'timed_quiz'].includes(a.attemptType) ? a.attemptType : 'practice', // fallback old schema
        levelId: a.levelId || null,
        startedAt: a.startedAt || 0,
        completedAt: a.completedAt || 0,
        totalQuestions: a.totalQuestions || 0,
        correctCount: a.correctCount || 0,
        incorrectCount: a.incorrectCount || 0,
        unansweredCount: a.unansweredCount || 0,
        accuracy: typeof a.accuracy === 'number' ? a.accuracy : 0,
        averageAnswerTime: a.averageAnswerTime || 0,
        passed: a.passed === true ? true : (a.passed === false ? false : null),
        answers: Array.isArray(a.answers) ? a.answers.map(ans => ({
            questionId: ans.questionId || 'unknown',
            topic: ans.topic || 'General',
            selectedOptionId: ans.selectedOptionId || null,
            correctOptionId: ans.correctOptionId || null,
            isCorrect: !!ans.isCorrect,
            timeSpent: Math.max(0, ans.timeSpent || 0) // non-negative
        })) : []
    }));
}

function getRegularAttempts(logs) {
    return logs.filter(a => a.attemptType === 'practice' || a.attemptType === 'timed_quiz');
}

// Get stats avoiding diagnostic
function getDashboardStats(logs) {
    const regular = getRegularAttempts(logs);
    
    let totalAttempts = regular.length;
    let totalCorrect = 0;
    let totalTime = 0; // in seconds
    
    let pracTotalAcc = 0; let pracCount = 0;
    let timedTotalAcc = 0; let timedCount = 0;
    
    regular.forEach(a => {
        totalCorrect += a.correctCount;
        totalTime += Math.round((a.completedAt - a.startedAt) / 1000);
        
        if (a.attemptType === 'practice') { pracTotalAcc += a.accuracy; pracCount++; }
        if (a.attemptType === 'timed_quiz') { timedTotalAcc += a.accuracy; timedCount++; }
    });
    
    return {
        totalAttempts,
        totalCorrect,
        totalTimeSeconds: Math.max(0, totalTime),
        avgPracticeAcc: pracCount > 0 ? Math.round(pracTotalAcc / pracCount) : null,
        avgTimedAcc: timedCount > 0 ? Math.round(timedTotalAcc / timedCount) : null
    };
}

// Topic performance (requires >= 3 answers per topic)
function getTopicPerformance(logs) {
    const regular = getRegularAttempts(logs);
    const topics = {};
    
    regular.forEach(a => {
        a.answers.forEach(ans => {
            if (!topics[ans.topic]) topics[ans.topic] = { total: 0, correct: 0 };
            topics[ans.topic].total++;
            if (ans.isCorrect) topics[ans.topic].correct++;
        });
    });
    
    const validTopics = Object.keys(topics)
        .filter(t => topics[t].total >= 3)
        .map(t => ({
            topic: t,
            accuracy: Math.round((topics[t].correct / topics[t].total) * 100),
            total: topics[t].total
        }));
    
    const strong = validTopics.filter(t => t.accuracy >= 70).sort((a,b) => b.accuracy - a.accuracy).slice(0,3);
    const weak = validTopics.filter(t => t.accuracy < 70).sort((a,b) => a.accuracy - b.accuracy).slice(0,3);
    
    return { strong, weak, hasEnoughData: validTopics.length > 0 };
}

// Learning Path Summary
function getLearningPathSummary(logs, levelsConfig) {
    // Determine highest unlocked/passed level
    let highestPassedIndex = -1;
    const regular = getRegularAttempts(logs);
    
    regular.forEach(a => {
        if (a.passed && a.levelId !== null) {
            const idx = levelsConfig.findIndex(l => l.level === a.levelId);
            if (idx > highestPassedIndex) highestPassedIndex = idx;
        }
    });
    
    let diagRecLevelId = null;
    let diagRecIndex = -1;
    const diag = logs.filter(a => a.attemptType === 'diagnostic').pop(); // latest diagnostic
    
    if (diag && diag.accuracy !== undefined) {
        // mock logic for recommended level based on diag accuracy if we want to rebuild it
        // but it's better to rely on saved state if possible, though pure function is better.
        // For pure function, we assume recommendation thresholds:
        const acc = diag.accuracy;
        if (acc < 40) diagRecLevelId = 1;
        else if (acc < 60) diagRecLevelId = 3;
        else if (acc < 75) diagRecLevelId = 6;
        else if (acc < 90) diagRecLevelId = 10;
        else diagRecLevelId = 15;
        
        diagRecIndex = levelsConfig.findIndex(l => l.level === diagRecLevelId);
    }
    
    // completed = passed
    // in progress = highestPassed + 1
    const totalLevels = levelsConfig.length;
    let completed = highestPassedIndex + 1; 
    let inProgress = Math.min(totalLevels, completed + 1);
    
    return {
        completed,
        inProgress: 1, // one active level
        locked: Math.max(0, totalLevels - completed - 1),
        recommendedLevelId: diagRecLevelId,
        recommendedLevelIndex: diagRecIndex
    };
}

function getRecommendedAction(logs) {
    const diag = logs.filter(a => a.attemptType === 'diagnostic').pop();
    if (!diag) {
        return { action: 'TAKE_DIAGNOSTIC', title: 'Ambil Placement Test' };
    }
    const regular = getRegularAttempts(logs);
    if (regular.length === 0) {
        return { action: 'START_RECOMMENDED', title: 'Mulai Level Rekomendasi' };
    }
    
    // If they have attempts, suggest next level or repeat weak topics
    const lastAttempt = regular[regular.length - 1];
    if (lastAttempt.passed) {
        return { action: 'NEXT_LEVEL', title: 'Lanjutkan Level Berikutnya' };
    } else {
        const perf = getTopicPerformance(logs);
        if (perf.weak.length > 0) {
            return { action: 'REPEAT_WEAK', title: 'Ulangi Topik Lemah' };
        } else {
            return { action: 'RETRY_LEVEL', title: 'Ulangi Level' };
        }
    }
}

function getRecentAttempts(logs, max=5) {
    return [...logs].sort((a,b) => b.completedAt - a.completedAt).slice(0, max);
}

function getChartData(logs) {
    const reg = getRegularAttempts(logs).sort((a,b) => a.completedAt - b.completedAt).slice(-7);
    return reg;
}

if (typeof module !== 'undefined') {
    module.exports = {
        sanitizeAttempts, getRegularAttempts, getDashboardStats, 
        getTopicPerformance, getLearningPathSummary, getRecommendedAction,
        getRecentAttempts, getChartData
    };
}
