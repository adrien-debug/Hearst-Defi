import { test, expect } from "@playwright/test";

test.describe("Landing / login screen", () => {
  test("redirects unauthenticated visitors to the login form", async ({ page }) => {
    await page.goto("/");
    // Either we land on /login directly, or `/` renders the login split-screen.
    await expect(page.getByLabel(/^Sign in$/i)).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });
});
