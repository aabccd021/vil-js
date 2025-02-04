import { type Page, expect } from "@playwright/test";

function itemText(i: number): string {
  return `Item ${String(i).padStart(2, "0")}`;
}

export async function expectRendered(
  page: Page,
  first: number,
  firstVisible: number,
  lastVisible: number,
  last: number,
): Promise<void> {
  await expect(page.locator(".vil-item").first()).toHaveText(itemText(first));
  await expect(page.locator(".vil-item").last()).toHaveText(itemText(last));

  for (let i = 0; i < firstVisible; i++) {
    await expect(page.getByText(itemText(i))).not.toBeInViewport();
  }
  for (let i = firstVisible; i <= lastVisible; i++) {
    await expect(page.getByText(itemText(i))).toBeInViewport();
  }
  for (let i = lastVisible + 1; i <= 29; i++) {
    await expect(page.getByText(itemText(i))).not.toBeInViewport();
  }
}

export type Log = {
  consoleMessages: string[];
  pageerrors: Error[];
};

export const expectClickable = async (page: Page, log: Log, text: string): Promise<void> => {
  expect(log.consoleMessages).toEqual([]);
  log.consoleMessages.length = 0;

  await expect(page.getByText(text)).toBeInViewport();
  await page.getByText(text).click();
  expect(log.consoleMessages).toEqual([`Clicked on ${text}`]);
  log.consoleMessages.length = 0;
};

export const initLog = (page: Page): Log => {
  const consoleMessages: string[] = [];
  const pageerrors: Error[] = [];

  page.on("console", (msg) => consoleMessages.push(msg.text()));
  page.on("pageerror", (msg) => pageerrors.push(msg));

  return { consoleMessages, pageerrors };
};

export const scroll = async (page: Page, pixels: number): Promise<void> => {
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

export const expectPageErrorsEmpty = (log: Log): void => {
  const pageErrors = log.pageerrors.filter(
    (err) => err.message !== "ResizeObserver loop completed with undelivered notifications.",
  );
  expect(pageErrors).toEqual([]);
};
