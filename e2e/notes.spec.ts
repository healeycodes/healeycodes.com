import { test, expect } from "@playwright/test";

test("notes page renders", async ({ page }) => {
  await page.goto("/notes");

  // TODO: fix this – sleeping is an anti-pattern
  await new Promise(r => setTimeout(r, 2000));

  // First note visible
  const intro = await page.locator("text=Hello, World!");
  expect(await intro.isVisible()).toBe(true);
});
