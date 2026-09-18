/**
 * Drives the built app in a phone-sized Chromium and captures each screen.
 * Verifies tap-to-assign, autofill, and that nothing overflows horizontally.
 *
 *   npx vite preview --port 4173 &
 *   node scripts/screenshot.mjs <outDir> [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? './shots';
const base = process.argv[3] ?? 'http://localhost:4173';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, // iPhone 14
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

const ROSTER = [
  ['Maxx B', '1'], ['Anthony D', '7'], ['Will G', '8'], ['Fletcher S', '11'],
  ['Patrick M', ''], ['Liam M', ''], ['Leo B', ''], ['Jack R', '2'],
  ['Andrew C', '13'], ['Ian Y', '13'], ['Sam P', '4'], ['Nate R', '5'],
  ['Owen T', '6'], ['Cole W', '9'], ['Drew H', '10'], ['Evan K', '12'],
  ['Finn L', '14'], ['Gus M', '15'], ['Hank N', '16'], ['Ivan O', '17'],
];

await page.goto(base, { waitUntil: 'networkidle' });

// --- Roster -----------------------------------------------------------------
await page.getByRole('button', { name: 'Roster' }).click();
await page.getByLabel('Team name').fill('2026 WW Fall Ball Minors');
for (const [name, uni] of ROSTER) {
  await page.getByPlaceholder('Player name').fill(name);
  await page.getByLabel('Uniform number').first().fill(uni);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}
await page.screenshot({ path: `${out}/1-roster.png` });

const rosterCount = await page.locator('.roster__row').count();
console.log(`roster rows: ${rosterCount} (expected 20)`);

// At the cap the form locks rather than silently dropping a 21st player.
const inputDisabled = await page.getByPlaceholder('Player name').isDisabled();
const addDisabled = await page
  .getByRole('button', { name: 'Add', exact: true })
  .isDisabled();
console.log(`roster locked at cap: input=${inputDisabled} add=${addDisabled}`);

// --- Create a game ----------------------------------------------------------
await page.getByRole('button', { name: 'Games' }).click();
await page.getByLabel('Game name').fill('vs Sharks');
await page.getByLabel('Game date').fill('2026-09-17');
await page.getByRole('button', { name: 'Create' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/2-lineup-empty.png` });

// --- Tap to assign ----------------------------------------------------------
// Tap a bench player, then tap a position — the fallback path for phones.
await page.locator('.chip').first().click();
await page.waitForTimeout(120);
await page.screenshot({ path: `${out}/3-tap-selected.png` });
await page.locator('.slot', { hasText: 'SS' }).first().click();
await page.waitForTimeout(150);
const ssFilled = await page
  .locator('.slot--filled')
  .filter({ hasText: 'SS' })
  .count();
console.log(`tap-to-assign filled SS: ${ssFilled === 1}`);

// --- Autofill ---------------------------------------------------------------
page.once('dialog', (d) => d.accept());
await page.getByRole('button', { name: 'Auto-fill game' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/4-field-filled.png` });

const filledSlots = await page.locator('.slot--filled').count();
console.log(`filled slots after autofill: ${filledSlots} (expected 9)`);

// --- Fairness panel ---------------------------------------------------------
await page.getByRole('button', { name: /Fair play/ }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/5-fairness.png`, fullPage: true });

// --- Grid view --------------------------------------------------------------
await page.getByRole('button', { name: 'Grid', exact: true }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/6-grid.png` });

// --- Layout check -----------------------------------------------------------
const overflow = await page.evaluate(() => {
  const d = document.documentElement;
  return { scrollW: d.scrollWidth, clientW: d.clientWidth };
});
console.log(
  `horizontal overflow: ${overflow.scrollW > overflow.clientW} (${overflow.scrollW} vs ${overflow.clientW})`,
);

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');

await browser.close();
