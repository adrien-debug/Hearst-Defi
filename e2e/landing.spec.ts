import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Institutional USDC vault/i })).toBeVisible();
    await expect(page.getByText(/Mining-backed structured yield/i)).toBeVisible();
  });

  test("has CTA button linking to dashboard", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Open Dashboard/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/dashboard");
  });
});
