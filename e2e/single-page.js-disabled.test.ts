import { expect, test } from "@playwright/test";
import { expectRendered } from "./utils.ts";

test.use({ javaScriptEnabled: false });

test("js is disabled", async ({ page }) => {
  await page.goto("/single-page.html");
  await expectRendered(page, 0, 0, 4, 29);
});

test("screenshot", async ({ page }) => {
  await page.goto("/single-page.html");
  await expect(page).toHaveScreenshot("single-page-js-disabled.png");
});
