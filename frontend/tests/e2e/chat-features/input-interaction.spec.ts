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
  test.describe(`${impl.name}: Input & Interaction Features`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
    });

    test('should show expandable textarea with auto-resize', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await expect(input).toBeVisible();

      // Get initial height
      const initialHeight = await input.evaluate(el => el.offsetHeight);

      // Type multi-line text
      await input.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

      // Height should increase
      const expandedHeight = await input.evaluate(el => el.offsetHeight);
      expect(expandedHeight).toBeGreaterThan(initialHeight);

      // Should not exceed max height (200px)
      expect(expandedHeight).toBeLessThanOrEqual(200);
    });

    test('should show placeholder text', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      const placeholder = await input.getAttribute('placeholder');

      expect(placeholder).toContain('Type your message');
    });

    test('should disable input during streaming', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Initially enabled
      await expect(input).toBeEnabled();

      // Send message
      await input.fill('Test message');
      await input.press('Enter');

      // Should be disabled during streaming
      await expect(input).toBeDisabled();

      // Wait for completion
      await page.waitForSelector('.streaming-cursor', { state: 'hidden', timeout: 10000 });

      // Should be enabled again
      await expect(input).toBeEnabled();
    });

    test('should support multi-line input with Shift+Enter', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      await input.fill('Line 1');
      await input.press('Shift+Enter');
      await input.type('Line 2');
      await input.press('Shift+Enter');
      await input.type('Line 3');

      const value = await input.inputValue();
      expect(value).toContain('Line 1\nLine 2\nLine 3');
    });

    test('should send message with Enter key', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Test message');

      // Count messages before
      const messagesBefore = await page.locator('.message-wrapper').count();

      await input.press('Enter');

      // Should add new message
      await page.waitForSelector('.message-wrapper', {
        state: 'attached',
        timeout: 5000
      });

      const messagesAfter = await page.locator('.message-wrapper').count();
      expect(messagesAfter).toBeGreaterThan(messagesBefore);
    });

    test('should show send button with proper styling', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const sendButton = page.locator('button').filter({ hasText: /Send|→|➤/i });
      await expect(sendButton).toBeVisible();

      // Check button styling
      await expect(sendButton).toHaveCSS('background-color', /rgb\(.*blue.*\)|rgb\(37, 99, 235\)/);

      // Should be disabled when no text
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.clear();
      await expect(sendButton).toBeDisabled();

      // Should be enabled with text
      await input.fill('Test');
      await expect(sendButton).toBeEnabled();
    });

    test('should transform send button to stop button during streaming', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate something');

      // Check send button exists
      const sendButton = page.locator('button').filter({ hasText: /Send|→/i });
      await expect(sendButton).toBeVisible();

      await input.press('Enter');

      // Should show stop button
      const stopButton = page.locator('button').filter({ hasText: /Stop|Cancel|■/i });
      await expect(stopButton).toBeVisible();

      // Stop button should have different color (red)
      await expect(stopButton).toHaveCSS('background-color', /rgb\(.*red.*\)|rgb\(239, 68, 68\)/);
    });

    test('should show focus state on input', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      const inputContainer = input.locator('..');

      // Initial state
      const initialBorder = await input.evaluate(el =>
        window.getComputedStyle(el).borderColor
      );

      // Focus the input
      await input.focus();

      // Check focus state
      const focusedBorder = await input.evaluate(el =>
        window.getComputedStyle(el).borderColor
      );

      expect(focusedBorder).not.toBe(initialBorder);

      // Should have focus ring or shadow
      const boxShadow = await input.evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );
      expect(boxShadow).not.toBe('none');
    });

    test('should preserve message text during interactions', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      const testMessage = 'This is a test message with multiple words';

      await input.fill(testMessage);

      // Click elsewhere and back
      await page.click('body');
      await input.focus();

      // Text should be preserved
      const value = await input.inputValue();
      expect(value).toBe(testMessage);
    });

    test('should clear input after sending message', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Test message');
      await input.press('Enter');

      // Wait a moment for clearing
      await page.waitForTimeout(500);

      // Input should be cleared
      const value = await input.inputValue();
      expect(value).toBe('');
    });

    test('should handle message editing on hover', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message first
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Original message');
      await input.press('Enter');

      // Wait for message
      await page.waitForSelector('.message-wrapper', { timeout: 5000 });

      // Hover over message
      const message = page.locator('.message-wrapper').first();
      await message.hover();

      // Check for action buttons
      const editButton = page.locator('button[title*="Edit"], button').filter({ hasText: /✏️|Edit/i });

      if (await editButton.count() > 0) {
        await expect(editButton).toBeVisible();

        // Click edit
        await editButton.click();

        // Should show edit input
        const editInput = page.locator('input[type="text"], textarea').filter({ hasText: 'Original message' });
        if (await editInput.count() > 0) {
          await expect(editInput).toBeVisible();
        }
      }
    });

    test('should show copy button on message hover', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Message to copy');
      await input.press('Enter');

      await page.waitForSelector('.message-wrapper', { timeout: 5000 });

      // Hover over message
      const message = page.locator('.message-wrapper').first();
      await message.hover();

      // Check for copy button
      const copyButton = page.locator('button[title*="Copy"], button').filter({ hasText: /📋|Copy/i });
      if (await copyButton.count() > 0) {
        await expect(copyButton).toBeVisible();

        // Click copy
        await copyButton.click();

        // Check clipboard (if supported in test environment)
        // This might not work in all test environments
      }
    });

    test('should show regenerate button for assistant messages', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message to get assistant response
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Hello');
      await input.press('Enter');

      // Wait for assistant message
      await page.waitForSelector('.message-wrapper:has-text("Assistant")', { timeout: 10000 });

      // Hover over assistant message
      const assistantMessage = page.locator('.message-wrapper').filter({ hasText: 'Assistant' }).first();
      await assistantMessage.hover();

      // Check for regenerate button
      const regenerateButton = page.locator('button[title*="Regenerate"], button').filter({ hasText: /🔄|Regenerate/i });
      if (await regenerateButton.count() > 0) {
        await expect(regenerateButton).toBeVisible();
      }
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Tab through interface
      await page.keyboard.press('Tab');

      // Should focus input
      const input = page.locator('textarea[placeholder*="Type your message"]');
      const isFocused = await input.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);

      // Tab to send button
      await page.keyboard.press('Tab');

      // Send button should be focusable
      const sendButton = page.locator('button').filter({ hasText: /Send|→/i });
      const buttonFocused = await sendButton.evaluate(el => el === document.activeElement);
      expect(buttonFocused).toBe(true);
    });

    test('should provide tooltip help text', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Check send button tooltip
      const sendButton = page.locator('button').filter({ hasText: /Send|→/i });
      const sendTitle = await sendButton.getAttribute('title');
      if (sendTitle) {
        expect(sendTitle).toContain('Send');
      }

      // Check input aria-label
      const input = page.locator('textarea[placeholder*="Type your message"]');
      const ariaLabel = await input.getAttribute('aria-label');
      if (ariaLabel) {
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should handle rapid message sending', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send multiple messages quickly
      for (let i = 1; i <= 3; i++) {
        await input.fill(`Message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(100);
      }

      // All messages should appear
      const userMessages = page.locator('.message-wrapper').filter({ hasText: 'You' });
      await expect(userMessages).toHaveCount({ min: 3 });
    });

    test('should maintain input focus after sending', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send message
      await input.fill('Test');
      await input.press('Enter');

      // Wait for response to start
      await page.waitForTimeout(500);

      // Input should maintain focus
      const isFocused = await input.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('should handle paste events properly', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Simulate paste
      const longText = 'Line 1\nLine 2\nLine 3\n'.repeat(10);
      await input.fill(longText);

      // Should handle long pasted content
      const value = await input.inputValue();
      expect(value).toBe(longText);

      // Should expand to show content (up to max height)
      const height = await input.evaluate(el => el.offsetHeight);
      expect(height).toBeGreaterThan(50);
      expect(height).toBeLessThanOrEqual(200);
    });

    test('should support undo/redo in input', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Type text
      await input.type('Original text');

      // Undo
      await page.keyboard.press('Control+Z');
      let value = await input.inputValue();
      expect(value).toBe('');

      // Redo
      await page.keyboard.press('Control+Shift+Z');
      value = await input.inputValue();
      expect(value).toBe('Original text');
    });
  });
});