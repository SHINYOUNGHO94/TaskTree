import { expect, test } from "@playwright/test";

test("login page test", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "TaskTree" })).toBeVisible();
  await expect(page.getByText("メールアドレス")).toBeVisible();
  await expect(page.getByPlaceholder("email@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
});

test("signup link test", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "新規アカウント作成" }).click();

  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByRole("button", { name: "新規登録" })).toBeVisible();
});
