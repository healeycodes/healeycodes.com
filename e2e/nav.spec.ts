import { test, expect } from "@playwright/test";

test("nav bar links work", async ({ page }) => {
  await page.goto("/");

  // Navigate to `/articles`
  const articlesLink = await page.locator(`nav > ul > li > a[href="/articles"]`);
  await articlesLink.click()

  // TODO: fix this – sleeping is an anti-pattern
  await new Promise(r => setTimeout(r, 2000));

  // Title of `/articles`
  const title = await page.locator(`h1:has-text("Articles")`);
  expect(await title.isVisible()).toBe(true);
});
