import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectNoSeriousA11yViolations(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    blocking,
    JSON.stringify(blocking.map((v) => [v.id, v.nodes.map((n) => n.target.join(' '))])),
  ).toEqual([]);
}

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('filters open in a sheet; applying them returns focus to the Filters button', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByText('10,000 tickets', { exact: true })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await expectNoSeriousA11yViolations(page);

    const toggle = page.getByRole('button', { name: 'Filters' });
    await toggle.click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await expect(sheet).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await sheet.getByRole('checkbox', { name: 'Urgent' }).check();
    await expect(page).toHaveURL(/priority=urgent/);
    await sheet.getByRole('button', { name: 'Show results' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: 'Filters (1)' })).toBeFocused();

    // Every sort stays reachable on narrow screens.
    await page.getByLabel('Sort by').selectOption('-updatedAt');
    await expect(page).toHaveURL(/sort=-updatedAt/);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('list and drawer meet contrast requirements in dark mode', async ({ page }) => {
    await page.goto('/tickets?status=open');
    await expect(page.locator('[role="row"][data-ticket-id]').first()).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await page.goto('/tickets/TCK-000042');
    await expect(page.getByRole('dialog')).toContainText('TCK-000042');
    await expectNoSeriousA11yViolations(page);
  });
});
