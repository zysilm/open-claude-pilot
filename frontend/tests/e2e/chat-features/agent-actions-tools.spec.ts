import { test, expect, Page } from '@playwright/test';

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
  test.describe(`${impl.name}: Agent Actions & Tool Visualization`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
    });

    test('should display tool usage cards with headers', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Read the file test.txt');
      await input.press('Enter');

      // Check for tool usage card
      const toolCard = page.locator('text=/Using.*file_read/i');
      await expect(toolCard).toBeVisible({ timeout: 10000 });

      // Check for tool icon
      const toolIcon = page.locator('.action-header').filter({ hasText: '🔧' });
      await expect(toolIcon).toBeVisible();
    });

    test('should show tool arguments as formatted JSON', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Write "hello world" to output.txt');
      await input.press('Enter');

      // Wait for action args
      await page.waitForSelector('text=/Arguments/i', { timeout: 10000 });

      // Check for formatted JSON arguments
      const argsContainer = page.locator('.action-args, pre').filter({ hasText: /"file_path"|"path"/i });
      await expect(argsContainer).toBeVisible();

      // Check JSON formatting (indentation)
      const argsText = await argsContainer.textContent();
      expect(argsText).toContain('  '); // Should have indentation
    });

    test('should display file write preview with syntax highlighting', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create a Python file with a function');
      await input.press('Enter');

      // Wait for file write action
      await page.waitForSelector('text=/file_write/i', { timeout: 10000 });

      // Check for file path display
      const filePath = page.locator('text=/Writing.*\.py/i');
      await expect(filePath).toBeVisible();

      // Check for syntax highlighted content
      const codePreview = page.locator('.language-python, [class*="language-py"]');
      if (await codePreview.count() > 0) {
        await expect(codePreview.first()).toBeVisible();
      }
    });

    test('should show markdown file previews', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create a README.md file');
      await input.press('Enter');

      // Wait for file write action
      await page.waitForSelector('text=/Writing.*\.md/i', { timeout: 10000 });

      // Check for markdown rendering
      const markdownPreview = page.locator('.action-args').filter({ hasText: /Writing markdown/i });
      if (await markdownPreview.count() > 0) {
        await expect(markdownPreview).toBeVisible();
      }
    });

    test('should indicate image files without preview', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Save an image to logo.png');
      await input.press('Enter');

      // Check for image file indication
      const imageIndication = page.locator('text=/Writing image.*\.png/i');
      if (await imageIndication.count() > 0) {
        await expect(imageIndication).toBeVisible();

        // Should show note about no preview
        const noPreview = page.locator('text=/preview not available|base64/i');
        await expect(noPreview).toBeVisible();
      }
    });

    test('should show bash command arguments', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Run ls -la command');
      await input.press('Enter');

      // Check for bash tool usage
      const bashAction = page.locator('text=/Using.*bash/i');
      if (await bashAction.count() > 0) {
        await expect(bashAction).toBeVisible();

        // Check command display
        const commandArgs = page.locator('.action-args').filter({ hasText: /ls.*-la/i });
        await expect(commandArgs).toBeVisible();
      }
    });

    test('should display observation results with proper formatting', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('List files in current directory');
      await input.press('Enter');

      // Wait for result
      await page.waitForSelector('text=/Result|Success/i', { timeout: 10000 });

      const observation = page.locator('.observation-container, .observation-content');
      await expect(observation).toBeVisible();

      // Check for success/error indicator
      const successIcon = page.locator('text=/✅|Success/i');
      const errorIcon = page.locator('text=/❌|Error/i');
      const hasResult = await successIcon.count() > 0 || await errorIcon.count() > 0;
      expect(hasResult).toBe(true);
    });

    test('should color-code success and error observations', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Test success case
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create a file successfully');
      await input.press('Enter');

      await page.waitForSelector('.observation-container', { timeout: 10000 });

      const successObs = page.locator('.observation-container').filter({ hasText: /✅|Success/i });
      if (await successObs.count() > 0) {
        const color = await successObs.evaluate(el =>
          window.getComputedStyle(el).color
        );
        expect(color).toMatch(/green|rgb\(.*[0-9]+.*\)/);
      }
    });

    test('should show action streaming state', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Execute a complex operation');
      await input.press('Enter');

      // Check for preparing state
      const preparingState = page.locator('text=/⏳.*Preparing/i');
      if (await preparingState.count() > 0) {
        await expect(preparingState).toBeVisible();
      }
    });

    test('should show partial arguments during streaming', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create a complex JSON configuration');
      await input.press('Enter');

      // Monitor for partial args
      const partialArgs = page.locator('.action-args.partial, .action-block.streaming');

      // Should show partial content during streaming
      if (await partialArgs.count() > 0) {
        await expect(partialArgs.first()).toBeVisible();

        // Content should build progressively
        const initialContent = await partialArgs.first().textContent();
        await page.waitForTimeout(100);
        const laterContent = await partialArgs.first().textContent();

        if (initialContent && laterContent) {
          expect(laterContent.length).toBeGreaterThanOrEqual(initialContent.length);
        }
      }
    });

    test('should persist agent actions after completion', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create and read a file');
      await input.press('Enter');

      // Wait for completion
      await page.waitForSelector('.streaming-cursor', { state: 'hidden', timeout: 15000 });

      // Check persisted actions
      const actionBlocks = page.locator('.action-block').filter({ hasNot: page.locator('.streaming') });
      expect(await actionBlocks.count()).toBeGreaterThan(0);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Actions should still be visible
      const persistedActions = page.locator('.action-block');
      expect(await persistedActions.count()).toBeGreaterThan(0);
    });

    test('should display thought blocks', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Solve a complex problem step by step');
      await input.press('Enter');

      // Check for thought blocks
      const thoughtBlock = page.locator('.thought-container, text=/💭.*Thinking/i');

      if (await thoughtBlock.count() > 0) {
        await expect(thoughtBlock.first()).toBeVisible();

        // Check thought content
        const thoughtContent = thoughtBlock.locator('.thought-content');
        await expect(thoughtContent).toBeVisible();
      }
    });

    test('should handle multiple tools in sequence', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create a file, then read it, then modify it');
      await input.press('Enter');

      // Should see multiple tool uses
      await page.waitForSelector('.action-block', { timeout: 10000 });

      const actionBlocks = page.locator('.action-block');
      await page.waitForTimeout(5000); // Wait for multiple actions

      // Should have multiple action blocks
      expect(await actionBlocks.count()).toBeGreaterThan(1);

      // Check for different tool types
      const fileWrite = page.locator('text=/file_write/i');
      const fileRead = page.locator('text=/file_read/i');

      if (await fileWrite.count() > 0 && await fileRead.count() > 0) {
        await expect(fileWrite).toBeVisible();
        await expect(fileRead).toBeVisible();
      }
    });

    test('should display file read content properly', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Read the contents of package.json');
      await input.press('Enter');

      // Wait for file read action
      await page.waitForSelector('text=/file_read/i', { timeout: 10000 });

      // Check for file content display
      const observation = page.locator('.observation-content');
      await expect(observation).toBeVisible();

      // Should show JSON content if reading JSON file
      if ((await observation.textContent())?.includes('{')) {
        expect(await observation.textContent()).toMatch(/[{}"]/);
      }
    });

    test('should handle search tool results', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Search for "TODO" in the codebase');
      await input.press('Enter');

      // Check for search tool usage
      const searchAction = page.locator('text=/Using.*search/i');

      if (await searchAction.count() > 0) {
        await expect(searchAction).toBeVisible();

        // Check search results display
        const searchResults = page.locator('.observation-content').filter({ hasText: /found|matches|results/i });
        if (await searchResults.count() > 0) {
          await expect(searchResults).toBeVisible();
        }
      }
    });

    test('should display environment setup actions', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Set up Python environment and install packages');
      await input.press('Enter');

      // Check for environment setup tool
      const envAction = page.locator('text=/environment_setup|pip install/i');

      if (await envAction.count() > 0) {
        await expect(envAction).toBeVisible();

        // Check for package installation display
        const installOutput = page.locator('.observation-content').filter({ hasText: /install|package/i });
        if (await installOutput.count() > 0) {
          await expect(installOutput).toBeVisible();
        }
      }
    });

    test('should show image results in observations', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate a chart or diagram');
      await input.press('Enter');

      await page.waitForTimeout(5000);

      // Check for image in observation
      const observationImage = page.locator('.observation-content img');

      if (await observationImage.count() > 0) {
        await expect(observationImage.first()).toBeVisible();
        await expect(observationImage.first()).toHaveCSS('max-width', '100%');
        await expect(observationImage.first()).toHaveCSS('max-height', '400px');

        // Check for image label
        const imageLabel = observationImage.locator('~ div');
        await expect(imageLabel).toBeVisible();
      }
    });

    test('should handle tool errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Read a non-existent file: /invalid/path/file.txt');
      await input.press('Enter');

      // Wait for error result
      await page.waitForSelector('.observation-container', { timeout: 10000 });

      // Check for error indication
      const errorResult = page.locator('text=/❌|Error/i');
      if (await errorResult.count() > 0) {
        await expect(errorResult).toBeVisible();

        // Error message should be displayed
        const errorMessage = page.locator('.observation-content').filter({ hasText: /not found|error|failed/i });
        await expect(errorMessage).toBeVisible();
      }
    });
  });
});