/**
 * Self-contained Playwright test for ALBA Finance v2
 * Manages its own server lifecycle - no with_server.py needed
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const SERVER_URL = 'http://127.0.0.1:3000';
const STARTUP_TIMEOUT = 60000; // 60 seconds

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('[Test] Starting Next.js dev server...');
    const server = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname),
      env: { ...process.env, HOST: '127.0.0.1' },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;
    let output = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
      if (!started && output.includes('Ready in')) {
        started = true;
        console.log('[Test] Server is ready!');
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      output += data.toString();
      if (!started && output.includes('Ready in') || output.includes('compiled successfully')) {
        started = true;
        console.log('[Test] Server ready (stderr)!');
        resolve(server);
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!started) {
        console.log('[Test] Using startup timeout fallback');
        resolve(server);
      }
    }, STARTUP_TIMEOUT);

    server.on('error', (err) => {
      console.error('[Test] Server spawn error:', err.message);
      reject(err);
    });
  });
}

async function runTests() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    baseURL: SERVER_URL
  });
  const page = await context.newPage();

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[Browser Error]:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log('[Page Error]:', err.message);
  });

  try {
    console.log('[Test] Navigating to:', SERVER_URL);
    await page.goto(SERVER_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Screenshot
    await page.screenshot({ path: 'test-home.png', fullPage: true });
    console.log('[Test] Home page screenshot saved: test-home.png');

    // Check title
    const title = await page.title();
    console.log(`[Test] Page title: "${title}"`);

    // Check for login form
    const emailInput = await page.locator('input[name="email"], input[type="email"], #email').first();
    const passwordInput = await page.locator('input[name="password"], input[type="password"], #password').first();
    const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first();

    console.log('[Test] Email field found:', await emailInput.isVisible());
    console.log('[Test] Password field found:', await passwordInput.isVisible());
    console.log('[Test] Login button found:', await loginButton.isVisible());

    // Check for error messages
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Error') || bodyText.includes('error')) {
      console.log('[Test] Page contains error text');
    }

    // Navigate to a few key pages
    const pages = ['/login', '/dashboard', '/dashboard/pos'];
    for (const p of pages) {
      try {
        console.log(`[Test] Navigating to ${p}...`);
        await page.goto(p, { waitUntil: 'networkidle', timeout: 15000 });
        await page.screenshot({ path: `test-${p.replace(/\//g, '-')}.png`, fullPage: true });
        const pageTitle = await page.title();
        console.log(`[Test] ${p} title: "${pageTitle}"`);
        const url = page.url();
        console.log(`[Test] ${p} final URL: "${url}"`);
      } catch (e) {
        console.log(`[Test] ${p} error:`, e.message);
      }
    }

    console.log('\n[✅] All tests completed!');

  } catch (e) {
    console.error('[Test] Test failed:', e.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    console.log('[Test] Error screenshot saved: test-error.png');
  } finally {
    await browser.close();
  }
}

// Main
(async () => {
  let server = null;
  try {
    server = await startServer();
    // Give server a moment to fully initialize
    console.log('[Test] Waiting for server to fully initialize...');
    await new Promise(r => setTimeout(r, 5000));
    await runTests();
  } catch (e) {
    console.error('[Test] Failed:', e.message);
  } finally {
    if (server) {
      console.log('[Test] Killing server...');
      server.kill();
    }
    process.exit(0);
  }
})();
