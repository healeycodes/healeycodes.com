import { test, expect } from "@playwright/test";

test("posts", async ({ page }) => {
  await page.goto("/geoguessing-with-deep-learning");

  // Post title
  const title = page.getByRole("heading", {
    name: "GeoGuessing with Deep Learning",
  });
  await expect(title).toBeVisible();

  // Content
  const aParagraph = page.getByText("GeoGuessrers");
  await expect(aParagraph).toBeVisible();

  // Subscribe button
  const subButton = page.locator('[value="Subscribe"]');
  await expect(subButton).toBeVisible();

  // Code block
  const codeBlock = page.getByText("move_by_offset");
  await expect(codeBlock).toBeVisible();
});
