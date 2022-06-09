import { test, expect } from "@playwright/test";

test("nav bar links work", async ({ page }) => {
  await page.goto("/");

  // Navigate to `/articles`
  const articlesLink = await page.locator("ul >> text=Articles");
  await Promise.all([page.waitForNavigation(), articlesLink.click()]);

  // Check title of `/articles`
  const title = await page.locator(`h1:has-text("All posts")`);
  expect(await title.isVisible()).toBe(true);
});
