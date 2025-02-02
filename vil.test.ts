import { type Page, expect, test } from "@playwright/test";
import { expectRendered } from "./testUtils";

type Log = {
  consoleMessages: string[];
  pageerrors: Error[];
};

const expectClickable = async (page: Page, log: Log, text: string): Promise<void> => {
  expect(log.consoleMessages).toEqual([]);
  log.consoleMessages.length = 0;

  await expect(page.getByText(text)).toBeInViewport();
  await page.getByText(text).click();
  expect(log.consoleMessages).toEqual([`Clicked on ${text}`]);
  log.consoleMessages.length = 0;
};

const initLog = (page: Page): Log => {
  const consoleMessages: string[] = [];
  const pageerrors: Error[] = [];

  page.on("console", (msg) => consoleMessages.push(msg.text()));
  page.on("pageerror", (msg) => pageerrors.push(msg));

  return { consoleMessages, pageerrors };
};

const scroll = async (page: Page, pixels: number): Promise<void> => {
  const scrollDeltaAbs = 100;
  const scrollDelta = pixels > 0 ? scrollDeltaAbs : -scrollDeltaAbs;
  const iteration = pixels / scrollDelta;
  if (!Number.isInteger(iteration)) {
    throw new Error(`pixels must be a multiple of ${scrollDelta}`);
  }
  for (let i = 0; i < iteration; i++) {
    await page.mouse.wheel(0, scrollDelta);
  }
};

const expectPageErrorsEmpty = (log: Log): void => {
  const pageErrors = log.pageerrors.filter(
    (err) => err.message !== "ResizeObserver loop completed with undelivered notifications.",
  );
  expect(pageErrors).toEqual([]);
};

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

test("screenshot with javascript", async ({ page }) => {
  await page.goto("/single-page.html");
  await expectRendered(page, 0, 0, 4, 8);
  await expect(page).toHaveScreenshot("single-page.png");
});
