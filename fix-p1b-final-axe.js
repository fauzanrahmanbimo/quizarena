/**
 * Surgical fix script to fix the final Axe color contrast issues:
 * 1. Change `.answer.dim` opacity to 0.7 for enough contrast
 * 2. Replace all hardcoded `#ef4444` with `#dc2626` (which is WCAG AA compliant)
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Fix opacity for .dim answers
html = html.replace(
  '.answer.dim { opacity: .5; }',
  '.answer.dim { opacity: .75; }'
);

// 2. Fix hardcoded #ef4444 colors (Result screen)
html = html.replace(/#ef4444/g, '#dc2626');
html = html.replace(/rgba\(239, 68, 68, 0.1\)/g, 'rgba(220, 38, 38, 0.1)');

fs.writeFileSync('index.html', html);
console.log('Done: fixed final color contrast issues.');
