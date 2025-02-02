import { type Page, expect, test } from "@playwright/test";

type Log = {
  consoleMessages: string[];
  pageerrors: Error[];
};

const expectClickable = async (page: Page, log: Log, text: string, iteration?: number): Promise<void> => {
  expect(log.consoleMessages, `iteration: ${iteration}`).toEqual([]);
  log.consoleMessages.length = 0;

  await page.getByText(text).click();
  expect(log.consoleMessages, `iteration: ${iteration}`).toEqual([`Clicked on ${text}`]);
  log.consoleMessages.length = 0;
};

const initLog = (page: Page): Log => {
  const consoleMessages: string[] = [];
  const pageerrors: Error[] = [];

  page.on("console", (msg) => consoleMessages.push(msg.text()));
  page.on("pageerror", (msg) => pageerrors.push(msg));

  return { consoleMessages, pageerrors };
};

function itemText(i: number): string {
  return `Item ${String(i).padStart(2, "0")}`;
}

async function expectRange(
  page: Page,
  first: number,
  firstVisible: number,
  lastVisible: number,
  last: number,
  iteration?: number,
): Promise<void> {
  await expect(page.locator(".vil-item").first(), `iteration: ${iteration}`).toHaveText(itemText(first));
  await expect(page.locator(".vil-item").last(), `iteration: ${iteration}`).toHaveText(itemText(last));

  if (firstVisible - 1 <= 0) {
    await expect(page.getByText(itemText(firstVisible - 1)), `iteration: ${iteration}`).not.toBeInViewport();
  }
  for (let i = firstVisible; i <= lastVisible; i++) {
    await expect(page.getByText(itemText(i)), `iteration: ${iteration}`).toBeInViewport();
  }
  if (lastVisible + 1 >= 29) {
    await expect(page.getByText(itemText(lastVisible + 1)), `iteration: ${iteration}`).not.toBeInViewport();
  }
}

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
      await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
      await expectRange(page, 0, 0, 3, 7, i);
      await scroll(page, 5100);

      await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
      await expectRange(page, 21, 26, 29, 29, i);
      await scroll(page, -5100);
    }
  });

  test("items are clickable", async ({ page }) => {
    await page.goto("/page1.html");
    const log = initLog(page);

    for (let i = 0; i < 3; i++) {
      await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 00", i);
      await scroll(page, 5100);

      await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29", i);
      await scroll(page, -5100);
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
      await page.waitForTimeout(1000);

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 0, 0, 4, 8);

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 0, 0, 4, 8);

      await scroll(page, 5100);

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 21, 26, 29, 29);

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });

    test("items clickable", async ({ page }) => {
      await page.goto("/page1.html");
      const log = initLog(page);

      await scroll(page, 200);
      await page.waitForTimeout(1000);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 05");

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 05");

      await scroll(page, 5100);

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
      await expectRange(page, 1, 5, 8, 12);

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 1, 5, 8, 12);

      await scroll(page, 5100);

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 22, 26, 29, 29);
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

      await scroll(page, 5100);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29");

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });
  });

  test.describe("on bottom", () => {
    test("range is correct", async ({ page }) => {
      await page.goto("/page1.html");

      await scroll(page, 5100);

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 21, 26, 29, 29);

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");
      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectRange(page, 21, 26, 29, 29);
    });

    test("items clickable", async ({ page }) => {
      await page.goto("/page1.html");
      const log = initLog(page);

      await scroll(page, 5100);

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29");

      await page.getByText("Go to dynamic").click();
      await expect(page).toHaveTitle("Dynamic");

      await page.getByText("Go to page 1").click();

      await expect(page).toHaveTitle("Page 1");
      await expectClickable(page, log, "Item 29");

      expect(log.consoleMessages).toEqual([]);
      expectPageErrorsEmpty(log);
    });
  });

  test.describe("on top", () => {
    test.describe("to dynamic page", () => {
      test("range is correct", async ({ page }) => {
        await page.goto("/page1.html");

        await expect(page).toHaveTitle("Page 1");
        await expectRange(page, 0, 0, 3, 7);

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to dynamic").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Dynamic");

          await page.getByText("Go to page 1").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
          await expectRange(page, 0, 0, 3, 7, i);
        }
      });

      test("items clickable", async ({ page }) => {
        await page.goto("/page1.html");
        const log = initLog(page);

        await expect(page).toHaveTitle("Page 1");
        await expectClickable(page, log, "Item 00");

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to dynamic").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Dynamic");

          await page.getByText("Go to page 1").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
          await expectClickable(page, log, "Item 00", i);
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
        await expectRange(page, 0, 0, 3, 7);

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to static").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Static");

          await page.getByText("Go to page 1").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
          await expectRange(page, 0, 0, 3, 7, i);
        }

        expect(log.consoleMessages).toEqual([]);
        expectPageErrorsEmpty(log);
      });

      test("items clickable", async ({ page }) => {
        await page.goto("/page1.html");
        const log = initLog(page);

        await expect(page).toHaveTitle("Page 1");
        await expectClickable(page, log, "Item 00");

        for (let i = 0; i < 3; i++) {
          await page.getByText("Go to static").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Static");

          await page.getByText("Go to page 1").click();
          await expect(page, `iteration: ${i}`).toHaveTitle("Page 1");
          await expectClickable(page, log, "Item 00", i);
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
    await expectRange(page, 0, 0, 3, 7);

    await scroll(page, 5100);

    await expect(page).toHaveTitle("Page 1");
    await expectRange(page, 21, 26, 29, 29);

    await page.reload();

    await expect(page).toHaveTitle("Page 1");
    await expectRange(page, 0, 0, 3, 7);
  });

  test("items clickable", async ({ page }) => {
    await page.goto("/page1.html");
    const log = initLog(page);

    await expect(page).toHaveTitle("Page 1");
    await expectClickable(page, log, "Item 00");

    await scroll(page, 5100);

    await expect(page).toHaveTitle("Page 1");
    await expectClickable(page, log, "Item 29");

    await page.reload();

    await expect(page).toHaveTitle("Page 1");
    await expectClickable(page, log, "Item 00");

    expect(log.consoleMessages).toEqual([]);
    expectPageErrorsEmpty(log);
  });
});
