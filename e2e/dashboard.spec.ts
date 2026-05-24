import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads /portfolio when DEV_AUTH_BYPASS resolves the dev investor", async ({
    page,
  }) => {
    // Dev sign-in buttons were removed (security hardening). In local/E2E,
    // DEV_AUTH_BYPASS=1 (.env.local) makes src/proxy.ts skip the gate, and
    // getSession() falls through to ensureDevUser() — so /portfolio renders
    // directly without any UI click.
    await page.goto("/portfolio");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});
