import { expect, test } from "@playwright/test";

/**
 * Smoke tests for unauthenticated access and public routes.
 * Authenticated tests require TEST_USER_EMAIL and TEST_USER_PASSWORD env vars.
 * When those vars are absent the authenticated group is skipped automatically.
 */

test.describe("public routes", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "TaskTree" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("button", { name: "新規登録" })).toBeVisible();
  });

  test("unauthenticated dashboard access redirects away from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // should not stay on /dashboard when unauthenticated
    await expect(page).not.toHaveURL(/\/dashboard(?!\/)/, { timeout: 5000 });
  });
});

test.describe("authenticated smoke", () => {
  test.beforeEach(async ({}, testInfo) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      testInfo.skip(
        true,
        "TEST_USER_EMAIL / TEST_USER_PASSWORD not set — skipping authenticated smoke tests",
      );
    }
  });

  test("dashboard loads case list section", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto("/");
    await page.getByPlaceholder("email@example.com").fill(email);
    await page.getByLabel("パスワード").fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText("案件一覧")).toBeVisible();
  });

  test("case search input is visible on dashboard", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto("/");
    await page.getByPlaceholder("email@example.com").fill(email);
    await page.getByLabel("パスワード").fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByPlaceholder("タイトル・説明・ID で検索")).toBeVisible();
  });

  test("case search filters sort and board toggle are usable", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto("/");
    await page.getByPlaceholder("email@example.com").fill(email);
    await page.getByLabel("パスワード").fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.getByPlaceholder("タイトル・説明・ID で検索").fill("smoke");
    await page.getByRole("combobox").nth(0).selectOption("REQUEST");
    await page.getByRole("combobox").nth(1).selectOption("WAITING");
    await page.getByRole("combobox").nth(2).selectOption("DIRECT");
    await page.getByRole("combobox").nth(3).selectOption("ALL");
    await page.getByRole("combobox").nth(4).selectOption("caseType");

    await expect(page.getByPlaceholder("タイトル・説明・ID で検索")).toHaveValue("smoke");
    await page.getByTitle("ボード表示").click();

    await expect(page.getByText("対応中")).toBeVisible();
    await expect(page.getByText("レビュー依頼")).toBeVisible();
    await expect(page.getByText("待機中")).toBeVisible();
    await expect(page.getByText("再開")).toBeVisible();
    await expect(page.getByText("保留")).toBeVisible();
    await expect(page.getByText("完了")).toBeVisible();
    await expect(page.getByText("キャンセル")).toBeVisible();

    await page.getByTitle("リスト表示").click();
    await expect(page.getByPlaceholder("タイトル・説明・ID で検索")).toBeVisible();
  });
});
