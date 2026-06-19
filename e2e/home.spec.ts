import { test, expect } from "@playwright/test";

test("index page renders", async ({ page }) => {
  await page.goto("/");

  // Intro bio
  const bio = page.getByText("love getting email");
  await expect(bio).toBeVisible();

  // Bio image
  const bioImage = page.getByAltText(
    "Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
  );
  await expect(bioImage).toBeVisible();
});
