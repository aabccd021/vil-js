import { expect, test } from "@playwright/test";
import { expectRendered } from "./utils.ts";

test.describe("single-page.html", () => {
  test("js is enabled", async ({ page }) => {
    await page.goto("/single-page.html");
    await expectRendered(page, 0, 0, 4, 8);
  });

  test("screenshot", async ({ page }) => {
    await page.goto("/single-page.html");
    await expect(page).toHaveScreenshot("single-page-js-enabled.png");
  });
});

test.describe("single-page-freeze.html", () => {
  test("js is enabled", async ({ page }) => {
    await page.goto("/single-page-freeze.html");
    await expectRendered(page, 0, 0, 4, 8);
  });

  test("screenshot", async ({ page }) => {
    await page.goto("/single-page-freeze.html");
    await expect(page).toHaveScreenshot("single-page-freeze-js-enabled.png");
  });
});
