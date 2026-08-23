/**
 * Surgical fix script for index.html — applies exactly 4 targeted changes:
 * 1. Expose toggleReview on window (pageerror blocking fix)
 * 2. Add for= to login modal form labels (axe critical label fix)
 * 3. Add for= to register modal form labels (axe critical label fix)
 * 4. Add aria-label to timer-bar progressbar (axe serious aria-progressbar-name fix)
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const original = html;

// Fix 1: Expose toggleReview on window
// The function is defined inside IIFE, called from HTML onclick, so it must be on window
if (!html.includes('window.toggleReview')) {
  html = html.replace(
    /function toggleReview\(\) \{/,
    'window.toggleReview = function toggleReview() {'
  );
  console.log('Fix 1 applied: window.toggleReview exposed');
} else {
  console.log('Fix 1 skipped: already exposed');
}

// Fix 2: Login modal labels - add for= attribute
html = html.replace(
  /<div class="field"><label>Email<\/label><input type="email" id="login-email"/,
  '<div class="field"><label for="login-email">Email</label><input type="email" id="login-email"'
);
html = html.replace(
  /<div class="field"><label>Password<\/label><input type="password" id="login-password"/,
  '<div class="field"><label for="login-password">Password</label><input type="password" id="login-password"'
);
console.log('Fix 2 applied: login form labels now have for= attributes');

// Fix 3: Register modal labels - add for= attribute
html = html.replace(
  /<div class="field"><label>Email<\/label><input type="email" id="reg-email"/,
  '<div class="field"><label for="reg-email">Email</label><input type="email" id="reg-email"'
);
html = html.replace(
  /<div class="field"><label>Password<\/label><input type="password" id="reg-password"/,
  '<div class="field"><label for="reg-password">Password</label><input type="password" id="reg-password"'
);
console.log('Fix 3 applied: register form labels now have for= attributes');

// Fix 4: Add aria-label to timer-bar (progressbar needs accessible name)
html = html.replace(
  '<div class="timer-bar" id="timer-bar">',
  '<div class="timer-bar" id="timer-bar" role="progressbar" aria-label="Timer waktu kuis" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">'
);
console.log('Fix 4 applied: timer-bar has aria-label and ARIA progressbar role');

if (html === original) {
  console.error('WARNING: No changes were applied! Check patterns.');
  process.exit(1);
}

fs.writeFileSync('index.html', html);
console.log('Done — index.html updated.');
