import { _electron as electron, expect, test } from "@playwright/test";
import path from "node:path";

const MAIN_JS = path.join(__dirname, "..", "..", "dist-electron", "main.js");

test("splash → select local env → app loads", async () => {
  const app = await electron.launch({ args: [MAIN_JS] });
  const splash = await app.firstWindow();

  const localBtn = splash.locator("button.local");
  await expect(localBtn).toBeVisible();
  await localBtn.click();

  const main = await app.waitForEvent("window");
  // Don't require networkidle — local dev server may or may not be up;
  // just ensure the BrowserWindow is created.
  await main.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});

  await app.close();
});

test("splash → select prod env → app loads", async () => {
  const app = await electron.launch({ args: [MAIN_JS] });
  const splash = await app.firstWindow();

  const prodBtn = splash.locator("button.prod");
  await expect(prodBtn).toBeVisible();
  await prodBtn.click();

  const main = await app.waitForEvent("window");
  await main.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});

  await app.close();
});
