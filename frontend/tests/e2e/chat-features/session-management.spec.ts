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
  test.describe(`${impl.name}: Session Management Features`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
    });

    test('should create new session from landing page', async ({ page }) => {
      // Navigate to project
      await page.click('[data-testid="project-card"]:first-child');

      // Check for quick start input
      const quickStartInput = page.locator('textarea[placeholder*="message"], textarea').first();
      await expect(quickStartInput).toBeVisible();

      // Enter message to create session
      await quickStartInput.fill('Start new conversation');
      await quickStartInput.press('Enter');

      // Should create and navigate to new session
      await page.waitForURL(/\/chat\//);
      expect(page.url()).toContain('/chat/');

      // Message should be sent
      const messageWrapper = page.locator('.message-wrapper').filter({ hasText: 'Start new conversation' });
      await expect(messageWrapper).toBeVisible();
    });

    test('should auto-name sessions with timestamp', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project');

      const quickStartInput = page.locator('textarea').first();
      await quickStartInput.fill('Test message');
      await quickStartInput.press('Enter');

      await page.waitForURL(/\/chat\//);

      // Check session name format
      const sessionTitle = page.locator('.session-title, [data-testid="session-name"]');
      const titleText = await sessionTitle.textContent();

      // Should have date/time format (e.g., "Chat Nov 26 2:45 PM")
      expect(titleText).toMatch(/Chat.*\d{1,2}.*[AP]M/i);
    });

    test('should store pending message in sessionStorage', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project');

      const testMessage = 'This is a test message';
      const quickStartInput = page.locator('textarea').first();
      await quickStartInput.fill(testMessage);

      // Check sessionStorage before sending
      const pendingMessage = await page.evaluate(() =>
        sessionStorage.getItem('pendingMessage')
      );

      // Message should be stored
      expect(pendingMessage).toBe(testMessage);

      await quickStartInput.press('Enter');

      // Should clear after sending
      await page.waitForTimeout(1000);
      const afterSending = await page.evaluate(() =>
        sessionStorage.getItem('pendingMessage')
      );
      expect(afterSending).toBeNull();
    });

    test('should display session tabs', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/session1');

      // Check for tabs
      const sessionTabs = page.locator('.session-tabs, [data-testid="session-tab"]');

      if (await sessionTabs.count() > 0) {
        await expect(sessionTabs.first()).toBeVisible();

        // Active tab should be highlighted
        const activeTab = sessionTabs.filter({ hasText: 'session1' });
        await expect(activeTab).toHaveClass(/active|selected/);
      }
    });

    test('should switch between sessions', async ({ page }) => {
      // Create first session
      await page.goto('http://localhost:5174/projects/test-project');
      const input = page.locator('textarea').first();
      await input.fill('Session 1 message');
      await input.press('Enter');

      const session1Url = page.url();

      // Go back and create second session
      await page.goto('http://localhost:5174/projects/test-project');
      await input.fill('Session 2 message');
      await input.press('Enter');

      const session2Url = page.url();

      // URLs should be different
      expect(session1Url).not.toBe(session2Url);

      // Navigate back to first session
      if (await page.locator('.session-tabs').count() > 0) {
        await page.click('.session-tabs:first-child');
        await page.waitForURL(session1Url);
        expect(page.url()).toBe(session1Url);
      }
    });

    test('should show delete session confirmation', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Find delete button
      const deleteButton = page.locator('button[title*="Delete"], button').filter({ hasText: /🗑️|Delete|×/i });

      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();

        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], .modal, .confirmation-dialog');
        await expect(confirmDialog).toBeVisible();

        // Should have confirm and cancel buttons
        const confirmButton = confirmDialog.locator('button').filter({ hasText: /Confirm|Yes|Delete/i });
        const cancelButton = confirmDialog.locator('button').filter({ hasText: /Cancel|No/i });

        await expect(confirmButton).toBeVisible();
        await expect(cancelButton).toBeVisible();

        // Cancel deletion
        await cancelButton.click();
        await expect(confirmDialog).toBeHidden();
      }
    });

    test('should track active session', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Check active session indicator
      const activeIndicator = page.locator('.active-session, [data-active="true"]');

      if (await activeIndicator.count() > 0) {
        await expect(activeIndicator).toBeVisible();

        // Should have visual distinction
        const background = await activeIndicator.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        expect(background).not.toBe('transparent');
      }
    });

    test('should show session information', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Check session name display
      const sessionName = page.locator('.session-title, [data-testid="session-name"]');
      await expect(sessionName).toBeVisible();
      await expect(sessionName).not.toBeEmpty();

      // Check environment type badge if applicable
      const envBadge = page.locator('.environment-badge, [data-testid="environment-type"]');
      if (await envBadge.count() > 0) {
        await expect(envBadge).toBeVisible();
        const envText = await envBadge.textContent();
        expect(envText).toMatch(/python|node|sandbox/i);
      }
    });

    test('should navigate with back button', async ({ page }) => {
      const projectUrl = 'http://localhost:5174/projects/test-project';
      await page.goto(`${projectUrl}/chat/test-session`);

      // Find back button
      const backButton = page.locator('button').filter({ hasText: /←|Back|Return/i });
      await expect(backButton).toBeVisible();

      // Click back
      await backButton.click();

      // Should navigate to project view
      await page.waitForURL(projectUrl);
      expect(page.url()).toBe(projectUrl);
    });

    test('should persist session data on refresh', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Persistent message');
      await input.press('Enter');

      await page.waitForTimeout(2000);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Message should still be visible
      const message = page.locator('.message-wrapper').filter({ hasText: 'Persistent message' });
      await expect(message).toBeVisible();
    });

    test('should show recent conversations on landing page', async ({ page }) => {
      // Create a session first
      await page.goto('http://localhost:5174/projects/test-project');
      const input = page.locator('textarea').first();
      await input.fill('Recent conversation');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      // Go back to landing page
      await page.goto('http://localhost:5174/projects/test-project');

      // Check for recent conversations section
      const recentSection = page.locator('text=/Recent.*Conversations/i');
      if (await recentSection.count() > 0) {
        await expect(recentSection).toBeVisible();

        // Should show session cards
        const sessionCards = page.locator('.session-card, [data-testid="session-card"]');
        await expect(sessionCards.first()).toBeVisible();

        // Cards should be clickable
        await sessionCards.first().click();
        await page.waitForURL(/\/chat\//);
      }
    });

    test('should display session timestamps', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project');

      const sessionCards = page.locator('.session-card, [data-testid="session-card"]');

      if (await sessionCards.count() > 0) {
        const firstCard = sessionCards.first();

        // Check for creation date
        const createdDate = firstCard.locator('text=/Created|Started/i');
        if (await createdDate.count() > 0) {
          await expect(createdDate).toBeVisible();
          const dateText = await createdDate.textContent();
          expect(dateText).toMatch(/\d{1,2}/); // Should contain date
        }

        // Check for updated date
        const updatedDate = firstCard.locator('text=/Updated|Modified/i');
        if (await updatedDate.count() > 0) {
          await expect(updatedDate).toBeVisible();
        }
      }
    });

    test('should handle session URL navigation', async ({ page }) => {
      const sessionUrl = 'http://localhost:5174/projects/test-project/chat/specific-session-id';
      await page.goto(sessionUrl);

      // Should load the specific session
      expect(page.url()).toBe(sessionUrl);

      // Should show session content
      const chatArea = page.locator('.chat-viewport, .message-list');
      await expect(chatArea).toBeVisible();
    });

    test('should create session with environment type', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project');

      // Check for environment selector if available
      const envSelector = page.locator('select[name="environment"], [data-testid="env-selector"]');

      if (await envSelector.count() > 0) {
        await envSelector.selectOption('python3.11');

        const input = page.locator('textarea').first();
        await input.fill('Python session');
        await input.press('Enter');

        await page.waitForURL(/\/chat\//);

        // Check environment badge
        const badge = page.locator('.environment-badge');
        await expect(badge).toBeVisible();
        await expect(badge).toContainText(/python/i);
      }
    });

    test('should handle concurrent sessions', async ({ page, context }) => {
      // Open first session
      await page.goto('http://localhost:5174/projects/test-project/chat/session1');

      // Open second session in new tab
      const page2 = await context.newPage();
      await setFeatureFlag(page2, impl.featureFlag);
      await page2.goto('http://localhost:5174/projects/test-project/chat/session2');

      // Both should work independently
      const input1 = page.locator('textarea[placeholder*="Type your message"]');
      const input2 = page2.locator('textarea[placeholder*="Type your message"]');

      await input1.fill('Message in session 1');
      await input2.fill('Message in session 2');

      await input1.press('Enter');
      await input2.press('Enter');

      // Check messages are in correct sessions
      const message1 = page.locator('.message-wrapper').filter({ hasText: 'Message in session 1' });
      const message2 = page2.locator('.message-wrapper').filter({ hasText: 'Message in session 2' });

      await expect(message1).toBeVisible();
      await expect(message2).toBeVisible();

      await page2.close();
    });

    test('should show empty state for new sessions', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/new-empty-session');

      // Check for empty state message
      const emptyState = page.locator('text=/Start.*conversation|No messages yet/i');

      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();

        // Should have helpful prompt
        const prompt = page.locator('text=/Type.*message|How can I help/i');
        await expect(prompt).toBeVisible();
      }
    });

    test('should maintain session context during operations', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const sessionId = page.url().split('/').pop();

      // Perform operations
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Context test');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      // Session ID should remain same
      expect(page.url()).toContain(sessionId);

      // Open config modal
      const configButton = page.locator('button').filter({ hasText: /⚙️|Config|Settings/i });
      if (await configButton.count() > 0) {
        await configButton.click();
        await page.waitForTimeout(500);

        // Close modal
        const closeButton = page.locator('button').filter({ hasText: /×|Close/i });
        await closeButton.click();

        // Session should still be active
        expect(page.url()).toContain(sessionId);
      }
    });
  });
});