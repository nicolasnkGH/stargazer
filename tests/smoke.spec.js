// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('StarGazer UI Smoke Tests', () => {

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

    const criticalIds = [
      '#card-motion',
      '#card-targets',
      '#scheduler-list-container',
      '#scheduler-empty-state',
      '#scheduler-timeline-bar',
    ];

    for (const id of criticalIds) {
      const el = page.locator(id);
      await expect(el).toBeAttached({ timeout: 5000 });
      console.log(`✅ ${id} found in DOM`);
    }
  });

  test('Plan My Night section is functional', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // The ISS Pass quick-add button should be present
    const issBtn = page.getByText('+ ISS Pass');
    await expect(issBtn).toBeVisible({ timeout: 5000 });
  });

  test('Sky Objects in Motion tabs exist', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const tabs = ['ISS Passes', 'Near-Earth Objects', 'Comets', 'Meteor Showers'];
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
