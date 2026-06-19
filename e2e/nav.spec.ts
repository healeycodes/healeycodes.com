import { test, expect } from "@playwright/test";

test("nav bar links work", async ({ page }) => {
  await page.goto("/");

  // Navigate to `/articles`
  const articlesLink = page.locator(`nav > ul > li > a[href="/articles"]`);
  await articlesLink.click();

  // Title of `/articles`
  const title = page.getByRole("heading", { name: "Articles" });
  await expect(title).toBeVisible();
});
