import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The preview server runs with CHAOS=off for determinism; tests that need failures select them in the UI
// ("Simulated network"), which sends the x-chaos header.

const grid = (page: Page) => page.getByRole('grid');
const gridBody = (page: Page) => grid(page).getByRole('rowgroup').nth(1);
const ticketRows = (page: Page) => grid(page).locator('[role="row"][data-ticket-id]');

async function expectNoSeriousA11yViolations(page: Page) {
  // Scan the settled UI: mid-animation (e.g. the drawer fading in) text is briefly low-contrast.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, JSON.stringify(blocking.map((v) => [v.id, v.nodes.length]))).toEqual([]);
}

test('T8: filters, sort, scroll position and open ticket survive reload, and Back/Forward walk history', async ({
  page,
}) => {
  await page.goto('/tickets');
  await expect(page.getByText('10,000 tickets')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Open' }).check();
  await page.getByRole('button', { name: 'Priority' }).click();
  await expect(page).toHaveURL(/status=open/);
  await expect(page).toHaveURL(/sort=-priority/);

  // Scroll deep into the list; the anchor row is written to the URL once scrolling pauses.
  await gridBody(page).evaluate((el) => (el.scrollTop = 1500 * 56));
  await expect(page).toHaveURL(/row=1500/);

  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Open' })).toBeChecked();
  await expect(page.getByRole('columnheader', { name: /Priority/ })).toHaveAttribute(
    'aria-sort',
    'descending',
  );
  await expect(grid(page).locator('[aria-rowindex="1502"]')).toBeVisible();
  expect(await gridBody(page).evaluate((el) => el.scrollTop)).toBe(1500 * 56);

  // Open a ticket, reload the deep link, close it: same list, same position.
  const row = ticketRows(page)
    .filter({ has: page.locator(':scope') })
    .nth(3);
  const ticketId = await row.getAttribute('data-ticket-id');
  await row.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}\\?`));
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText(ticketId ?? '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/tickets\?.*row=1500/);
  expect(await gridBody(page).evaluate((el) => el.scrollTop)).toBe(1500 * 56);

  // History: Back removes the sort, Back again removes the filter; Forward restores.
  await page.goBack();
  await expect(page).not.toHaveURL(/sort=/);
  await page.goBack();
  await expect(page.getByText('10,000 tickets')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Open' })).not.toBeChecked();
  await page.goForward();
  await expect(page.getByRole('checkbox', { name: 'Open' })).toBeChecked();
});

test('T9: keyboard-only search, grid navigation, open and close a ticket', async ({ page, browserName }) => {
  await page.goto('/tickets');
  await expect(page.getByText('10,000 tickets')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search tickets' }).focus();
  await page.keyboard.type('refund');
  await expect(page).toHaveURL(/q=refund/);
  await expect(ticketRows(page).first()).toContainText(/refund/i);

  // One tab stop in the grid: focus the active row, move with arrows, open with Enter.
  const tabStop = grid(page).locator('[role="row"][tabindex="0"]');
  await expect(tabStop).toHaveCount(1);
  await tabStop.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const focused = page.locator('[role="row"]:focus');
  await expect(focused).toHaveAttribute('aria-rowindex', '4');
  const ticketId = await focused.getAttribute('data-ticket-id');

  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Modal: focus starts inside, and Tab never reaches the page behind it. (A native modal <dialog> may let
  // focus leave to the browser's own UI after its last control — that is not the page.)
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const focusInBackground = await dialog.evaluate((el) => {
      const active = document.activeElement;
      return !!active && active !== document.body && !el.contains(active);
    });
    expect(focusInBackground).toBe(false);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('[role="row"]:focus')).toHaveAttribute('data-ticket-id', ticketId ?? '');

  await page.keyboard.press('End');
  await expect(page.locator('[role="row"]:focus')).toHaveAttribute(
    'aria-rowindex',
    String(Number(await grid(page).getAttribute('aria-rowcount'))),
  );
});

test('error state, retry, and partial failure are honest and accessible', async ({ page }) => {
  await page.goto('/tickets');
  await expect(page.getByText('10,000 tickets')).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await page.getByLabel('Simulated network').selectOption('fail');
  await page.getByRole('checkbox', { name: 'Pending' }).check();
  await expect(page.getByText('Couldn’t load tickets', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(grid(page)).toHaveCount(0); // no stale rows left on screen
  await expect(page.getByRole('alert').filter({ hasText: 'Couldn’t load tickets' })).toHaveCount(1);
  await expectNoSeriousA11yViolations(page);

  await page.getByLabel('Simulated network').selectOption('off');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(ticketRows(page).first()).toContainText('Pending');

  // Partial failure: fail new requests, then scroll to rows that are not loaded yet.
  await page.getByLabel('Simulated network').selectOption('fail');
  await gridBody(page).evaluate((el) => (el.scrollTop = 700 * 56));
  await expect(page.getByText('Some rows couldn’t be loaded', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expectNoSeriousA11yViolations(page);
  await page.getByLabel('Simulated network').selectOption('off');
  await page.getByRole('button', { name: 'Retry failed rows' }).click();
  await expect(page.getByText('Some rows couldn’t be loaded', { exact: true })).toBeHidden({
    timeout: 15_000,
  });
});

test('empty state and drawer have no serious accessibility violations', async ({ page }) => {
  await page.goto('/tickets?q=definitely-not-a-ticket');
  await expect(page.getByText('No tickets match')).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await page.goto('/tickets/TCK-000042');
  await expect(page.getByRole('dialog')).toContainText('TCK-000042');
  await expectNoSeriousA11yViolations(page);
});
