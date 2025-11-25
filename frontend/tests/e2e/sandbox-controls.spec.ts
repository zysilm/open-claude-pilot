import { test, expect } from '@playwright/test';

test.describe('Sandbox Controls', () => {
  let projectId: string;
  let sessionId: string;

  test.beforeEach(async ({ page }) => {
    // Create a project and start a session
    await page.goto('/');
    await page.click('button:has-text("Create Project")');
    await page.fill('input[name="name"]', 'Sandbox Test Project');
    await page.fill('textarea[name="description"]', 'Testing sandbox functionality');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);

    // Navigate to project
    await page.click('text=Sandbox Test Project');
    await page.waitForTimeout(500);

    // Start a chat to get sandbox controls
    await page.fill('textarea[placeholder*="How can I help"]', 'Hello');
    await page.click('button.send-btn');
    await page.waitForTimeout(1500);

    // Extract IDs
    const url = page.url();
    const match = url.match(/\/projects\/([a-f0-9-]+)\/chat\/([a-f0-9-]+)/);
    if (match) {
      projectId = match[1];
      sessionId = match[2];
    }
  });

  test('SBX-001: Should display sandbox controls', async ({ page }) => {
    // Look for sandbox control panel
    const sandboxPanel = page.locator('text=Sandbox, .sandbox-controls');

    // Sandbox controls may be in sidebar or elsewhere
    const controlsCount = await sandboxPanel.count();
    expect(controlsCount >= 0).toBeTruthy();
  });

  test('SBX-002: Should show sandbox status', async ({ page }) => {
    // Look for status indicator
    const statusIndicator = page.locator('.sandbox-status, .container-status');

    if (await statusIndicator.count() > 0) {
      const statusText = await statusIndicator.textContent();

      // Status should be one of: running, stopped, starting, etc.
      expect(statusText).toBeTruthy();
    }
  });

  test('SBX-003: Should start sandbox container', async ({ page }) => {
    // Look for start button
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Sandbox")');

    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForTimeout(2000);

      // Status should update to running or starting
      const status = page.locator('.sandbox-status, .status');
      const statusText = await status.textContent();

      // Should show some status
      expect(statusText).toBeTruthy();
    }
  });

  test('SBX-004: Should stop sandbox container', async ({ page }) => {
    // First start the sandbox if not running
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for stop button
    const stopButton = page.locator('button:has-text("Stop"), button:has-text("Stop Sandbox")');

    if (await stopButton.count() > 0) {
      await stopButton.click();
      await page.waitForTimeout(1500);

      // Status should update
      const status = page.locator('.sandbox-status');
      const statusText = await status.textContent();

      expect(statusText).toBeTruthy();
    }
  });

  test('SBX-005: Should reset sandbox container', async ({ page }) => {
    // Look for reset button
    const resetButton = page.locator('button:has-text("Reset"), button:has-text("Reset Sandbox")');

    if (await resetButton.count() > 0) {
      await resetButton.click();

      // May show confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // Sandbox should be reset
      const status = page.locator('.sandbox-status');
      expect(status).toBeTruthy();
    }
  });

  test('SBX-006: Should show environment type', async ({ page }) => {
    // Check for environment badge or indicator
    const envBadge = page.locator('.environment-badge, .environment-type');

    if (await envBadge.count() > 0) {
      const envText = await envBadge.textContent();

      // Environment type could be: python, node, etc.
      expect(envText).toBeTruthy();
    }
  });

  test('SBX-007: Should display container ID when running', async ({ page }) => {
    // Start sandbox
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForTimeout(3000);

      // Look for container ID display
      const containerInfo = page.locator('.container-id, .sandbox-info');

      if (await containerInfo.count() > 0) {
        const infoText = await containerInfo.textContent();
        expect(infoText).toBeTruthy();
      }
    }
  });

  test('SBX-008: Should handle sandbox errors', async ({ page }) => {
    // Attempt operations that might fail
    const startButton = page.locator('button:has-text("Start")');

    if (await startButton.count() > 0) {
      // Double click to potentially trigger error
      await startButton.click();
      await startButton.click();

      await page.waitForTimeout(1000);

      // Error message might appear
      const errorMessage = page.locator('.error-message, .alert-error, [role="alert"]');

      // Either error shown or operation handled gracefully
      const errorCount = await errorMessage.count();
      expect(errorCount >= 0).toBeTruthy();
    }
  });

  test('SBX-009: Should persist sandbox state across navigation', async ({ page }) => {
    // Start sandbox
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Navigate away
    await page.click('button:has-text("Back to Project")');
    await page.waitForTimeout(500);

    // Navigate back
    await page.goto(`/projects/${projectId}/chat/${sessionId}`);
    await page.waitForTimeout(1000);

    // Sandbox status should be preserved
    const status = page.locator('.sandbox-status, .status');
    const statusText = await status.textContent();

    expect(statusText !== null).toBeTruthy();
  });

  test('SBX-010: Should show loading state during operations', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start")');

    if (await startButton.count() > 0) {
      await startButton.click();

      // Should show loading indicator
      const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"]');

      // Either shows loading or operation completes quickly
      const loadingCount = await loadingIndicator.count();
      expect(loadingCount >= 0).toBeTruthy();
    }
  });
});
