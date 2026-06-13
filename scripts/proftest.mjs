// Profile-isolation test: three save slots keep independent progress.
// Run: node scripts/proftest.mjs   (requires `npm run build` first)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4177;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const preview = spawn('npx', ['vite','preview','--port',String(PORT),'--strictPort'], { stdio:'ignore' });
let browser;
try {
  await wait(1500);
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil:'load' });
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    const base = 'blockworld-kitchen-save-v1';
    localStorage.setItem(base+'-p0', JSON.stringify({ name:'ERIC', day:5, trust:300, avatar:'m', grade:2, stats:{bestStreak:4} }));
    localStorage.setItem(base+'-p1', JSON.stringify({ name:'EVA', day:2, trust:40, avatar:'f', grade:0, stats:{bestStreak:2} }));
    localStorage.setItem(base+'-active', '1');
  });
  await page.reload({ waitUntil:'load' });
  await wait(700);
  const txt = await page.evaluate(() => document.body.innerText);
  if (!(/ERIC/.test(txt) && /Day 5/.test(txt) && /Trust 300/.test(txt))) throw new Error('profile 0 (ERIC) summary wrong');
  if (!(/EVA/.test(txt) && /Day 2/.test(txt))) throw new Error('profile 1 (EVA) summary wrong');
  if (!(/CHEF THREE/.test(txt) && /NEW CHEF/.test(txt))) throw new Error('slot 3 should be empty NEW CHEF');
  console.log('✓ three slots show independent name/day/trust summaries');
  console.log('✓ empty slot 3 shows as NEW CHEF');

  // legacy-migration check: a pre-profiles save should appear as slot 0
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('blockworld-kitchen-save-v1', JSON.stringify({ day:9, trust:777, avatar:'f', grade:3, stats:{bestStreak:6} }));
  });
  await page.reload({ waitUntil:'load' });
  await wait(700);
  const txt2 = await page.evaluate(() => document.body.innerText);
  if (!(/Day 9/.test(txt2) && /Trust 777/.test(txt2))) throw new Error('legacy save not migrated into slot 0');
  const leftover = await page.evaluate(() => localStorage.getItem('blockworld-kitchen-save-v1'));
  if (leftover) throw new Error('legacy key not cleaned up after migration');
  console.log('✓ legacy single-save migrates into slot 0 and is cleaned up');
  console.log('\n✅ PROFILE TEST PASSED — three isolated save slots + migration');
} catch (e) {
  console.error('✗ PROFILE TEST FAILED:', e.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  preview.kill();
}
