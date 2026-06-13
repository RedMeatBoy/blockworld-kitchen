// Capture screenshots of key scenes for visual review.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4174;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });

const tap = async (page, key) => { await page.keyboard.down(key); await wait(140); await page.keyboard.up(key); await wait(100); };

let browser;
try {
  await wait(1500);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await wait(800);
  await page.screenshot({ path: 'shots/1-title.png' });

  await tap(page, 'Enter');
  await wait(600);
  await page.screenshot({ path: 'shots/10-engine.png' }); // engine check-in
  await tap(page, 'Enter'); // "just right"
  await wait(3200);         // chef's reply, then menu
  await page.screenshot({ path: 'shots/2-menu.png' });

  await tap(page, 'Enter');
  await wait(800);
  await page.screenshot({ path: 'shots/3-ticket.png' });

  await tap(page, 'Enter'); // take order → reveal
  await wait(1000);
  await page.screenshot({ path: 'shots/4-reveal.png' });

  await wait(2600); // spell phase
  const word = await page.evaluate(() => document.body.innerText.match(/SPELL IT FOR THE TICKET: (.+)/)?.[1] ?? '');
  await page.screenshot({ path: 'shots/5-spelling.png' });

  // spell the word via keyboard
  const target = await page.evaluate(() =>
    [...document.querySelectorAll('.wtile')].length
  );
  // grab the actual word from save-side: re-derive by typing from menu is complex; use glance (Digit2)
  await tap(page, 'Digit2');
  await wait(300);
  const letters = await page.evaluate(() =>
    [...document.querySelectorAll('.wtile.reveal')].map((t) => t.textContent).join('')
  );
  await wait(1800);
  await page.screenshot({ path: 'shots/8-spell-think.png' });
  for (const ch of letters) { await tap(page, `Key${ch}`); await wait(120); }
  await wait(700);
  await page.screenshot({ path: 'shots/9-spell-fistpump.png' });
  await wait(1800); // praise + transition to knife
  await page.screenshot({ path: 'shots/6-knife.png' });
  await wait(1500);
  await page.screenshot({ path: 'shots/7-knife-b.png' });
  console.log('screenshots saved to shots/');
} catch (e) {
  console.error('screenshot run failed:', e.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  preview.kill();
}
