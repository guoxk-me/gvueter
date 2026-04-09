import { expect, test } from "@playwright/test";

test("visits the app root url", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/login/);
  await expect(page.getByRole("heading", { level: 2 })).toContainText("登录");
  await expect(page.getByText("快速体验")).toBeVisible();
});
