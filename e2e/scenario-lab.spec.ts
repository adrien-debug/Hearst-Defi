import { test, expect } from "@playwright/test";

test.describe("Scenario Lab", () => {
  // Skipped: previously relied on the "Dev sign-in (admin)" button, which has
  // been removed from /login (security hardening — no bypass UI in any
  // environment). DEV_AUTH_BYPASS only resolves an investor, not an admin, so
  // /admin/* requires a real seeded admin login. Re-enable once the seed
  // exposes an admin with a known password (or once a dedicated test-only
  // session helper lands).
  test.skip("loads scenario lab page (admin route)", async ({ page }) => {
    await page.goto("/admin/scenario-lab");
    await expect(
      page.getByRole("heading", { name: /Scenario Lab/i }),
    ).toBeVisible();
  });
});
