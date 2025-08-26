import { test, expect } from "@playwright/test";

test("index page renders", async ({ page }) => {
  await page.goto("/");

  // Intro bio
  const bio = await page.locator("text=love getting email");
  expect(await bio.isVisible()).toBe(true);

  // Bio image
  const bioImage = await page.locator('[alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."]');
  expect(await bioImage.isVisible()).toBe(true);
});
