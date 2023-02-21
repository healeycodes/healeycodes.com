import { test, expect } from "@playwright/test";

test("project page renders", async ({ page }) => {
  await page.goto("/projects");

  // TODO: fix this – sleeping is an anti-pattern
  await new Promise(r => setTimeout(r, 2000));

  // Intro visible
  const intro = await page.locator("text=My side projects include");
  expect(await intro.isVisible()).toBe(true);

  // Some project is visible too
  const bioImage = await page.locator("text=andoma");
  expect(await bioImage.isVisible()).toBe(true);
});
