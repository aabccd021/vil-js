import { type Page, expect, test } from "@playwright/test";

type Log = {
  consoleMessages: string[];
  pageerrors: Error[];
};

const expectClickable = async (page: Page, log: Log, text: string): Promise<void> => {
  expect(log.consoleMessages).toEqual([]);
  log.consoleMessages.length = 0;

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

async function expectRange(
  page: Page,
  first: number,
  firstVisible: number,
  lastVisible: number,
  last: number,
): Promise<void> {
  await expect(page.locator(".vil-item").first()).toHaveText(`Item ${first}`);

  if (firstVisible - 1 <= 0) {
    await expect(page.getByText(`Item ${firstVisible - 1}`)).not.toBeInViewport();
  }
  for (let i = firstVisible; i <= lastVisible; i++) {
    await expect(page.getByText(`Item ${i}`)).toBeInViewport();
  }
  if (lastVisible + 1 >= 29) {
    await expect(page.getByText(`Item ${lastVisible + 1}`)).not.toBeInViewport();
  }

  await expect(page.locator(".vil-item").last()).toHaveText(`Item ${last}`);
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

test("bottom top", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 0, 0, 3, 7);

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 21, 26, 29, 29);

  await scroll(page, -5100);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 0, 0, 3, 7);

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 21, 26, 29, 29);

  await scroll(page, -5100);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 0, 0, 3, 7);

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 21, 26, 29, 29);

  await scroll(page, -5100);

  await expect(page).toHaveTitle("Page 1");
  await expectRange(page, 0, 0, 3, 7);

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("bottom top click", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 22");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  await scroll(page, -5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 22");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  await scroll(page, -5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 22");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  await scroll(page, -5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("little scroll", async ({ page }) => {
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
  await expectRange(page, 22, 26, 29, 29);

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("middle", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await scroll(page, 1000);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 5");
  await expectClickable(page, log, "Item 6");
  await expectClickable(page, log, "Item 7");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 1");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 12");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 5");
  await expectClickable(page, log, "Item 6");
  await expectClickable(page, log, "Item 7");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 1");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 12");

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 22");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("btm", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 22");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 22");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("back and forth dynamic", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to dynamic").click();
  await expect(page).toHaveTitle("Dynamic");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("back and forth static", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await page.getByText("Go to static").click();
  await expect(page).toHaveTitle("Static");

  await page.getByText("Go to page 1").click();
  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  expect(log.consoleMessages).toEqual([]);
  expectPageErrorsEmpty(log);
});

test("reload", async ({ page }) => {
  await page.goto("/page1.html");
  const log = initLog(page);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");

  await scroll(page, 5100);

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 29");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 29");

  await page.reload();

  await expect(page).toHaveTitle("Page 1");
  await expectClickable(page, log, "Item 0");
  await expect(page.locator(".vil-item").first()).toHaveText("Item 0");
  await expect(page.locator(".vil-item").last()).toHaveText("Item 7");
});
