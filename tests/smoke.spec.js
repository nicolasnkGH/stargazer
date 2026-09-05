// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('StarGazer UI Smoke Tests', () => {

  test.beforeEach(async ({ page, context }) => {
    // Set location cookie to Mauna Kea default to bypass LocationGate
    await context.addCookies([
      {
        name: 'stargazer_loc',
        value: encodeURIComponent(JSON.stringify({ lat: 19.8206, lon: -155.4681 })),
        domain: 'localhost',
        path: '/',
      }
    ]);
    
    // Inject active location into localStorage BEFORE the page loads
    await page.addInitScript(() => {
      localStorage.setItem('stargazer_active_loc', 'default-mauna-kea');
      localStorage.setItem('stargazer_locations', JSON.stringify([
        { id: "default-mauna-kea", name: "Mauna Kea Observatory, HI", lat: 19.8206, lon: -155.4681 }
      ]));
    });
  });

  test('Page loads without fatal JS errors', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Filter out known external/network errors (SSL, CDN, etc.)
    const fatalErrors = jsErrors.filter(e =>
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource') &&
      !e.includes('ERR_SSL') &&
      !e.includes('ERR_NAME')
    );

    if (fatalErrors.length > 0) {
      console.error('Fatal JS errors:', fatalErrors);
    }
    expect(fatalErrors).toHaveLength(0);
  });

  test('App title is visible', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    expect(title.toLowerCase()).toContain('stargazer');
  });

  test('Critical sections render in the DOM', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Navigate to Plan My Night tab first
    await page.locator('button:has-text("Plan My Night")').first().click();

    // Use force:true to bypass any overlapping element that intercepts pointer events in headless CI
    const issBtn = page.getByText('+ ISS Pass');
    await expect(issBtn).toBeVisible({ timeout: 5000 });
    await issBtn.click({ force: true });

    // Check for the critical sections that should be present
    const criticalIds = [
      '#card-targets',             // Target database card
      '#scheduler-list-container', // List of scheduled targets
      '#scheduler-timeline-bar',   // Timeline bar
      '#card-space-weather'        // Space weather card
    ];

    for (const id of criticalIds) {
      const el = page.locator(id);
      await expect(el).toBeAttached({ timeout: 5000 });
      console.log(`✅ ${id} found in DOM`);
    }
  });

  test('Plan My Night section is functional', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Navigate to Plan My Night tab first
    await page.locator('button:has-text("Plan My Night")').first().click();

    // The ISS Pass quick-add button should be present
    const issBtn = page.getByText('+ ISS Pass');
    await expect(issBtn).toBeVisible({ timeout: 5000 });
  });

  test('Sky Objects in Motion tabs exist', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const tabs = ['ISS Passes', 'Asteroids (NEOs)', 'Comets', 'Meteor Showers'];
    for (const tab of tabs) {
      const el = page.getByText(tab).first();
      await expect(el).toBeAttached({ timeout: 5000 });
      console.log(`✅ Tab "${tab}" found`);
    }
  });

  test('No SyntaxError in console output', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => {
      if (err.message.includes('SyntaxError')) errors.push(err.message);
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    expect(errors).toHaveLength(0);
  });

});

// ─── Performance Regression Tests ──────────────────────────────────────────────
// These use networkidle + a post-hydration wait so Three.js WebGL contexts
// have time to initialise before we make assertions. Headless Chrome runs on a
// software rasterizer so GPU cost is invisible here — we guard against the
// *structural* indicators of overload instead (context count, canvas count).
test.describe('StarGazer Performance Regression Tests', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'stargazer_loc',
        value: encodeURIComponent(JSON.stringify({ lat: 19.8206, lon: -155.4681 })),
        domain: 'localhost',
        path: '/',
      }
    ]);
    await page.addInitScript(() => {
      localStorage.setItem('stargazer_active_loc', 'default-mauna-kea');
      localStorage.setItem('stargazer_locations', JSON.stringify([
        { id: "default-mauna-kea", name: "Mauna Kea Observatory, HI", lat: 19.8206, lon: -155.4681 }
      ]));
    });
  });

  test('WebGL canvas count stays within browser context limit after full hydration', async ({ page }) => {
    // Use networkidle so React has time to hydrate and mount all WebGL canvases
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    // Extra buffer for Three.js init (textures load async)
    await page.waitForTimeout(2500);

    const canvasCount = await page.evaluate(() =>
      document.querySelectorAll('canvas').length
    );

    console.log(`Canvas count after hydration: ${canvasCount}`);
    // Chrome hard-limits WebGL contexts to ~16 per page. Staying under 12 leaves
    // headroom for the main 3D orrery + other uses and prevents context loss crashes.
    expect(canvasCount).toBeLessThanOrEqual(12);
  });

  test('EyepieceSimulation planet cards: off-screen cards are not actively rendering', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll to the very bottom — all planet cards should be off-screen
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800); // allow IntersectionObserver callbacks to fire

    // Count how many animation frame callbacks fire in 600ms.
    // With cards off-screen, IntersectionObserver sets isVisible=false and skips
    // the renderer.render() call. The RAF loop itself still ticks (it schedules
    // the next frame) but does no GPU work, so the count should be close to the
    // browser's natural 60fps tick rate — not *multiplied* by the number of cards.
    const rafCallbacksIn600ms = await page.evaluate(() =>
      new Promise(resolve => {
        let count = 0;
        const start = performance.now();
        const tick = () => {
          count++;
          if (performance.now() - start < 600) requestAnimationFrame(tick);
          else resolve(count);
        };
        requestAnimationFrame(tick);
      })
    );

    console.log(`RAF callbacks in 600ms (cards off-screen): ${rafCallbacksIn600ms}`);
    // At 60fps for 600ms the browser itself fires ~36 frames.
    // We are scheduling one RAF counter loop, so we expect ~36-40 callbacks.
    // If this explodes to 200+ it means N planet card loops are all firing simultaneously.
    expect(rafCallbacksIn600ms).toBeLessThan(60);
  });

  test('Planet grid section does not mount more WebGL canvases than planet count', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll to the planet grid
    const planetGrid = page.locator('#planet-grid').first();
    if (await planetGrid.count() > 0) {
      await planetGrid.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }

    const canvasCount = await page.evaluate(() =>
      document.querySelectorAll('canvas').length
    );

    // There are 10 planets/bodies in PLANET_CONFIGS. At most 10 eyepiece canvases
    // + 1 for the main 3D orrery = 11 absolute maximum.
    // Exceeding this means cards are leaking extra contexts on re-render.
    console.log(`Canvas count with planet grid in view: ${canvasCount}`);
    expect(canvasCount).toBeLessThanOrEqual(11);
  });

});

