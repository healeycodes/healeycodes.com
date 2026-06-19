import { test, expect } from "@playwright/test";

test("notes page renders", async ({ page }) => {
  await page.goto("/notes");

  // First note visible
  const intro = page.getByText("Hello, World!");
  await expect(intro).toBeVisible();
});
