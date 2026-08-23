const { execSync } = require('child_process');
const fs = require('fs');

const commands = [
    { name: "Bank Soal Validation", cmd: "node scripts/validate-question-bank.js" },
    { name: "Recommendation Logic Test", cmd: "node scripts/test-recommendation.js" },
    { name: "Randomization Logic Test", cmd: "node scripts/test-randomization.js" },
    { name: "Dashboard Logic Test", cmd: "node scripts/test-dashboard.js" },
    { name: "E2E P0-C & P0-D", cmd: "node run_e2e.js" },
    { name: "E2E P0-E Dashboard", cmd: "node run_e2e_dashboard.js" }
];

let finalReport = "# Laporan Eksekusi Regression Gate Akhir\n\nTanggal: " + new Date().toISOString() + "\n\n";
let allPass = true;

for (let c of commands) {
    console.log("Running: " + c.name);
    finalReport += "## " + c.name + "\n```\n$ " + c.cmd + "\n";
    try {
        const out = execSync(c.cmd, { encoding: 'utf8' });
        console.log(out);
        finalReport += out + "\n```\n\n";
    } catch (e) {
        console.error("FAIL: " + c.name);
        console.error(e.stdout);
        console.error(e.stderr);
        finalReport += (e.stdout || "") + "\n" + (e.stderr || "") + "\n```\n\n";
        allPass = false;
        break; // Stop on first failure
    }
}

// Append the original TEST_REPORT.md content if it exists
if (fs.existsSync('TEST_REPORT.md')) {
    const orig = fs.readFileSync('TEST_REPORT.md', 'utf8');
    finalReport += "\n## Hasil Detail Puppeteer E2E\n\n" + orig;
}

fs.writeFileSync('TEST_REPORT.md', finalReport);

if (allPass) {
    console.log("All tests passed!");
    process.exit(0);
} else {
    console.log("Some tests failed.");
    process.exit(1);
}
