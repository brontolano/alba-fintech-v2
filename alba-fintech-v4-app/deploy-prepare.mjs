/**
 * deploy-prepare.mjs — Pre-deploy preparation script (v4)
 * Sets environment, runs type check, lint, test, build, and creates deployment manifest.
 */
import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const steps = [
    { name: 'TypeScript Check', cmd: 'npx tsc --noEmit' },
    { name: 'Lint', cmd: 'npx eslint src --fix' },
    { name: 'Tests', cmd: 'npx vitest run' },
    { name: 'Build', cmd: 'npm run build' },
];

const results = [];
for (const step of steps) {
    console.log(`\n▶ ${step.name}...`);
    try {
        execSync(step.cmd, { stdio: 'inherit' });
        results.push({ ...step, status: 'PASS' });
    } catch (e) {
        console.error(`❌ ${step.name} failed`);
        results.push({ ...step, status: 'FAIL' });
        process.exit(1);
    }
}

// Generate deployment manifest
if (!existsSync('dist')) mkdirSync('dist');
const manifest = {
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    checks: results,
    buildOutput: '.next/',
};
writeFileSync('dist/deploy-manifest.json', JSON.stringify(manifest, null, 2));
console.log('\n✅ Deploy preparation complete. Manifest written to dist/deploy-manifest.json');
