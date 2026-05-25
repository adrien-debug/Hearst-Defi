import { test, expect } from "@playwright/test";

test.describe("Legal pages (public, no auth)", () => {
  test("legal index lists the three documents", async ({ page }) => {
    await page.goto("/legal");
    await expect(
      page.getByRole("heading", { level: 1, name: "Legal" }),
    ).toBeVisible();

    await expect(page.getByRole("link", { name: /Privacy Policy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Terms of Service/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Risk Disclaimer/i })).toBeVisible();
  });

  test("privacy policy renders Cayman SPV data controller section", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(
      page.getByRole("heading", { level: 1, name: /Privacy Policy/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Controller/i })).toBeVisible();
    await expect(page.getByText(/Cayman/i).first()).toBeVisible();
  });

  test("terms of service show Cayman jurisdiction and lock-up", async ({ page }) => {
    await page.goto("/legal/terms");
    await expect(
      page.getByRole("heading", { level: 1, name: /Terms of Service/i }),
    ).toBeVisible();
    await expect(page.getByText(/60-day soft lock-up/i).first()).toBeVisible();
    await expect(page.getByText(/Cayman Islands/i).first()).toBeVisible();
  });

  test("risk disclaimer says no guarantee explicitly", async ({ page }) => {
    await page.goto("/legal/disclaimer");
    await expect(
      page.getByRole("heading", { level: 1, name: /Risk Disclaimer/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /No guarantee/i })).toBeVisible();
    await expect(page.getByText(/Capital is at risk/i)).toBeVisible();
  });

  test("legal pages do not require auth", async ({ page }) => {
    // Ensure no session cookie sneaks in.
    await page.context().clearCookies();
    const response = await page.goto("/legal/privacy");
    expect(response?.status()).toBe(200);
    // Confirm we did NOT get redirected to /login.
    expect(page.url()).toContain("/legal/privacy");
  });
});
