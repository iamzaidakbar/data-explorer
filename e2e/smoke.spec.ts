import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('app loads at /tickets with no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Support tickets' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking).toEqual([]);
});

test('skip link appears on first Tab and moves focus to main content', async ({ page, browserName }) => {
  await page.goto('/tickets');
  // Safari/WebKit skips links on plain Tab by default; its keyboard users reach links with Option+Tab.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(/\/tickets$/);
});

test('deep links to client routes are served by the SPA fallback', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
