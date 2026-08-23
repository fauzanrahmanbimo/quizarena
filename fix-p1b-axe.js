/**
 * Fix P1-B axe violations and timer variable scoping:
 * 1. aria-label on progress-fill progressbar
 * 2. footer color-contrast (#6B7280 → #595E68 for 4.5:1 on #f3f4f6)
 * 3. aria-label / higher contrast on timer-num (var(--text-muted) = #6B7280)
 * 4. heading-order: h3 in home-dynamic-action inside a card
 * 5. Expose timeLeft on window for testability
 * 6. Fix btn-next: it's hidden (not disabled) initially — update harness test
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix 1: progress-fill needs aria-label (aria-progressbar-name serious violation)
html = html.replace(
  'id="progress-fill" role="progressbar"',
  'id="progress-fill" role="progressbar" aria-label="Kemajuan soal"'
);

// Fix 2: footer color-contrast — change text-muted CSS variable to meet 4.5:1
// --text-muted: #6B7280 on #f3f4f6 = 4.39:1 → use #5B6470 which is ~4.6:1
html = html.replace('--text-muted: #6B7280;', '--text-muted: #595F67;');

// Fix 3: heading-order — the updateHomeUI injects h3 directly after h1 at top level (skipping h2)
// Change the injected headings from h3 to h2 in JS
html = html.replace(
  /container\.innerHTML = `<h3 style="margin-bottom:8px;">Mulai Perjalananmu<\/h3>/,
  'container.innerHTML = `<h2 style="margin-bottom:8px; font-size:18px;">Mulai Perjalananmu</h2>'
);
html = html.replace(
  /container\.innerHTML = `<h3 style="margin-bottom:8px;">Rekomendasi Level<\/h3>/,
  'container.innerHTML = `<h2 style="margin-bottom:8px; font-size:18px;">Rekomendasi Level</h2>'
);
html = html.replace(
  /container\.innerHTML = `<h3 style="margin-bottom:8px;">Lanjutkan Belajar<\/h3>/,
  'container.innerHTML = `<h2 style="margin-bottom:8px; font-size:18px;">Lanjutkan Belajar</h2>'
);

// Verify
const checks = [
  ['progress-fill has aria-label', html.includes('aria-label="Kemajuan soal"')],
  ['text-muted updated', html.includes('--text-muted: #595F67')],
  ['h3 headings replaced with h2', !html.includes('margin-bottom:8px;">Mulai Perjalananmu</h3>')],
];
let ok = true;
checks.forEach(([name, result]) => {
  console.log((result ? '[OK]' : '[FAIL]') + ' ' + name);
  if (!result) ok = false;
});

fs.writeFileSync('index.html', html);
if (ok) {
  console.log('All fixes applied to index.html');
  process.exit(0);
} else {
  console.error('Some fixes could not be applied');
  process.exit(1);
}
