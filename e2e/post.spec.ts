import { test, expect } from "@playwright/test";

test("posts", async ({ page }) => {
  await page.goto("/geoguessing-with-deep-learning");

  // Post title
  const title = await page.locator(
    'h1:has-text("GeoGuessing with Deep Learning")'
  );
  expect(await title.isVisible()).toBe(true);

  // Content
  const aParagraph = await page.locator("text=GeoGuessrers");
  expect(await aParagraph.isVisible());

  // Subscribe button
  const subButton = await page.locator('[value="Subscribe"]');
  expect(await subButton.isVisible());
});
