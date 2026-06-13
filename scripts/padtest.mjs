// Gamepad simulation test: injects fake controllers in BOTH the W3C standard
// layout and the non-standard Bluetooth layout (X=3, d-pad as a hat on
// axes[9]) and drives the title screen with them. This is the path the
// keyboard smoke test never exercises.
// Run: node scripts/padtest.mjs   (requires `npm run build` first)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4175;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });

const errors = [];
let browser;

async function textVisible(page, snippet, timeout = 8000) {
  await page.waitForFunction(
    (s) => document.body.innerText.toUpperCase().includes(s.toUpperCase()),
    snippet,
    { timeout }
  );
}

async function injectPad(page, { mapping }) {
  await page.evaluate((m) => {
    const mkBtn = () => ({ pressed: false, touched: false, value: 0 });
    window.__pad = {
      id: m === 'standard' ? 'Fake Xbox USB' : 'Fake Xbox Bluetooth',
      index: 0,
      connected: true,
      mapping: m,
      timestamp: 0,
      buttons: Array.from({ length: 17 }, mkBtn),
      axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857142857142858], // hat idle
    };
    navigator.getGamepads = () => [window.__pad];
  }, mapping);
}

async function padPress(page, idx) {
  await page.evaluate((i) => {
    window.__pad.buttons[i] = { pressed: true, touched: true, value: 1 };
  }, idx);
  await wait(160);
  await page.evaluate((i) => {
    window.__pad.buttons[i] = { pressed: false, touched: false, value: 0 };
  }, idx);
  await wait(120);
}

async function padHat(page, value) {
  await page.evaluate((v) => { window.__pad.axes[9] = v; }, value);
  await wait(160);
  await page.evaluate(() => { window.__pad.axes[9] = 1.2857142857142858; });
  await wait(120);
}

async function freshTitle(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await textVisible(page, 'BLOCKWORLD');
}

try {
  await wait(1500);
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  // ---------- standard (USB) layout ----------
  await freshTitle(page);
  await injectPad(page, { mapping: 'standard' });
  await wait(300);

  await padPress(page, 15); // dpad right
  await textVisible(page, 'GRADE 3');
  console.log('✓ standard: d-pad button changes grade');

  await padPress(page, 2); // X
  await textVisible(page, 'CHEF MAYA');
  console.log('✓ standard: X button switches chef');

  await padPress(page, 0); // A → engine check-in
  await textVisible(page, 'ENGINE RUNNING');
  await padPress(page, 0); // A → confirm "just right"
  await textVisible(page, "TONIGHT'S MENU", 10000);
  console.log('✓ standard: A button starts the shift (via engine check-in)');

  // ---------- non-standard (Bluetooth) layout ----------
  await freshTitle(page);
  await injectPad(page, { mapping: '' });
  await wait(300);

  await padHat(page, -0.42857142857142855); // hat → right
  await textVisible(page, 'GRADE 3');
  console.log('✓ bluetooth: hat-axis d-pad changes grade');

  await padPress(page, 3); // X in the BT layout
  await textVisible(page, 'CHEF MAYA');
  console.log('✓ bluetooth: X button (index 3) switches chef');

  await padPress(page, 0); // A → engine check-in
  await textVisible(page, 'ENGINE RUNNING');
  await padPress(page, 0); // A → confirm "just right"
  await textVisible(page, "TONIGHT'S MENU", 10000);
  console.log('✓ bluetooth: A button starts the shift (via engine check-in)');

  // compat-mode indicator
  const status = await page.evaluate(() => document.querySelector('.controller-status')?.textContent || '');
  if (!/compat/i.test(status)) throw new Error(`expected compat-mode indicator, saw: "${status}"`);
  console.log('✓ bluetooth: compat-mode indicator shown');

  if (errors.length) {
    console.error('\n✗ runtime errors:');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log('\n✅ GAMEPAD TEST PASSED — standard and bluetooth layouts both work');
} catch (err) {
  console.error('\n✗ GAMEPAD TEST FAILED:', err.message);
  if (errors.length) for (const e of errors) console.error('  ' + e);
  if (browser) {
    try {
      const pages = browser.contexts().flatMap((c) => c.pages());
      if (pages[0]) {
        console.error('--- page text at failure ---');
        console.error((await pages[0].evaluate(() => document.body.innerText)).slice(0, 500));
      }
    } catch { /* ignore */ }
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  preview.kill();
}
