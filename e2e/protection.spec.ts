import { test, expect } from '@playwright/test';

const PROTECTED_PATH = '/admin';
const E2E_PASSWORD = 'e2etest';

test.describe('passfort protection', () => {
  test('unauthenticated request to protected route returns 401 and password form', async ({
    page,
  }) => {
    const res = await page.goto(PROTECTED_PATH, {
      waitUntil: 'commit',
      timeout: 30_000,
    });
    expect(res?.status()).toBe(401);

    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
  });

  test('wrong password shows error and stays on form', async ({ page }) => {
    await page.goto(PROTECTED_PATH, { timeout: 30_000 });
    await page.locator('input[name="password"]').fill('wrong');
    await page.locator('form >> button[type="submit"]').click();

    await expect(page.locator('text=Incorrect password')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    expect(page.url()).toContain(PROTECTED_PATH);
  });

  test('correct password sets cookie and grants access', async ({ page }) => {
    await page.goto(PROTECTED_PATH, { timeout: 30_000 });
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.locator('form >> button[type="submit"]').click();

    await expect(page).toHaveURL(new RegExp(`${PROTECTED_PATH}$`));
    await expect(page.locator('h1:has-text("Admin")')).toBeVisible();
    await expect(
      page.locator(
        'text=You got here because you entered the correct password!'
      )
    ).toBeVisible();
  });

  test('authenticated request (with cookie) returns 200 without form', async ({
    page,
  }) => {
    await page.goto(PROTECTED_PATH, { timeout: 30_000 });
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.locator('form >> button[type="submit"]').click();
    await expect(page.locator('h1:has-text("Admin")')).toBeVisible({ timeout: 15_000 });

    const res = await page.goto(PROTECTED_PATH, {
      waitUntil: 'commit',
      timeout: 30_000,
    });
    expect(res?.status()).toBe(200);
    await expect(page.locator('input[name="password"]')).not.toBeVisible();
    await expect(page.locator('h1:has-text("Admin")')).toBeVisible();
  });
});
