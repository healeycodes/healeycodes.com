import { test, expect } from "@playwright/test";

test("project page renders", async ({ page }) => {
  await page.goto("/projects");

  // Intro visible
  const intro = page.getByText("My side projects range");
  await expect(intro).toBeVisible();

  // Some project is visible too
  const bioImage = page.getByText("andoma");
  await expect(bioImage).toBeVisible();
});
