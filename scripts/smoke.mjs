// End-to-end smoke test: plays one full in-game day with keyboard input.
// Run: node scripts/smoke.mjs   (requires `npm run build` first; serves dist/ via vite preview)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: false,
});

const errors = [];
let browser;

async function textVisible(page, snippet, timeout = 15000) {
  await page.waitForFunction(
    (s) => document.body.innerText.toUpperCase().includes(s.toUpperCase()),
    snippet,
    { timeout }
  );
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function tap(page, key) {
  await page.keyboard.down(key);
  await wait(140);
  await page.keyboard.up(key);
  await wait(80);
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
  await wait(80);
}

try {
  await wait(1500); // let preview server boot
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });

  // --- title + grade selector ---
  await textVisible(page, 'BLOCKWORLD');
  await textVisible(page, 'GRADE 2'); // default grade
  await tap(page, 'ArrowRight');
  await textVisible(page, 'GRADE 3', 4000);
  await tap(page, 'ArrowLeft');
  await tap(page, 'ArrowLeft');
  await textVisible(page, 'GRADE 1', 4000);
  await tap(page, 'ArrowLeft');
  await textVisible(page, 'GRADE K', 4000); // Kindergarten band
  await tap(page, 'ArrowRight');
  await tap(page, 'ArrowRight'); // back to grade 2 for the rest of the run
  await textVisible(page, 'GRADE 2', 4000);
  console.log('✓ title screen + grade selector (K↔3)');
  await tap(page, 'Enter');

  // --- menu preview ---
  await textVisible(page, "TONIGHT'S MENU");
  console.log('✓ menu preview');
  await tap(page, 'Enter');

  // --- service: 4 orders ---
  for (let order = 0; order < 4; order++) {
    await textVisible(page, 'TAKE THE ORDER');
    await tap(page, 'Enter');

    // word reveal: capture the letters from the reveal tiles
    await page.waitForSelector('.wtile.reveal', { timeout: 8000 });
    const word = await page.evaluate(() =>
      [...document.querySelectorAll('.wtile.reveal')].map((t) => t.textContent).join('')
    );
    if (!/^[A-Z]{3,12}$/.test(word)) throw new Error(`bad word captured: "${word}"`);
    console.log(`✓ order ${order + 1}: word = ${word}`);

    // wait for spell phase, then type the word
    await textVisible(page, 'SPELL IT', 8000);
    await wait(300);
    for (const ch of word) {
      await tap(page, `Key${ch}`);
      await wait(150);
    }

    // knife phase: alternate A (chop) and B (send whole) until served
    await page.waitForFunction(
      () => document.getElementById('three-canvas').classList.contains('active'),
      { timeout: 15000 }
    );
    console.log(`✓ order ${order + 1}: knife phase`);
    const served = await (async () => {
      for (let i = 0; i < 200; i++) {
        const txt = await bodyText(page);
        if (/SERVED!/i.test(txt)) return true;
        if (!/SPELL IT/i.test(txt) === false) break;
        await tap(page, 'Enter');
        await wait(130);
        await tap(page, 'Backspace');
        await wait(130);
        const canvasOff = await page.evaluate(
          () => !document.getElementById('three-canvas').classList.contains('active')
        );
        if (canvasOff) return true; // serving animation finished between polls
      }
      return false;
    })();
    if (!served) throw new Error(`order ${order + 1} never served`);
    console.log(`✓ order ${order + 1}: served`);
  }

  // --- sharpening ---
  await textVisible(page, 'SERVICE IS OVER', 20000);
  console.log('✓ sharpening scene');
  for (let stroke = 0; stroke < 8; stroke++) {
    const dirText = await bodyText(page);
    const key = /hold RIGHT/i.test(dirText) ? 'ArrowRight' : 'ArrowLeft';
    await holdKey(page, key, 1900);
  }
  await textVisible(page, 'RAZOR SHARP', 10000);
  console.log('✓ knife sharpened');
  await wait(3500); // auto-advance

  // --- results ---
  await textVisible(page, 'COMPLETE', 8000);
  console.log('✓ results screen');
  await tap(page, 'Enter');

  // --- word recap ---
  await textVisible(page, "TONIGHT'S WORDS", 8000);
  console.log('✓ word recap screen');
  await tap(page, 'Enter');

  // --- decoration pick ---
  await textVisible(page, 'PICK A BLOCK', 8000);
  console.log('✓ decoration pick');
  await tap(page, 'Enter');

  // --- build + finish day ---
  await textVisible(page, 'PLACE YOUR', 8000);
  await wait(300);
  await tap(page, 'Enter'); // place
  await wait(400);
  await textVisible(page, 'CLOSE UP', 5000);
  await tap(page, 'Enter'); // finish day
  console.log('✓ block placed, day finished');

  // --- back at title, day 2 ---
  await textVisible(page, 'DAY 2', 8000);
  console.log('✓ progressed to day 2, save persisted');

  // --- parent dashboard ---
  await tap(page, 'Tab');
  await textVisible(page, 'PARENT DASHBOARD', 5000);
  const dash = await bodyText(page);
  if (!/Words attempted:\s*[1-9]/i.test(dash)) throw new Error('dashboard stats not recorded');
  console.log('✓ parent dashboard shows recorded stats');

  if (errors.length) {
    console.error('\n✗ runtime errors detected:');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log('\n✅ SMOKE TEST PASSED — full game day played cleanly');
} catch (err) {
  console.error('\n✗ SMOKE TEST FAILED:', err.message);
  if (errors.length) {
    console.error('runtime errors:');
    for (const e of errors) console.error('  ' + e);
  }
  if (browser) {
    try {
      const pages = browser.contexts().flatMap((c) => c.pages());
      if (pages[0]) {
        console.error('--- page text at failure ---');
        console.error((await pages[0].evaluate(() => document.body.innerText)).slice(0, 800));
      }
    } catch { /* ignore */ }
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  preview.kill();
}
