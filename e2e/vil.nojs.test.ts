import { expect, test } from "@playwright/test";
import { expectRendered } from "./testUtils";

test.use({ javaScriptEnabled: false });

test("Single page with js disabled", async ({ page }) => {
  await page.goto("/single-page.html");
  await expectRendered(page, 0, 0, 4, 29);
  await expect(page).toHaveScreenshot("single-page-js-disabled.png");
});
