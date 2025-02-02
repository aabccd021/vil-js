import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("screenshot without javascript", async ({ page }) => {
  await page.goto("/single-page.html");
  // await expect(page).toHaveScreenshot("snapshots/screenshot.png");
});
