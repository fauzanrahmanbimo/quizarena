const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Seed Question Bank Validation', () => {
  const jsonPath = path.resolve(__dirname, '../../questions/default.json');
  
  test('default.json contains exactly 900 valid questions', () => {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    expect(data.length).toBe(900);
    
    // Check missing fields and duplicates
    const ids = new Set();
    data.forEach(q => {
      expect(q.id).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.options).toBeDefined();
      expect(q.options.length).toBeGreaterThan(0);
      expect(q.correctIndex).toBeDefined();
      expect(q.correctIndex).toBeLessThan(q.options.length);
      
      expect(ids.has(q.id)).toBe(false); // No duplicate IDs
      ids.add(q.id);
    });
  });
  
  test('Dry-Run command exits with 0', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/seed-question-bank.js');
    const out = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
    expect(out).toContain('DRY-RUN completed successfully');
    expect(out).toContain('Validated: 900 questions');
  });
});
