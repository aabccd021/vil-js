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
