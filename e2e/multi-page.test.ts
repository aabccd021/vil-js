import { expect, test } from "@playwright/test";
import { expectRendered, scroll, expectClickable, initLog, expectPageErrorsEmpty } from "./utils.ts";

test.describe("full scroll", () => {
  test("range is correct", async ({ page }) => {
    await page.goto("/page1.html");

    for (let i = 0; i < 3; i++) {
      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 0, 0, 3, 7);
      await scroll(page, 5200);

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 21, 25, 29, 29);
      await scroll(page, -5200);
    }
  });

  test("items are clickable", async ({ page }) => {
    await page.goto("/page1.html");
    const log = initLog(page);

    for (let i = 0; i < 3; i++) {
      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 00");
      await scroll(page, 5200);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29");
      await scroll(page, -5200);
    }

    expect(log.consoleMessages).toEqual([]);
    expectPageErrorsEmpty(log);
  });
});

test.describe("scroll restoration", () => {
  test.describe("little scroll on page 1", () => {
    test("range is correct", async ({ page }) => {
      await page.goto("/page1.html");
      const log = initLog(page);

      await scroll(page, 200);

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 0, 0, 4, 8);

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 0, 0, 4, 8);

      await scroll(page, 5100);

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 21, 25, 29, 29);

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });

    test("items clickable", async ({ page }) => {
      await page.goto("/page1.html");
      const log = initLog(page);

      await scroll(page, 200);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 02");

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 02");

      await scroll(page, 5600);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29");

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });
  });

  test.describe("page 2 loaded", () => {
    test("range is correct", async ({ page }) => {
      await page.goto("/page1.html");

      await scroll(page, 1000);

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 1, 5, 8, 12);

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 1, 5, 8, 12);

      await scroll(page, 5200);

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 22, 26, 29, 29);
    });

    test("items clickable", async ({ page }) => {
      await page.goto("/page1.html");
      const log = initLog(page);

      await scroll(page, 1000);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 06");

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");

      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 06");

      await scroll(page, 5600);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29");

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });
  });

  test.describe("on bottom", () => {
    test("range is correct", async ({ page }) => {
      await page.goto("/page1.html");

      await scroll(page, 5200);

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 21, 25, 29, 29);

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectRendered(page, 21, 25, 29, 29);
    });

    test("items clickable", async ({ page }) => {
      await page.goto("/page1.html");
      const log = initLog(page);

      await scroll(page, 5200);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 27");

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");

      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 27");

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });
  });

  test.describe("on top", () => {
    test.describe("to dynamic page", () => {
      test("range is correct", async ({ page }) => {
        await page.goto("/page1.html");

        await expect(page).toHaveTitle("Page 1");
        await expectRendered(page, 0, 0, 3, 7);

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to dynamic").click();
          await expect(page).toHaveTitle("Dynamic");

          await page.getByText("Go to page 1").click();
          await expect(page).toHaveTitle("Page 1");
          await expectRendered(page, 0, 0, 3, 7);
        }
      });

      test("items clickable", async ({ page }) => {
        await page.goto("/page1.html");
        const log = initLog(page);

        await expect(page).toHaveTitle("Page 1");
        await expectClickable(page, log, "Item 02");

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to dynamic").click();
          await expect(page).toHaveTitle("Dynamic");

          await page.getByText("Go to page 1").click();
          await expect(page).toHaveTitle("Page 1");
          await expectClickable(page, log, "Item 02");
        }

        expect(log.consoleMessages).toEqual([]);
        expectPageErrorsEmpty(log);
      });
    });
    test.describe("to static page", () => {
      test("range is correct", async ({ page }) => {
        await page.goto("/page1.html");
        const log = initLog(page);

        await expect(page).toHaveTitle("Page 1");
        await expectRendered(page, 0, 0, 3, 7);

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to static").click();
          await expect(page).toHaveTitle("Static");

          await page.getByText("Go to page 1").click();
          await expect(page).toHaveTitle("Page 1");
          await expectRendered(page, 0, 0, 3, 7);
        }

        expect(log.consoleMessages).toEqual([]);
        expectPageErrorsEmpty(log);
      });

      test("items clickable", async ({ page }) => {
        await page.goto("/page1.html");
        const log = initLog(page);

        await expect(page).toHaveTitle("Page 1");
        await expectClickable(page, log, "Item 02");

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to static").click();
          await expect(page).toHaveTitle("Static");

          await page.getByText("Go to page 1").click();
          await expect(page).toHaveTitle("Page 1");
          await expectClickable(page, log, "Item 02");
        }

        expect(log.consoleMessages).toEqual([]);
        expectPageErrorsEmpty(log);
      });
    });
  });
});

test.describe("reload resets", () => {
  test("range is correct", async ({ page }) => {
    await page.goto("/page1.html");

    await expect(page).toHaveTitle("Page 1");
    await expectRendered(page, 0, 0, 3, 7);

    await scroll(page, 5200);

    await expect(page).toHaveTitle("Page 1");
    await expectRendered(page, 21, 25, 29, 29);

    await page.reload();

    await expect(page).toHaveTitle("Page 1");
    await expectRendered(page, 0, 0, 3, 7);
  });

  test("items clickable", async ({ page }) => {
    await page.goto("/page1.html");
    const log = initLog(page);

    await expect(page).toHaveTitle("Page 1");
    await expectClickable(page, log, "Item 02");

    await scroll(page, 5200);

    await expect(page).toHaveTitle("Page 1");
    await expectClickable(page, log, "Item 29");

    await page.reload();

    await expect(page).toHaveTitle("Page 1");
    await expectClickable(page, log, "Item 02");

    expect(log.consoleMessages).toEqual([]);
    expectPageErrorsEmpty(log);
  });
});
