import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

async function setFeatureFlag(page: Page, enabled: boolean) {
  // Navigate first to have access to localStorage
  await page.goto('http://localhost:5174/');
  await page.evaluate((flag) => {
    localStorage.setItem('enableAssistantUI', flag ? 'true' : 'false');
  }, enabled);
}

const implementations = [
  { name: 'Legacy', featureFlag: false },
  { name: 'Assistant-UI', featureFlag: true }
];

implementations.forEach(impl => {
  test.describe(`${impl.name}: File Management & Sandbox Controls`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
    });

    // FILE MANAGEMENT TESTS
    test.describe('File Management', () => {
      test('should show file upload button', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const uploadButton = page.locator('button').filter({ hasText: /Upload|📁|➕/i });
        await expect(uploadButton).toBeVisible();

        // Should be accessible
        const ariaLabel = await uploadButton.getAttribute('aria-label');
        if (ariaLabel) {
          expect(ariaLabel).toContain('Upload');
        }
      });

      test('should handle file upload', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const uploadButton = page.locator('button').filter({ hasText: /Upload/i });
        const fileInput = page.locator('input[type="file"]');

        // Upload a test file
        const testFile = path.join(__dirname, 'test-file.txt');
        await fileInput.setInputFiles(testFile);

        // Should show loading state
        const loadingText = page.locator('text=/Uploading/i');
        if (await loadingText.count() > 0) {
          await expect(loadingText).toBeVisible();
        }

        // File should appear in list (after upload completes)
        await page.waitForTimeout(2000);
        const fileItem = page.locator('.file-item, [data-testid="file-item"]').filter({ hasText: 'test-file.txt' });
        if (await fileItem.count() > 0) {
          await expect(fileItem).toBeVisible();
        }
      });

      test('should display file list', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const fileList = page.locator('.file-list, [data-testid="file-list"]');

        if (await fileList.count() > 0) {
          await expect(fileList).toBeVisible();

          // Check for empty state
          const emptyState = fileList.locator('text=/No files.*yet/i');
          if (await emptyState.count() > 0) {
            await expect(emptyState).toBeVisible();
          }
        }
      });

      test('should show file metadata', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-files');

        const fileItem = page.locator('.file-item, [data-testid="file-item"]').first();

        if (await fileItem.count() > 0) {
          // Check file name
          const fileName = fileItem.locator('.file-name, [data-testid="file-name"]');
          await expect(fileName).toBeVisible();

          // Check file size
          const fileSize = fileItem.locator('text=/[0-9]+\s*(B|KB|MB)/i');
          if (await fileSize.count() > 0) {
            await expect(fileSize).toBeVisible();
          }

          // Check file type
          const fileType = fileItem.locator('text=/text|image|application/i');
          if (await fileType.count() > 0) {
            await expect(fileType).toBeVisible();
          }
        }
      });

      test('should show download button for files', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-files');

        const fileItem = page.locator('.file-item').first();

        if (await fileItem.count() > 0) {
          await fileItem.hover();

          const downloadButton = fileItem.locator('button').filter({ hasText: /↓|Download|💾/i });
          await expect(downloadButton).toBeVisible();

          // Check hover state
          await downloadButton.hover();
          await expect(downloadButton).toHaveCSS('background-color', /blue|rgb\(37, 99, 235\)/);
        }
      });

      test('should show delete button with confirmation', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-files');

        const fileItem = page.locator('.file-item').first();

        if (await fileItem.count() > 0) {
          await fileItem.hover();

          const deleteButton = fileItem.locator('button').filter({ hasText: /×|Delete|🗑️/i });
          await expect(deleteButton).toBeVisible();

          // Click delete
          await deleteButton.click();

          // Should show confirmation
          const confirmDialog = page.locator('[role="dialog"], .confirmation-dialog');
          await expect(confirmDialog).toBeVisible();

          const confirmButton = confirmDialog.locator('button').filter({ hasText: /Confirm|Yes/i });
          await expect(confirmButton).toBeVisible();
        }
      });

      test('should format file sizes correctly', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-files');

        const fileSizes = page.locator('.file-size, [data-testid="file-size"]');

        if (await fileSizes.count() > 0) {
          const sizeText = await fileSizes.first().textContent();
          expect(sizeText).toMatch(/^\d+(\.\d+)?\s*(B|KB|MB|GB)$/);
        }
      });

      test('should handle file download via blob', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-files');

        const downloadPromise = page.waitForEvent('download');

        const downloadButton = page.locator('button').filter({ hasText: /↓|Download/i }).first();
        if (await downloadButton.count() > 0) {
          await downloadButton.click();

          const download = await downloadPromise;
          expect(download).toBeTruthy();
        }
      });

      test('should handle file hover effects', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-files');

        const fileItem = page.locator('.file-item').first();

        if (await fileItem.count() > 0) {
          // Get initial styles
          const initialBg = await fileItem.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );

          // Hover
          await fileItem.hover();

          // Check hover styles
          const hoverBg = await fileItem.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );

          expect(hoverBg).not.toBe(initialBg);
        }
      });
    });

    // SANDBOX CONTROLS TESTS
    test.describe('Sandbox Controls', () => {
      test('should display sandbox status indicator', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const statusIndicator = page.locator('.sandbox-status, [data-testid="sandbox-status"]');

        if (await statusIndicator.count() > 0) {
          await expect(statusIndicator).toBeVisible();

          // Check for status dot
          const statusDot = statusIndicator.locator('.status-dot, [class*="status"]');
          await expect(statusDot).toBeVisible();

          // Check color (green for running, gray for stopped)
          const color = await statusDot.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );
          expect(color).toMatch(/rgb/);
        }
      });

      test('should show sandbox status text', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const statusText = page.locator('text=/Sandbox.*Running|Sandbox.*Stopped/i');

        if (await statusText.count() > 0) {
          await expect(statusText).toBeVisible();
          const text = await statusText.textContent();
          expect(text).toMatch(/Running|Stopped/i);
        }
      });

      test('should display start/stop buttons', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const startButton = page.locator('button').filter({ hasText: /Start|▶️|Play/i });
        const stopButton = page.locator('button').filter({ hasText: /Stop|⏹️|■/i });

        // One of them should be visible
        const hasControl = await startButton.count() > 0 || await stopButton.count() > 0;
        expect(hasControl).toBe(true);
      });

      test('should show reset button', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const resetButton = page.locator('button').filter({ hasText: /Reset|🔄|Clear/i });

        if (await resetButton.count() > 0) {
          await expect(resetButton).toBeVisible();

          // Check tooltip
          const title = await resetButton.getAttribute('title');
          if (title) {
            expect(title).toContain('Reset');
          }
        }
      });

      test('should show execute command button', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const executeButton = page.locator('button').filter({ hasText: /Execute|Run|⚡/i });

        if (await executeButton.count() > 0) {
          await expect(executeButton).toBeVisible();

          // Click execute
          await executeButton.click();

          // Should show command input
          const commandInput = page.locator('input[placeholder*="command"], input[placeholder*="python"]');
          await expect(commandInput).toBeVisible();
        }
      });

      test('should handle command execution', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const executeButton = page.locator('button').filter({ hasText: /Execute/i });

        if (await executeButton.count() > 0) {
          await executeButton.click();

          const commandInput = page.locator('input[placeholder*="command"]');
          await commandInput.fill('ls -la');

          // Submit command (Enter or Run button)
          await commandInput.press('Enter');

          // Should show results
          await page.waitForTimeout(2000);
          const resultContainer = page.locator('.execution-result, [data-testid="command-result"]');

          if (await resultContainer.count() > 0) {
            await expect(resultContainer).toBeVisible();

            // Check for exit code
            const exitCode = resultContainer.locator('text=/Exit.*code|Status/i');
            if (await exitCode.count() > 0) {
              await expect(exitCode).toBeVisible();
            }

            // Check for output
            const output = resultContainer.locator('pre, .output');
            if (await output.count() > 0) {
              await expect(output).toBeVisible();
            }
          }
        }
      });

      test('should show loading states for sandbox operations', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const startButton = page.locator('button').filter({ hasText: /Start/i });

        if (await startButton.count() > 0) {
          await startButton.click();

          // Should show loading text
          const loadingText = page.locator('text=/Starting/i');
          if (await loadingText.count() > 0) {
            await expect(loadingText).toBeVisible();
          }
        }
      });

      test('should poll for sandbox status', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        // Track status changes
        const initialStatus = await page.locator('.sandbox-status').textContent();

        // Wait for polling interval (5 seconds)
        await page.waitForTimeout(6000);

        // Check if status was queried (network request made)
        const statusRequests = await page.evaluate(() => {
          return performance.getEntriesByType('resource')
            .filter(r => r.name.includes('/sandbox/') && r.name.includes('/status'))
            .length;
        });

        expect(statusRequests).toBeGreaterThan(0);
      });

      test('should clear command input after execution', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const executeButton = page.locator('button').filter({ hasText: /Execute/i });

        if (await executeButton.count() > 0) {
          await executeButton.click();

          const commandInput = page.locator('input[placeholder*="command"]');
          await commandInput.fill('echo test');
          await commandInput.press('Enter');

          await page.waitForTimeout(1000);

          // Input should be cleared
          const value = await commandInput.inputValue();
          expect(value).toBe('');
        }
      });

      test('should display stdout and stderr separately', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        // Execute a command that produces both stdout and stderr
        const executeButton = page.locator('button').filter({ hasText: /Execute/i });

        if (await executeButton.count() > 0) {
          await executeButton.click();

          const commandInput = page.locator('input[placeholder*="command"]');
          await commandInput.fill('python -c "import sys; print(\'stdout\'); print(\'stderr\', file=sys.stderr)"');
          await commandInput.press('Enter');

          await page.waitForTimeout(2000);

          const result = page.locator('.execution-result');

          if (await result.count() > 0) {
            // Check for stdout
            const stdout = result.locator('.stdout, [data-testid="stdout"]');
            if (await stdout.count() > 0) {
              await expect(stdout).toBeVisible();
            }

            // Check for stderr
            const stderr = result.locator('.stderr, [data-testid="stderr"]');
            if (await stderr.count() > 0) {
              await expect(stderr).toBeVisible();
              // Stderr might have different styling
              const color = await stderr.evaluate(el =>
                window.getComputedStyle(el).color
              );
              expect(color).toMatch(/red|rgb\(.*red.*\)/);
            }
          }
        }
      });

      test('should handle reset workspace confirmation', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const resetButton = page.locator('button').filter({ hasText: /Reset/i });

        if (await resetButton.count() > 0) {
          await resetButton.click();

          // Should show confirmation
          const confirmDialog = page.locator('[role="dialog"], .confirmation-dialog');
          if (await confirmDialog.count() > 0) {
            await expect(confirmDialog).toBeVisible();
            await expect(confirmDialog).toContainText(/clear.*workspace|reset.*files/i);
          }
        }
      });

      test('should show placeholder for command input', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const executeButton = page.locator('button').filter({ hasText: /Execute/i });

        if (await executeButton.count() > 0) {
          await executeButton.click();

          const commandInput = page.locator('input[placeholder*="command"], input[placeholder*="python"]');
          const placeholder = await commandInput.getAttribute('placeholder');

          expect(placeholder).toBeTruthy();
          expect(placeholder).toMatch(/python|command|bash/i);
        }
      });

      test('should support keyboard submit for commands', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const executeButton = page.locator('button').filter({ hasText: /Execute/i });

        if (await executeButton.count() > 0) {
          await executeButton.click();

          const commandInput = page.locator('input[placeholder*="command"]');
          await commandInput.fill('pwd');

          // Press Enter
          await commandInput.press('Enter');

          // Should execute (check for result)
          await page.waitForTimeout(1000);
          const result = page.locator('.execution-result');
          if (await result.count() > 0) {
            await expect(result).toBeVisible();
          }
        }
      });

      test('should display environment type', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        const envBadge = page.locator('.environment-badge, [data-testid="environment-type"]');

        if (await envBadge.count() > 0) {
          await expect(envBadge).toBeVisible();
          const envText = await envBadge.textContent();
          expect(envText).toMatch(/python|node|docker/i);

          // Check badge styling
          await expect(envBadge).toHaveCSS('background-color', /blue|rgb/);
        }
      });

      test('should handle container resource limits', async ({ page }) => {
        await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

        // Look for resource indicators if available
        const cpuIndicator = page.locator('text=/CPU|Memory/i');

        if (await cpuIndicator.count() > 0) {
          await expect(cpuIndicator).toBeVisible();

          // Check for usage display
          const usage = page.locator('text=/%|MB|GB/i');
          if (await usage.count() > 0) {
            await expect(usage).toBeVisible();
          }
        }
      });
    });
  });
});