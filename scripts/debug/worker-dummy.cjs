// Dummy worker untuk Bug Hunter - menghasilkan output placeholder
// Simulasi Hunter/Skeptic/Referee untuk local-sequential mode
const fs = require('fs');
const path = require('path');

// Baca input dari stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const req = JSON.parse(input);
    const { phase, skillDir, targetFiles, role, outputSchema } = req;

    // Output kosong sesuai schema - nanti diganti scan riil
    const emptyFindings = {
      schemaVersion: "1.0",
      runId: req.runId || "dummy-run",
      chunks: targetFiles.map(f => ({
        file: f,
        findings: [],
        status: "scanned",
        metadata: { phase, role, note: "dummy worker output" }
      }))
    };

    process.stdout.write(JSON.stringify(emptyFindings));
  } catch (e) {
    console.error("Worker error:", e.message);
    process.exit(1);
  }
});