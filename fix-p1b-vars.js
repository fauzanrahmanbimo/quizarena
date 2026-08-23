/**
 * Final color contrast fix for CSS variables.
 * - --danger: #DC2626 -> #b91c1c (red-700)
 * - --success: #10B981 -> #047857 (emerald-700)
 * - --warning: #F59E0B -> #b45309 (amber-700)
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/--danger:\s*#[a-fA-F0-9]{6}/g, '--danger: #b91c1c');
html = html.replace(/--success:\s*#[a-fA-F0-9]{6}/g, '--success: #047857');
html = html.replace(/--warning:\s*#[a-fA-F0-9]{6}/g, '--warning: #b45309');

fs.writeFileSync('index.html', html);
console.log('Done: fixed CSS variables contrast.');
