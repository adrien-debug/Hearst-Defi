import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads dashboard page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  });
});
