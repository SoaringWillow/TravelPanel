/**
 * App Store screenshot automation for TravelPanel.
 * Generates 5 required screenshots at iPhone 15 Pro Max (430×932 pt → 1290×2796 @3x) resolution.
 *
 * Run:
 *   npx ts-node --esm scripts/screenshots.ts
 *   OR (compile first):
 *   npx tsc scripts/screenshots.ts --module esnext --outDir .cache && node .cache/scripts/screenshots.js
 *
 * Requires a running dev server: npm run dev
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.SCREENSHOT_URL ?? 'http://localhost:3000';
const OUT_DIR  = path.join(__dirname, '../public/screenshots');

// iPhone 15 Pro Max logical resolution at 3× scale
const IPHONE_WIDTH  = 430;
const IPHONE_HEIGHT = 932;
const DEVICE_SCALE  = 3;

// ── Seed data injected into localStorage / IndexedDB via page.evaluate ─────

const SEED_SCRIPT = `
(async () => {
  // Mark onboarding as seen so we land on the map
  localStorage.setItem('hasSeenOnboarding2', '1');

  // Open IndexedDB and seed items + boards
  const { openDB } = await import('https://cdn.skypack.dev/idb@8');
  const db = await openDB('travelpanel-db', 2);

  const items = [
    {
      id: 'seed-1', url: 'https://example.com/1', title: 'Tsukiji Outer Market',
      platform: 'instagram', description: 'Fresh sushi at dawn, worth the early wake-up.',
      thumbnail: null, locations: [{ lat: 35.6654, lng: 139.7707, name: 'Tsukiji, Tokyo' }],
      activities: [], tags: ['food'], substance: [{ type: 'tip', content: 'Go before 8am', applies_to: 'timing' }],
      savedAt: Date.now(), enrichmentStatus: 'done', retryCount: 0, boardId: 'board-1',
    },
    {
      id: 'seed-2', url: 'https://example.com/2', title: 'Senso-ji Temple',
      platform: 'xiaohongshu', description: 'Most visited spiritual site in Japan.',
      thumbnail: null, locations: [{ lat: 35.7148, lng: 139.7967, name: 'Asakusa, Tokyo' }],
      activities: [], tags: ['culture'], substance: [],
      savedAt: Date.now() - 1000, enrichmentStatus: 'done', retryCount: 0, boardId: 'board-1',
    },
    {
      id: 'seed-3', url: 'https://example.com/3', title: 'Harajuku Takeshita Street',
      platform: 'youtube', description: 'Crepes and fashion, Tokyo-style.',
      thumbnail: null, locations: [{ lat: 35.6716, lng: 139.7026, name: 'Harajuku, Tokyo' }],
      activities: [], tags: ['shopping'], substance: [],
      savedAt: Date.now() - 2000, enrichmentStatus: 'done', retryCount: 0, boardId: 'board-1',
    },
    {
      id: 'seed-4', url: 'https://example.com/4', title: 'Shinjuku Golden Gai',
      platform: 'wechat', description: 'Tiny bars, big atmosphere.',
      thumbnail: null, locations: [{ lat: 35.6940, lng: 139.7025, name: 'Shinjuku, Tokyo' }],
      activities: [], tags: ['city'], substance: [{ type: 'warning', content: 'Very small spaces, not for claustrophobics' }],
      savedAt: Date.now() - 3000, enrichmentStatus: 'done', retryCount: 0, boardId: 'board-1',
    },
    {
      id: 'seed-5', url: 'https://example.com/5', title: 'Yoyogi Park Picnic',
      platform: 'instagram', description: 'Cherry blossoms in spring, amazing crowds.',
      thumbnail: null, locations: [{ lat: 35.6716, lng: 139.6944, name: 'Yoyogi Park, Tokyo' }],
      activities: [], tags: ['nature'], substance: [],
      savedAt: Date.now() - 4000, enrichmentStatus: 'done', retryCount: 0, boardId: null,
    },
  ];

  const boards = [
    {
      id: 'board-1', name: 'Tokyo Highlights', emoji: '🗼',
      itemIds: ['seed-1','seed-2','seed-3','seed-4'],
      coverThumbnail: null, createdAt: Date.now(),
    },
  ];

  const tx = db.transaction(['items', 'boards'], 'readwrite');
  for (const item of items) await tx.objectStore('items').put(item);
  for (const board of boards) await tx.objectStore('boards').put(board);
  await tx.done;
})();
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function seedPage(page: Page): Promise<void> {
  // Set onboarding flag via localStorage before page navigation to avoid redirect
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenOnboarding2', '1');
  });
}

async function waitForMap(page: Page): Promise<void> {
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

// ── Screenshot tasks ───────────────────────────────────────────────────────────

type Task = {
  name: string;
  fn: (page: Page) => Promise<void>;
};

const TASKS: Task[] = [
  {
    name: '01-map-pins',
    async fn(page) {
      await page.goto(`${BASE_URL}/?`, { waitUntil: 'networkidle' });
      await waitForMap(page);
      await page.screenshot({ path: `${OUT_DIR}/01-map-pins.png`, fullPage: false });
    },
  },
  {
    name: '02-import-sheet',
    async fn(page) {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForMap(page);
      // Open import sheet
      const fab = page.locator('button[aria-label="Clip inspiration"]');
      await fab.click();
      await page.waitForTimeout(600);
      // Pre-fill a URL
      const input = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]').first();
      if (await input.isVisible()) {
        await input.fill('https://www.xiaohongshu.com/explore/67a1bc1300000000');
      }
      await page.screenshot({ path: `${OUT_DIR}/02-import-sheet.png`, fullPage: false });
    },
  },
  {
    name: '03-inbox-cards',
    async fn(page) {
      await page.goto(`${BASE_URL}/inbox`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${OUT_DIR}/03-inbox-cards.png`, fullPage: false });
    },
  },
  {
    name: '04-boards',
    async fn(page) {
      await page.goto(`${BASE_URL}/boards`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT_DIR}/04-boards.png`, fullPage: false });
    },
  },
  {
    name: '05-plan-day-card',
    async fn(page) {
      await page.goto(`${BASE_URL}/plan/board-1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${OUT_DIR}/05-plan-day-card.png`, fullPage: false });
    },
  },
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: IPHONE_WIDTH, height: IPHONE_HEIGHT },
    deviceScaleFactor: DEVICE_SCALE,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // Seed onboarding flag for all pages
  await context.addInitScript(() => {
    localStorage.setItem('hasSeenOnboarding2', '1');
  });

  const page = await context.newPage();

  // First, navigate and seed IndexedDB
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Seed via console
  try {
    await page.evaluate(SEED_SCRIPT);
    await page.waitForTimeout(500);
  } catch (e) {
    console.warn('Seed script failed (non-fatal):', e);
  }

  for (const task of TASKS) {
    console.log(`📸 Capturing ${task.name}…`);
    try {
      await task.fn(page);
      console.log(`  ✓ ${OUT_DIR}/${task.name}.png`);
    } catch (err) {
      console.error(`  ✗ ${task.name} failed:`, err);
    }
  }

  await browser.close();
  console.log(`\nDone. Screenshots saved to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
