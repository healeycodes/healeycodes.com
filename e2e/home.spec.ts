import { test, expect } from "@playwright/test";

test("index page renders", async ({ page }) => {
  await page.goto("/");

  // Check intro bio
  const bio = await page.locator("text=Hey, I'm Andrew Healey");
  expect(await bio.isVisible()).toBe(true);

  // Check image alt text
  const bioImage = await page.locator('[alt="Andrew Healey."]');
  expect(await bioImage.isVisible()).toBe(true);
});
