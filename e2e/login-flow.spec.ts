import { test, expect } from "@playwright/test";

/**
 * Real DB-backed login flow.
 *
 * Pre-req (one shot): `pnpm seed:test` — creates test@hearst.local with
 * the password below (argon2id, OWASP params). The login server action
 * verifies against the actual `User.passwordHash` row, creates an opaque
 * Session, and sets the `hc_session` httpOnly cookie. No dev bypass UI,
 * no shortcut — this is the same code path institutional investors will
 * hit.
 *
 * Constants are duplicated rather than imported from scripts/ because
 * Playwright runs specs outside the tsconfig path-alias graph. Keep the
 * two values in sync with `scripts/seed-test-user.ts`.
 */

const TEST_EMAIL = "test@hearst.local";
const TEST_PASSWORD = "TestPassword123!";

async function submitLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("Login flow (real DB auth)", () => {
  test("rejects wrong credentials with a generic message", async ({ page }) => {
    await submitLogin(page, TEST_EMAIL, "definitely-wrong-password");
    await expect(page.getByRole("alert")).toContainText(
      /invalid email or password/i,
    );
    expect(page.url()).toContain("/login");
  });

  test("rejects an unknown email with the same generic message (anti-enumeration)", async ({
    page,
  }) => {
    await submitLogin(page, "unknown-user@hearst.local", "any-password");
    await expect(page.getByRole("alert")).toContainText(
      /invalid email or password/i,
    );
  });

  test("signs in successfully and lands on /portfolio", async ({ page }) => {
    await submitLogin(page, TEST_EMAIL, TEST_PASSWORD);
    await page.waitForURL("**/portfolio", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
  });

  test("navigates to /vaults and /profile after sign-in", async ({ page }) => {
    await submitLogin(page, TEST_EMAIL, TEST_PASSWORD);
    await page.waitForURL("**/portfolio", { timeout: 10_000 });

    await page.goto("/vaults");
    await expect(page).toHaveURL(/\/vaults$/);
    // Either at least one vault card, or the explicit "no products" empty
    // state — both are valid post-sign-in renderings.
    const hasCardOrEmpty = await page
      .locator("body")
      .filter({ hasText: /vault|no products available/i })
      .first()
      .isVisible();
    expect(hasCardOrEmpty).toBe(true);

    await page.goto("/profile");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test("legal pages remain accessible while signed in", async ({ page }) => {
    await submitLogin(page, TEST_EMAIL, TEST_PASSWORD);
    await page.waitForURL("**/portfolio", { timeout: 10_000 });

    for (const path of ["/legal", "/legal/privacy", "/legal/terms", "/legal/disclaimer"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      expect(page.url()).toContain(path);
    }
  });

  test("clearing the session cookie returns to /login on a protected route", async ({
    page,
    context,
  }) => {
    await submitLogin(page, TEST_EMAIL, TEST_PASSWORD);
    await page.waitForURL("**/portfolio", { timeout: 10_000 });

    await context.clearCookies();
    await page.goto("/portfolio");
    await page.waitForURL(/\/login(\?|$)/, { timeout: 5_000 });
  });
});
