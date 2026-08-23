const assert = require('assert');

function shuffle(arr) { 
    let res = [...arr];
    for (let i = res.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [res[i], res[j]] = [res[j], res[i]]; 
    } 
    return res; 
}

function shuffleSession(list) {
  let pool = list.map((q) => ({ ...q, options: [...q.options] }));
  pool = shuffle(pool);
  pool = pool.map((q) => {
    const paired = q.options.map((opt, i) => ({ opt, correct: i === q.correctIndex }));
    const shuffledPairs = shuffle(paired);
    return { ...q, options: shuffledPairs.map((p) => p.opt), answer: shuffledPairs.findIndex((p) => p.correct) };
  });
  return pool;
}

try {
    const sampleQuestions = [
        { id: 'q1', correctIndex: 0, options: ['A', 'B', 'C', 'D'] },
        { id: 'q2', correctIndex: 2, options: ['E', 'F', 'G', 'H'] },
        { id: 'q3', correctIndex: 3, options: ['I', 'J', 'K', 'L'] }
    ];
    
    const shuffled = shuffleSession(sampleQuestions);
    
    assert(shuffled.length === 3, "Length mismatch");
    
    for (let sq of shuffled) {
       const original = sampleQuestions.find(q => q.id === sq.id);
       const correctText = original.options[original.correctIndex];
       
       assert(sq.options.length === 4, "Missing options");
       assert(sq.options[sq.answer] === correctText, "Answer mapping broken! Expected " + correctText + " but got " + sq.options[sq.answer]);
    }
    
    console.log("Unit Test Randomization & Scoring: PASS");
} catch (e) {
    console.error("Unit Test Randomization & Scoring: FAIL", e);
    process.exit(1);
}
