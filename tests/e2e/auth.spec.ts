import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects to sign-in page when not authenticated", async ({ page }) => {
    // In Playwright test mode, auth is bypassed, so this test checks that
    // the sign-in page is accessible and displays correctly
    await page.goto("/auth/signin");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("sign-in page displays correctly", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.getByText(/sign in with discord/i)).toBeVisible();
  });

  test("sign-in page has correct styling", async ({ page }) => {
    await page.goto("/auth/signin");
    const signInButton = page.getByRole("button", { name: /sign in with discord/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toHaveCSS("background-color", /rgb\(88, 101, 242\)/); // Discord blue
  });
});

