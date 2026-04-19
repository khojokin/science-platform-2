import { expect, test } from "@playwright/test";

test("landing page renders the science platform headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Science-first")).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
});


test("marketing homepage renders core navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Science/i).first()).toBeVisible();
});
