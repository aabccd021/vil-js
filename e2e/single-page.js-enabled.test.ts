import { expect, test } from "@playwright/test";
import { expectRendered } from "./utils.ts";

test("js is enabled", async ({ page }) => {
  await page.goto("/single-page.html");
  await expectRendered(page, 0, 0, 4, 8);
});

test("screenshot", async ({ page }) => {
  await page.goto("/single-page.html");
  await expect(page).toHaveScreenshot("single-page-js-enabled.png");
});
