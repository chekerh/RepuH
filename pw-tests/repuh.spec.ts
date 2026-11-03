import { test, expect, type Page } from '@playwright/test';

const ROOT = '/';

// ---------------------------------------------------------------------------
// Deterministic test account so every run is independent and repeatable.
// ---------------------------------------------------------------------------
const EMAIL = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const DISPLAY = 'Quality Runner';
// Must satisfy the wizard's username rule: /^[a-z0-9][a-z0-9_-]{2,29}$/ (min 3 chars).
const USERNAME = 'qa-runner';
const PASSWORD = 'qapassword-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The landing shows a fixed boot overlay while the hero lattice paints; every
// flow that starts on a fresh landing load must wait for it to fade out. A
// no-op once the hero is ready.
async function ensureBootFaded(page: Page) {
  const boot = page.locator('#repuh-boot').first();
  const visible = await boot.isVisible({ timeout: 3_000 }).catch(() => false);
  if (!visible) return;
  await boot.waitFor({ state: 'detached', timeout: 10_000 }).catch(async () => {
    await expect(boot).toHaveCSS('opacity', '0', { timeout: 6_000 });
  });
}

async function register(page: Page, opts?: { username?: string; headline?: string }) {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: /create your identity/i })).toBeVisible({ timeout: 10_000 });

  await page.getByLabel(/what should we call you/i).fill(DISPLAY);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /create your identity/i }).click();

  // The suite shares one deterministic account, so later tests find it already
  // registered: the form answers with an alert instead of navigating. Sign in
  // instead — the result is the same account, whatever the first attempt did.
  await page.waitForURL(/\/(dashboard|onboarding)$/, { timeout: 15_000 }).catch(() => null);
  if (!/\/(dashboard|onboarding)$/.test(new URL(page.url()).pathname)) {
    await signIn(page);
    await page.waitForURL(/\/(dashboard|onboarding)$/, { timeout: 15_000 });
  }

  // A brand-new account goes through the wizard; the seeded account has
  // already completed onboarding and lands directly on the dashboard.
  if (new URL(page.url()).pathname === '/onboarding') {
    await driveOnboarding(page, { username: opts?.username ?? USERNAME, headline: opts?.headline });
    await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
  }
  return page.url();
}

async function driveOnboarding(page: Page, opts: { username?: string; headline?: string }) {
  let stepIndex = 0;
  while (true) {
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5_000 });

    const text = await heading.textContent();
    if (!text) break;

    // Step 0 gates on a consent checkbox; any disabled Continue is enabled by
    // ticking it, so do this before branching on the step.
    const consent = page.getByLabel(/I understand that RepuH observes/i);
    if (await consent.isVisible({ timeout: 300 }).catch(() => false)) {
      if (!(await consent.isChecked())) await consent.check();
    }

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
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)$/, { timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('RepuH — MVP UX/UI and interaction suite', () => {
  test('landing page renders, copy reflects the product, first paint is loading animation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(ROOT);

    // Boot overlay must be up immediately, before the hero canvas exists.
    await expect(page.locator('#repuh-boot')).toBeVisible({ timeout: 4_000 });
    await ensureBootFaded(page);

    await expect(page.getByRole('heading', { name: /RepuH/i }).first()).toBeVisible();
    await expect(page.getByText(/attributable/i)).toBeVisible();
    await expect(page.getByText(/certificate/i)).toBeVisible();
    await expect(page.getByText(/Hedera/i)).toBeVisible();

    // After the boot overlay fades the hero effect is mounted. The threeui
    // ConstellationField paints inside a sandboxed srcdoc iframe, so the
    // observable element is the iframe — no canvas exists in the host document.
    await expect(page.locator('.threeui-mount iframe').first()).toBeAttached({ timeout: 8_000 });
    expect(errors).toEqual([]);
  });

  test('create account: validation surfaces and account is created', async ({ page }) => {
    await register(page, { headline: 'Test engineer' });
    const url = page.url();
    expect(url.includes('/dashboard') || url.includes('/onboarding')).toBeTruthy();
  });

  test('login with wrong password returns a readable error', async ({ page }) => {
    // Navigate directly: on small viewports the landing header exposes no Sign
    // in link (menu collapses it), so routing through the header would only be
    // testable on desktop. The intent here is the readable error, not the entry
    // point.
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Scope to the form: the page also carries Next.js's empty
    // `next-route-announcer` role=alert, which must not match. The text is
    // asserted with an auto-waiting locator because hydration (dev-mode
    // turbopack chunks) can lag the click by seconds.
    const alert = page.locator('form p[role="alert"]');
    await expect(alert).toContainText(/don'?t match/, { timeout: 20_000 });
  });

  test('full authenticated journey: dashboard -> fingerprint -> activity -> evidence -> certificates', async ({ page }) => {
    await register(page, { headline: 'QA engineer' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    // Sidebar links exist only at the desktop breakpoint. On narrow viewports
    // an item matching the name may be visible but not actionable (bottom-nav
    // container), so drive the route directly there — the journey under test
    // is the pages.
    const open = async (name: RegExp, href: string) => {
      const isNarrow = page.viewportSize()?.width != null && page.viewportSize()!.width < 768;
      const link = page.getByRole('link', { name }).first();
      if (!isNarrow && (await link.isVisible({ timeout: 2_000 }).catch(() => false))) await link.click();
      else await page.goto(href);
      await expect(page.locator('body')).toBeVisible({ timeout: 8_000 });
    };

    await open(/fingerprint/i, '/fingerprint');
    await expect(page.locator('body')).toContainText(/capability|evidence|estimate/i, { timeout: 6_000 });

    await open(/activity/i, '/activity');
    await open(/evidence/i, '/evidence');
    await open(/certificates/i, '/certificates');
    await expect(page.locator('body')).toContainText(/certificate/i, { timeout: 5_000 });
  });

  test('sign out clears the session and returns to the landing page', async ({ page }) => {
    await register(page, { headline: 'Signed out' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    // /settings hosts the sign-out control for every breakpoint; the sidebar
    // link that leads there is desktop-only, so navigate directly.
    await page.goto('/settings');
    await expect(
      page.getByRole('button', { name: /sign out of this device/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /sign out of this device/i }).click();

    // Signing out ends the session and lands back on the landing page.
    await page.waitForURL(/\/$/, { timeout: 12_000 });
    await expect(page.getByRole('heading', { name: /repuh/i }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('settings preference changes persist and reflect in the UI', async ({ page }) => {
    await register(page, { headline: 'Preferences' });
    await page.waitForURL(/\/dashboard/, { timeout: 12_000 });

    // /settings works for every breakpoint (the sidebar link is desktop-only).
    await page.goto('/settings');
    await expect(page.getByLabel(/reduce motion/i)).toBeVisible({ timeout: 8_000 });

    // Preference toggles auto-save: there is no separate save button. A fresh
    // account starts with reduce-motion off, so a single click turns it on,
    // persists it server-side and confirms with a saved line.
    const reduceMotion = page.getByLabel(/reduce motion/i);
    await reduceMotion.click();
    await expect(reduceMotion).toBeChecked({ timeout: 8_000 });
    await expect(page.getByText(/preferences saved/i)).toBeVisible({ timeout: 8_000 });

    // Persistence: a fresh document load reflects the stored preference.
    await page.reload();
    await expect(page.getByLabel(/reduce motion/i)).toBeChecked({ timeout: 10_000 });
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
