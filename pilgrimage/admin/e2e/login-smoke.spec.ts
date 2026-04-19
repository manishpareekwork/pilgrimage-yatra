import { expect, test } from "@playwright/test";

test.describe("login page", () => {
  test("shows Pilgrimage Admin heading and email/password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Pilgrimage Admin/i })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
