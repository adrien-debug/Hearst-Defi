import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads dashboard page", async ({ page }) => {
    // Dev sign-in to bypass auth
    await page.goto("/");
    await page.getByRole("button", { name: /Dev sign-in \(skip login\)/i }).click();
    await page.waitForURL("/portfolio");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});
