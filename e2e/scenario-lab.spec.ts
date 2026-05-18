import { test, expect } from "@playwright/test";

test.describe("Scenario Lab", () => {
  test("loads scenario lab page", async ({ page }) => {
    await page.goto("/scenario-lab");
    await expect(page.getByRole("heading", { name: /Scenario Lab/i })).toBeVisible();
  });
});
