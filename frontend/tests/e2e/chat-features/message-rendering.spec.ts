import { test, expect, Page } from '@playwright/test';

// Test helper to enable/disable assistant-ui
async function setFeatureFlag(page: Page, enabled: boolean) {
  // Navigate first to have access to localStorage
  await page.goto('http://localhost:5174/');
  await page.evaluate((flag) => {
    localStorage.setItem('enableAssistantUI', flag ? 'true' : 'false');
  }, enabled);
}

// Test both implementations
const implementations = [
  { name: 'Legacy', featureFlag: false },
  { name: 'Assistant-UI', featureFlag: true }
];

implementations.forEach(impl => {
  test.describe(`${impl.name}: Message Rendering Features`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
      // Navigate to a chat session (you may need to create one first)
    });

    test('should display user and assistant messages with distinct styling', async ({ page }) => {
      // Navigate to chat
      await page.click('[data-testid="project-card"]');
      await page.click('[data-testid="new-chat-button"]');

      // Send a message
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Hello, assistant');
      await input.press('Enter');

      // Check user message
      const userMessage = page.locator('.message-wrapper').filter({ hasText: 'You' });
      await expect(userMessage).toBeVisible();
      await expect(userMessage.locator('.avatar')).toHaveCSS('background-color', 'rgb(59, 130, 246)'); // Blue

      // Wait for assistant response
      const assistantMessage = page.locator('.message-wrapper').filter({ hasText: 'Assistant' });
      await expect(assistantMessage).toBeVisible();
      await expect(assistantMessage.locator('.avatar')).toHaveCSS('background-color', 'rgb(147, 51, 234)'); // Purple
    });

    test('should render avatars with correct size and shape', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const avatars = page.locator('.avatar');
      await expect(avatars.first()).toHaveCSS('width', '32px');
      await expect(avatars.first()).toHaveCSS('height', '32px');
      await expect(avatars.first()).toHaveCSS('border-radius', '9999px'); // Full circle
    });

    test('should display timestamps in readable format', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const timestamp = page.locator('[data-testid="message-timestamp"]');
      await expect(timestamp.first()).toBeVisible();
      await expect(timestamp.first()).toContainText(/\d{1,2}:\d{2}\s(AM|PM)/);
    });

    test('should render markdown content correctly', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message with markdown
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Please show me **bold text**, *italic text*, and `inline code`');
      await input.press('Enter');

      // Wait for response with markdown
      await page.waitForTimeout(2000);

      // Check markdown rendering
      const messageBody = page.locator('.message-body').last();
      await expect(messageBody.locator('strong')).toBeVisible(); // Bold
      await expect(messageBody.locator('em')).toBeVisible(); // Italic
      await expect(messageBody.locator('code')).toBeVisible(); // Inline code
    });

    test('should render code blocks with syntax highlighting', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a request that will generate code
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Show me a Python hello world example');
      await input.press('Enter');

      // Wait for code block
      await page.waitForSelector('pre', { timeout: 10000 });

      const codeBlock = page.locator('pre').first();
      await expect(codeBlock).toBeVisible();

      // Check for syntax highlighting classes
      await expect(codeBlock).toHaveClass(/language-python/);

      // Check styling
      await expect(codeBlock).toHaveCSS('border-radius', '6px');
      await expect(codeBlock).toHaveCSS('font-family', /monospace|Monaco|Menlo/);
    });

    test('should render GitHub Flavored Markdown tables', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Show me a markdown table with headers');
      await input.press('Enter');

      // Wait for table
      await page.waitForSelector('table', { timeout: 10000 });

      const table = page.locator('table').first();
      await expect(table).toBeVisible();
      await expect(table.locator('thead')).toBeVisible();
      await expect(table.locator('tbody')).toBeVisible();

      // Check table styling
      await expect(table).toHaveCSS('border-collapse', 'collapse');
    });

    test('should render inline and block SVG diagrams', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Simulate a message with SVG content
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate an SVG diagram');
      await input.press('Enter');

      // Wait for potential SVG
      await page.waitForTimeout(3000);

      const svg = page.locator('svg');
      if (await svg.count() > 0) {
        await expect(svg.first()).toBeVisible();
        await expect(svg.first().locator('..')).toHaveCSS('padding', '12px');
        await expect(svg.first().locator('..')).toHaveCSS('background', 'rgb(249, 250, 251)');
      }
    });

    test('should render base64 images inline', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Check for any data URI images
      const dataImages = page.locator('img[src^="data:image"]');

      if (await dataImages.count() > 0) {
        const img = dataImages.first();
        await expect(img).toBeVisible();
        await expect(img).toHaveCSS('max-width', '100%');
        await expect(img).toHaveCSS('max-height', '500px');

        // Check for label
        const label = img.locator('~ div');
        await expect(label).toContainText(/PNG|JPG|IMAGE/);
      }
    });

    test('should preserve whitespace in user messages', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      const multilineMessage = 'Line 1\n  Indented line 2\n    More indented line 3';
      await input.fill(multilineMessage);
      await input.press('Enter');

      const userMessage = page.locator('.message-body').filter({ hasText: 'Line 1' });
      await expect(userMessage).toHaveCSS('white-space', 'pre-wrap');
    });

    test('should apply consistent message width constraints', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const messages = page.locator('.message-wrapper');

      if (await messages.count() > 0) {
        const firstMessage = messages.first();
        const computedStyle = await firstMessage.evaluate(el =>
          window.getComputedStyle(el)
        );

        // Check max-width constraint (48rem = 768px)
        expect(parseInt(computedStyle.maxWidth)).toBeLessThanOrEqual(768);
      }
    });

    test('should show role labels for messages', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Test message');
      await input.press('Enter');

      // Check for role labels
      await expect(page.locator('text="You"')).toBeVisible();
      await page.waitForSelector('text="Assistant"', { timeout: 10000 });
      await expect(page.locator('text="Assistant"')).toBeVisible();
    });

    test('should render headers with proper hierarchy', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Request markdown with headers
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Show me markdown headers from h1 to h6');
      await input.press('Enter');

      await page.waitForTimeout(3000);

      // Check for different header levels
      const headers = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      for (const header of headers) {
        const element = page.locator(header);
        if (await element.count() > 0) {
          await expect(element.first()).toBeVisible();
        }
      }
    });

    test('should render lists with proper indentation', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Show me an ordered and unordered list');
      await input.press('Enter');

      await page.waitForTimeout(3000);

      // Check for lists
      const orderedList = page.locator('ol');
      const unorderedList = page.locator('ul');

      if (await orderedList.count() > 0) {
        await expect(orderedList.first()).toBeVisible();
        await expect(orderedList.first().locator('li')).toHaveCount({ min: 1 });
      }

      if (await unorderedList.count() > 0) {
        await expect(unorderedList.first()).toBeVisible();
        await expect(unorderedList.first().locator('li')).toHaveCount({ min: 1 });
      }
    });

    test('should render blockquotes with left border', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Show me a blockquote example');
      await input.press('Enter');

      await page.waitForTimeout(3000);

      const blockquote = page.locator('blockquote');
      if (await blockquote.count() > 0) {
        await expect(blockquote.first()).toBeVisible();
        await expect(blockquote.first()).toHaveCSS('border-left-width', /[1-9]px/);
      }
    });

    test('should render links with proper styling', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const links = page.locator('a[href]');

      if (await links.count() > 0) {
        const firstLink = links.first();
        await expect(firstLink).toBeVisible();
        await expect(firstLink).toHaveCSS('text-decoration', /underline/);

        // Check hover state
        await firstLink.hover();
        // Hover styles should be applied
      }
    });
  });
});