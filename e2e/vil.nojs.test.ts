import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("Single page with js disabled", async ({ page }) => {
  await page.goto("/single-page.html");
  await expect(page).toHaveScreenshot("single-page-js-disabled.png");
});
