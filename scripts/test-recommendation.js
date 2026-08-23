const assert = require('assert');

const DIAGNOSTIC_THRESHOLDS = [
    { max: 39, level: 1 },
    { max: 59, level: 3 },
    { max: 74, level: 6 },
    { max: 89, level: 10 },
    { max: 100, level: 15 }
];

function getRecommendedLevel(acc) {
    for (let i = 0; i < DIAGNOSTIC_THRESHOLDS.length; i++) {
       if (acc <= DIAGNOSTIC_THRESHOLDS[i].max) {
          return DIAGNOSTIC_THRESHOLDS[i].level;
       }
    }
    return 1;
}

try {
    assert(getRecommendedLevel(0) === 1);
    assert(getRecommendedLevel(39) === 1);
    assert(getRecommendedLevel(40) === 3);
    assert(getRecommendedLevel(59) === 3);
    assert(getRecommendedLevel(60) === 6);
    assert(getRecommendedLevel(74) === 6);
    assert(getRecommendedLevel(75) === 10);
    assert(getRecommendedLevel(89) === 10);
    assert(getRecommendedLevel(90) === 15);
    assert(getRecommendedLevel(100) === 15);
    console.log("Unit Test getRecommendedLevel: PASS");
} catch (e) {
    console.error("Unit Test getRecommendedLevel: FAIL", e);
    process.exit(1);
}
