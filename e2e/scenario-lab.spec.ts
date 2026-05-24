import { test, expect } from "@playwright/test";

test.describe("Scenario Lab", () => {
  test("loads scenario lab page", async ({ page }) => {
    // Dev admin sign-in to bypass auth
    await page.goto("/");
    await page.getByRole("button", { name: /Dev sign-in \(admin\)/i }).click();
    await page.waitForURL("/admin");
    await page.goto("/admin/scenario-lab");
    await expect(page.getByRole("heading", { name: /Scenario Lab/i })).toBeVisible();
  });
});
