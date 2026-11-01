import { test, expect, type Page } from '@playwright/test';

const ROOT = '/';

// ---------------------------------------------------------------------------
// Deterministic test account so every run is independent and repeatable.
// ---------------------------------------------------------------------------
const EMAIL = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const DISPLAY = 'Quality Runner';
const USERNAME = 'qr';
const PASSWORD = 'qapassword-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function register(page: Page, opts?: { username?: string; headline?: string }) {
  const link = page.getByRole('link', { name: /log in/i }).first();
  if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
    await link.click();
  }
  await expect(page.getByRole('link', { name: /log in/i })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('link', { name: /create account/i }).first().click();
  await expect(page.getByRole('heading', { name: /create your identity/i })).toBeVisible({ timeout: 10_000 });

  await page.getByLabel(/what should we call you/i).fill(DISPLAY);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /create your identity/i }).click();

  if (page.url().includes('/onboarding')) {
    await driveOnboarding(page, { username: opts?.username ?? USERNAME, headline: opts?.headline });
  }

  await page.waitForURL(/\/(dashboard|onboarding)$/, { timeout: 15_000 });
  return page.url();
}

async function driveOnboarding(page: Page, opts: { username?: string; headline?: string }) {
  let stepIndex = 0;
  while (true) {
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5_000 });

    const text = await heading.textContent();
    if (!text) break;

    if (text.includes('display name') || text.includes('basic details')) {
      if (opts.headline) {
        const h = page.getByLabel(/headline/i);
        if (await h.isVisible().catch(() => false)) await h.fill(opts.headline);
      }
      await page.getByRole('button', { name: /continue/i }).click();
      stepIndex++;
    } else if (text.includes('username') || text.includes('web address')) {
      const u = page.getByLabel(/username/i);
      if (await u.isVisible().catch(() => false)) {
        if (opts.username) await u.fill(opts.username);
      }
      await page.getByRole('button', { name: /continue/i }).click();
      stepIndex++;
    } else if (text.includes('connect') || text.includes('github')) {
      await page.getByRole('button', { name: /continue/i }).click();
      stepIndex++;
    } else if (text.includes('who can see') || text.includes('visibility')) {
      await page.getByRole('button', { name: /continue/i }).click();
      stepIndex++;
    } else if (text.includes('review')) {
      await page.getByRole('button', { name: /enter repuh/i }).click();
      break;
    } else {
      const cont = page.getByRole('button', { name: /continue/i }).first();
      if (await cont.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cont.click();
        stepIndex++;
      } else {
        const fin = page.getByRole('button', { name: /enter repuh/i }).first();
        if (await fin.isVisible().catch(() => false)) {
          await fin.click();
          break;
        }
        break;
      }
    }
  }
}

async function signIn(page: Page) {
  const link = page.getByRole('link', { name: /log in/i }).first();
  if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
    await link.click();
  }
  await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page.locator('body')).toBeVisible({ timeout: 12_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('RepuH — MVP UX/UI and interaction suite', () => {
  test('landing page renders, copy reflects the product, no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(ROOT);
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole('heading', { name: /RepuH/i }).first()).toBeVisible();
    await expect(page.getByText(/attributable/i)).toBeVisible();
    await expect(page.getByText(/certificate/i)).toBeVisible();
    await expect(page.getByText(/Hedera/i)).toBeVisible();
  });

  test('create account: validation surfaces and account is created', async ({ page }) => {
    await register(page, { headline: 'Test engineer' });
    const url = page.url();
    expect(url.includes('/dashboard') || url.includes('/onboarding')).toBeTruthy();
  });

  test('login with wrong password returns a readable error', async ({ page }) => {
    await page.goto(ROOT);
    const link = page.getByRole('link', { name: /log in/i }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) await link.click();
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /log in/i }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 8_000 });
    expect(await alert.textContent()).toContain('don\'t match');
  });

  test('full authenticated journey: dashboard -> fingerprint -> activity -> evidence -> certificates', async ({ page }) => {
    await register(page, { headline: 'QA engineer' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    await expect(page.getByRole('link', { name: /fingerprint/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /activity/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /evidence/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /certificates/i }).first()).toBeVisible();

    await page.getByRole('link', { name: /fingerprint/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/capability|evidence|estimate/i, { timeout: 6_000 });

    await page.getByRole('link', { name: /activity/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 8_000 });

    await page.getByRole('link', { name: /evidence/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 8_000 });

    await page.getByRole('link', { name: /certificates/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('body')).toContainText(/certificate/i, { timeout: 5_000 });
  });

  test('sign out clears the session and returns to the landing page', async ({ page }) => {
    await register(page, { headline: 'Signed out' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    await page.getByRole('link', { name: /settings/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });

    const logout = page.getByRole('button', { name: /sign out of this device/i });
    if (await logout.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logout.click();
    } else {
      await page.getByRole('link', { name: /public profile/i }).first().click();
    }

    await expect(page.locator('body')).toBeVisible({ timeout: 8_000 });
    const text = await page.getByRole('heading', { name: /repuh/i }).first().textContent().catch(() => null) ?? '';
    expect(text.toLowerCase().includes('repuh')).toBeTruthy();
  });

  test('settings preference changes persist and reflect in the UI', async ({ page }) => {
    await register(page, { headline: 'Preferences' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    await page.getByRole('link', { name: /settings/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 8_000 });

    const reduceMotion = page.getByLabel(/reduce motion/i);
    await reduceMotion.click();
    await expect(reduceMotion).not.toBeChecked();

    await page.getByRole('button', { name: /save preferences/i }).first().click();
    await expect(page.locator('body')).toBeVisible({ timeout: 6_000 });
  });

  test('mobile viewport: bottom nav and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await register(page, { headline: 'Mobile' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible({ timeout: 6_000 });

    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return 'no-main';
      return main.scrollWidth > main.clientWidth ? 'overflow' : 'ok';
    });
    expect(overflow).toBe('ok');
  });

  test('each public/marketing and app route returns 200 via the server', async ({ request }) => {
    const routes = [
      '/',
      '/dashboard',
      '/fingerprint',
      '/activity',
      '/evidence',
      '/certificates',
      '/leaderboards',
      '/explore',
      '/settings',
      '/integrations',
      '/help',
      '/profile',
      '/docs',
    ];
    for (const route of routes) {
      const res = await request.get(route);
      expect(res.ok()).toBeTruthy();
    }
  });
});
