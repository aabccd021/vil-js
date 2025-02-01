import { type Locator, type Page, expect, test } from "@playwright/test";

const getScrollable = async (page: Page): Promise<Locator> => {
  const locator = page.locator(".root");
  await locator.waitFor();
  return locator;
};

const scrollToBottom = (scrollable: Locator): Promise<void> => {
  return scrollable.evaluate((e) => {
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | null = null;

      const onScroll = (): void => {
        // console.log({ scrollTop: e.scrollTop, offsetHeight: (e as HTMLElement).offsetHeight, scrollHeight: e.scrollHeight });
        e.scrollTop = e.scrollHeight;

        if (timer !== null) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          if (e.scrollTop + (e as HTMLElement).offsetHeight >= e.scrollHeight - 1) {
            e.removeEventListener("scroll", onScroll);
            resolve();
          } else {
            onScroll();
          }
        }, 50);
      };
      e.addEventListener("scroll", onScroll);

      onScroll();
    });
  });
};

const scrollTo = (scrollable: Locator, offset: number): Promise<void> => {
  return scrollable.evaluate((e, offset) => {
    e.scrollTop = offset;
  }, offset);
};

type Log = {
  consoleMessages: string[];
  pageerrors: Error[];
};

const click = async (page: Page, log: Log, text: string): Promise<void> => {
  // expect(log.consoleMessages).toEqual([]);
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

  return {
    consoleMessages,
    pageerrors,
  };
};

const scroll = async (page: Page, pixels: number): Promise<void> => {
  const scrollDeltaAbs = 100;
  const scrollDelta = pixels > 0 ? scrollDeltaAbs : -scrollDeltaAbs;
  const iteration = pixels / scrollDelta;
  if (!Number.isInteger(iteration)) {
    throw new Error(`pixels must be a multiple of ${scrollDelta}`);
  }
  for (let i = 0; i < iteration; i++) {
    await page.waitForTimeout(Math.ceil(scrollDeltaAbs / 50));
    await page.mouse.wheel(0, scrollDelta);
  }
};

const expectPageErrorsEmpty = (log: Log): void => {
  const pageErrors = log.pageerrors.filter(
    (err) => err.message !== "ResizeObserver loop completed with undelivered notifications.",
  );
  expect(pageErrors).toEqual([]);
};

test("bottom top", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  const scrollable = await getScrollable(page);
  const items = scrollable.getByRole("listitem");

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await scroll(page, 5000);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.first()).toHaveText("Item 22");
  await expect(items.last()).toHaveText("Item 29");

  await scroll(page, -5200);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await scroll(page, 5000);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.first()).toHaveText("Item 22");
  await expect(items.last()).toHaveText("Item 29");

  await scroll(page, -5200);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await scroll(page, 5000);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.first()).toHaveText("Item 22");
  await expect(items.last()).toHaveText("Item 29");

  await scrollTo(scrollable, 0);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("middle", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  const scrollable = await getScrollable(page);
  const items = scrollable.getByRole("listitem");

  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(50);
    await page.mouse.wheel(0, 500);
  }
  // await scrollTo(scrollable, 1000);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 5");
  await click(page, log, "Item 6");
  await click(page, log, "Item 7");
  await expect(items.first()).toHaveText("Item 1");
  await expect(items.last()).toHaveText("Item 9");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 5");
  await click(page, log, "Item 6");
  await click(page, log, "Item 7");
  await expect(items.first()).toHaveText("Item 1");
  await expect(items.last()).toHaveText("Item 12");

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(50);
    await page.mouse.wheel(0, 100);
  }
  await scrollToBottom(scrollable);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.first()).toHaveText("Item 22");
  await expect(items.last()).toHaveText("Item 29");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("btm", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  const scrollable = await getScrollable(page);
  const items = scrollable.getByRole("listitem");

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(25);
    await page.mouse.wheel(0, 200);
  }

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.first()).toHaveText("Item 22");
  await expect(items.last()).toHaveText("Item 29");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.first()).toHaveText("Item 22");
  await expect(items.last()).toHaveText("Item 29");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("back and forth dynamic", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  const scrollable = await getScrollable(page);
  const items = scrollable.getByRole("listitem");

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("back and forth static", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  const scrollable = await getScrollable(page);
  const items = scrollable.getByRole("listitem");

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("reload", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  const scrollable = await getScrollable(page);
  const items = scrollable.getByRole("listitem");

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 0");
  await expect(items.first()).toHaveText("Item 0");
  await expect(items.last()).toHaveText("Item 7");

  await page.waitForTimeout(100);
  await page.mouse.wheel(0, 100);
  await scrollToBottom(scrollable);

  await expect(page).toHaveTitle("Page 1");
  await click(page, log, "Item 29");
  await expect(items.last()).toHaveText("Item 29");

  await page.reload();

  await expect(page).toHaveTitle("Page 1");
  const scrollable2 = await getScrollable(page);
  const items2 = scrollable2.getByRole("listitem");
  await click(page, log, "Item 0");
  await expect(items2.first()).toHaveText("Item 0");
  await expect(items2.last()).toHaveText("Item 7");
});
