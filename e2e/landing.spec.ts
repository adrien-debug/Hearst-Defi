import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Institutional Mining Yield Vaults/i })).toBeVisible();
    await expect(page.getByText(/Mining-backed structured yield/i)).toBeVisible();
  });

  test("has dev sign-in button", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: /Dev sign-in \(skip login\)/i });
    await expect(btn).toBeVisible();
  });
});
