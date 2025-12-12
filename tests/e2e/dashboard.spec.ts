import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Mock NextAuth session endpoint to return authenticated session
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            name: "Test User",
            email: "test@example.com",
            image: "https://example.com/avatar.png",
            id: "123456789",
          },
          expires: "2025-12-31",
        }),
      });
    });

    // Mock authentication by setting a session cookie
    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: "mock-session-token",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Mock API responses
    await page.route("**/api/backups/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              key: "backups/dexcom_20250101.tar.gz",
              lastModified: "2025-01-01T00:00:00Z",
              size: 1048576,
            },
          ],
        }),
      });
    });

    // Mock PM2 status API
    await page.route("**/api/pm2/status", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "No Discord bot process found in PM2" }),
      });
    });
  });

  test("displays dashboard when authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Nightscout Backup Dashboard")).toBeVisible();
  });

  test("displays backup files table", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("S3 Backup Files")).toBeVisible();
    await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
  });

  test("refresh button loads backups", async ({ page }) => {
    await page.goto("/");
    
    let requestCount = 0;
    await page.route("**/api/backups/list", async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [] }),
      });
    });

    // Target the backups refresh button specifically (first one in the header, near "Create backup")
    const refreshButton = page.locator("header").getByRole("button", { name: /refresh/i });
    await refreshButton.click();

    await expect(page.getByText(/no backups found yet/i)).toBeVisible();
    expect(requestCount).toBeGreaterThan(0);
  });

  test("create backup button triggers backup", async ({ page }) => {
    await page.goto("/");

    let backupRequested = false;
    await page.route("**/api/backups/create", async (route) => {
      backupRequested = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Backup triggered." }),
      });
    });

    const createButton = page.getByRole("button", { name: /create backup/i });
    await createButton.click();

    // Wait for the API call to complete and the button to return to normal state
    // The message appears briefly but gets cleared when refreshBackups is called
    await expect(createButton).not.toHaveText(/creating/i, { timeout: 10000 });
    expect(backupRequested).toBe(true);
  });

  test.describe("Delete Backup", () => {
    test("displays delete button for each backup file", async ({ page }) => {
      await page.goto("/");
      
      // Wait for the file to be displayed
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      // Find delete buttons in the table
      const deleteButtons = page.getByRole("button", { name: /delete/i });
      await expect(deleteButtons).toBeVisible();
    });

    test("shows confirmation dialog when delete button is clicked", async ({ page }) => {
      await page.goto("/");
      
      // Wait for the file to appear in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();
      await deleteButton.click();
      
      // Wait for confirmation dialog
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
      // The filename appears in the dialog in a span with font-mono class
      await expect(page.locator('span.font-mono').filter({ hasText: "dexcom_20250101.tar.gz" })).toBeVisible();
      await expect(page.getByText(/this action cannot be undone/i)).toBeVisible();
    });

    test("closes confirmation dialog when cancel is clicked", async ({ page }) => {
      await page.goto("/");
      
      // Wait for the file to appear in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();
      await deleteButton.click();
      
      // Wait for confirmation dialog
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      
      // Click cancel
      const cancelButton = page.getByRole("button", { name: /cancel/i });
      await cancelButton.click();
      
      // Dialog should be gone
      await expect(page.getByText("Confirm Delete")).not.toBeVisible();
      
      // File should still be in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
    });

    test("successfully deletes backup when confirmed", async ({ page }) => {
      // Mock the initial list with the file
      await page.route("**/api/backups/list", async (route) => {
        const url = route.request().url();
        // Check if this is the initial load or after deletion
        if (url.includes('list') && !route.request().headers()['x-test-deleted']) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              files: [
                {
                  key: "backups/dexcom_20250101.tar.gz",
                  lastModified: "2025-01-01T00:00:00Z",
                  size: 1048576,
                },
              ],
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ files: [] }),
          });
        }
      });
      
      // Mock the delete API response
      let deleteRequested = false;
      await page.route("**/api/backups/delete?*", async (route) => {
        deleteRequested = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Backup 'backups/dexcom_20250101.tar.gz' deleted successfully.",
          }),
        });
        // Update the list route to return empty after deletion
        await page.route("**/api/backups/list", async (listRoute) => {
          await listRoute.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ files: [] }),
          });
        });
      });
      
      await page.goto("/");
      
      // Wait for the file to appear in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      // Click delete button
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();
      await deleteButton.click();
      
      // Confirm deletion - wait for dialog and use the delete button inside the dialog
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      const confirmButton = page.locator('.fixed.inset-0').getByRole("button", { name: /^delete$/i });
      await confirmButton.click();
      
      // Wait for the dialog to close and the file to be removed from the table
      // The success message appears briefly but gets cleared when refreshBackups is called
      await expect(page.getByText("Confirm Delete")).not.toBeVisible();
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).not.toBeVisible({ timeout: 10000 });
      
      expect(deleteRequested).toBe(true);
    });

    test("shows error message when delete fails", async ({ page }) => {
      await page.goto("/");
      
      // Mock the delete API to fail
      await page.route("**/api/backups/delete?*", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to delete backup from S3.",
          }),
        });
      });
      
      // Wait for the file to appear in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      // Click delete button
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();
      await deleteButton.click();
      
      // Confirm deletion - use the delete button inside the dialog
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      const confirmButton = page.locator('.fixed.inset-0').getByRole("button", { name: /^delete$/i });
      await confirmButton.click();
      
      // Wait for error message
      await expect(page.getByText(/failed to delete/i)).toBeVisible();
      
      // File should still be in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      // Dialog should be closed
      await expect(page.getByText("Confirm Delete")).not.toBeVisible();
    });

    test("delete button is disabled during deletion", async ({ page }) => {
      await page.goto("/");
      
      // Mock a slow delete API response
      await page.route("**/api/backups/delete?*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Backup deleted successfully.",
          }),
        });
      });
      
      // Wait for the file to appear in the table
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();
      await deleteButton.click();
      
      // Confirm deletion - use the delete button inside the dialog
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      const confirmButton = page.locator('.fixed.inset-0').getByRole("button", { name: /^delete$/i });
      
      // Click and check if button shows "Deleting..." state
      await confirmButton.click();
      
      // Button should show deleting state (or be disabled)
      await expect(page.getByText(/deleting/i)).toBeVisible();
    });

    test("can delete multiple files sequentially", async ({ page }) => {
      // Mock multiple files
      await page.route("**/api/backups/list", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                key: "backups/dexcom_20250101.tar.gz",
                lastModified: "2025-01-01T00:00:00Z",
                size: 1048576,
              },
              {
                key: "backups/dexcom_20250102.tar.gz",
                lastModified: "2025-01-02T00:00:00Z",
                size: 2097152,
              },
            ],
          }),
        });
      });
      
      await page.goto("/");
      
      let deleteCallCount = 0;
      await page.route("**/api/backups/delete?*", async (route) => {
        deleteCallCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Backup deleted successfully.",
          }),
        });
        
        // Update list after each deletion
        if (deleteCallCount === 1) {
          await page.route("**/api/backups/list", async (listRoute) => {
            await listRoute.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                files: [
                  {
                    key: "backups/dexcom_20250102.tar.gz",
                    lastModified: "2025-01-02T00:00:00Z",
                    size: 2097152,
                  },
                ],
              }),
            });
          });
        } else {
          await page.route("**/api/backups/list", async (listRoute) => {
            await listRoute.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ files: [] }),
            });
          });
        }
      });
      
      // Delete first file
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).toBeVisible();
      let deleteButtons = page.getByRole("button", { name: /delete/i });
      await deleteButtons.first().click();
      
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      let confirmButton = page.locator('.fixed.inset-0').getByRole("button", { name: /^delete$/i });
      await confirmButton.click();
      
      // Wait for the dialog to close and first file to be gone
      await expect(page.getByText("Confirm Delete")).not.toBeVisible();
      await expect(page.getByRole("link", { name: "dexcom_20250101.tar.gz" })).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("link", { name: "dexcom_20250102.tar.gz" })).toBeVisible();
      
      // Delete second file
      deleteButtons = page.getByRole("button", { name: /delete/i });
      await deleteButtons.first().click();
      
      await expect(page.getByText("Confirm Delete")).toBeVisible();
      confirmButton = page.locator('.fixed.inset-0').getByRole("button", { name: /^delete$/i });
      await confirmButton.click();
      
      // Wait for the dialog to close and second file to be gone
      await expect(page.getByText("Confirm Delete")).not.toBeVisible();
      
      // Both files should be gone
      await expect(page.getByRole("link", { name: "dexcom_20250102.tar.gz" })).not.toBeVisible();
      await expect(page.getByText(/no backups found yet/i)).toBeVisible();
      
      expect(deleteCallCount).toBe(2);
    });
  });
});

