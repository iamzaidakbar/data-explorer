import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Real browser offline mode (DevTools "Offline"): fires the window offline/online events and fails network requests.

const gridBody = (page: Page) => page.getByRole('grid').getByRole('rowgroup').nth(1);

test('going offline keeps loaded rows, explains itself, and recovers automatically', async ({
  page,
  context,
}) => {
  await page.goto('/tickets');
  await expect(page.getByText('10,000 tickets', { exact: true })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText('You’re offline.', { exact: true })).toBeVisible();
  await expect(page.locator('[role="row"][data-ticket-id]').first()).toBeVisible(); // loaded rows stay

  // Scroll into rows that were never fetched: they wait instead of spinning or failing.
  await gridBody(page).evaluate((el) => (el.scrollTop = 3000 * 56));
  await expect(page.getByText(/waiting for connection/).first()).toBeVisible();

  // A new search while offline: honest offline state, no stale rows.
  await page.getByRole('searchbox', { name: 'Search tickets' }).fill('refund');
  await expect(page.getByText('You’re offline', { exact: true })).toBeVisible();
  await expect(page.getByRole('grid')).toHaveCount(0);

  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);

  await context.setOffline(false);
  await expect(page.getByText('Back online')).toBeVisible();
  await expect(page.locator('[role="row"][data-ticket-id]').first()).toContainText(/refund/i);
  await expect(page.getByText('You’re offline.', { exact: true })).toBeHidden();
});
