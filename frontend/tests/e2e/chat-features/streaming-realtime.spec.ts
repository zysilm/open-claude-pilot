import { test, expect, Page, WebSocket } from '@playwright/test';

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
  test.describe(`${impl.name}: Streaming & Real-time Features`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
    });

    test('should display streaming cursor during message generation', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Tell me a story');
      await input.press('Enter');

      // Check for streaming cursor
      const streamingCursor = page.locator('.streaming-cursor, [data-testid="streaming-cursor"]');
      await expect(streamingCursor).toBeVisible({ timeout: 5000 });

      // Check cursor animation
      await expect(streamingCursor).toHaveCSS('animation-name', /blink|pulse/);
    });

    test('should progressively render text during streaming', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Count from 1 to 10');
      await input.press('Enter');

      // Get the assistant message container
      const assistantMessage = page.locator('.message-wrapper').filter({ hasText: 'Assistant' }).last();
      const messageBody = assistantMessage.locator('.message-body');

      // Track text length changes
      let previousLength = 0;
      let increases = 0;

      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(100);
        const text = await messageBody.textContent() || '';
        if (text.length > previousLength) {
          increases++;
        }
        previousLength = text.length;
      }

      // Should see progressive text updates
      expect(increases).toBeGreaterThan(0);
    });

    test('should maintain 33 updates/second streaming speed', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Monitor streaming updates
      let updateCount = 0;
      await page.exposeFunction('onStreamUpdate', () => {
        updateCount++;
      });

      await page.evaluate(() => {
        const observer = new MutationObserver(() => {
          (window as any).onStreamUpdate();
        });

        const messageElements = document.querySelectorAll('.message-body');
        messageElements.forEach(el => {
          observer.observe(el, { childList: true, subtree: true, characterData: true });
        });
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate a long response');
      await input.press('Enter');

      // Measure updates over 1 second
      await page.waitForTimeout(1000);

      // Should be around 30-35 updates per second for optimal streaming
      expect(updateCount).toBeGreaterThan(25);
      expect(updateCount).toBeLessThan(40);
    });

    test('should handle WebSocket connection properly', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Monitor WebSocket connections
      const wsConnections: string[] = [];
      page.on('websocket', ws => {
        wsConnections.push(ws.url());
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Test message');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      // Should have WebSocket connection
      const chatWs = wsConnections.find(url =>
        url.includes('/api/v1/chats/') && url.includes('/stream')
      );
      expect(chatWs).toBeTruthy();
    });

    test('should batch streaming updates efficiently', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Track render counts
      await page.evaluate(() => {
        (window as any).renderCount = 0;
        const originalRender = (window as any).React?.createElement || (() => {});

        // Mock React render counting (simplified)
        const observer = new MutationObserver(() => {
          (window as any).renderCount++;
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate text');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      const renderCount = await page.evaluate(() => (window as any).renderCount);

      // Should batch updates (not render for every character)
      expect(renderCount).toBeLessThan(100); // Much less than character count
    });

    test('should show isStreaming state correctly', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Input should be enabled initially
      await expect(input).toBeEnabled();

      await input.fill('Test streaming');
      await input.press('Enter');

      // Input should be disabled during streaming
      await expect(input).toBeDisabled();

      // Wait for streaming to complete
      await page.waitForSelector('.streaming-cursor', { state: 'hidden', timeout: 10000 });

      // Input should be enabled again
      await expect(input).toBeEnabled();
    });

    test('should handle multiple message types in stream', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Send a message that triggers tool usage
      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Create a file named test.py with hello world');
      await input.press('Enter');

      // Should see different event types
      await expect(page.locator('text=/Using.*file_write/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Result|Success/i')).toBeVisible({ timeout: 10000 });
    });

    test('should handle stream errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Simulate network interruption
      await page.route('**/api/v1/chats/*/stream', route => {
        setTimeout(() => route.abort(), 500);
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Test error handling');
      await input.press('Enter');

      // Should show error state
      const errorBanner = page.locator('[data-testid="error-banner"], .error-banner');
      await expect(errorBanner).toBeVisible({ timeout: 5000 });
    });

    test('should support stream cancellation', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate a very long response');
      await input.press('Enter');

      // Wait for streaming to start
      await expect(page.locator('.streaming-cursor')).toBeVisible({ timeout: 5000 });

      // Click stop/cancel button
      const stopButton = page.locator('button').filter({ hasText: /Stop|Cancel/i });
      await stopButton.click();

      // Streaming should stop
      await expect(page.locator('.streaming-cursor')).toBeHidden({ timeout: 2000 });
    });

    test('should reconnect WebSocket on connection loss', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Track WebSocket reconnections
      let connectionCount = 0;
      page.on('websocket', () => {
        connectionCount++;
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Test 1');
      await input.press('Enter');

      await page.waitForTimeout(2000);

      // Simulate connection loss
      await page.evaluate(() => {
        // Force close any WebSocket connections
        const sockets = (window as any).WebSocket.prototype;
        if (sockets && sockets.close) {
          sockets.close();
        }
      });

      await input.fill('Test 2');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      // Should have reconnected
      expect(connectionCount).toBeGreaterThan(1);
    });

    test('should buffer events during streaming', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Track event buffering
      await page.evaluate(() => {
        (window as any).eventTimestamps = [];

        // Monitor DOM updates
        const observer = new MutationObserver((mutations) => {
          (window as any).eventTimestamps.push(Date.now());
        });

        const messageContainer = document.querySelector('.message-list, .chat-viewport');
        if (messageContainer) {
          observer.observe(messageContainer, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate content');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      const timestamps = await page.evaluate(() => (window as any).eventTimestamps);

      // Calculate intervals between updates
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }

      // Should see batched updates around 30ms intervals
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      expect(avgInterval).toBeGreaterThan(20); // At least 20ms between updates
      expect(avgInterval).toBeLessThan(50); // No more than 50ms
    });

    test('should maintain smooth animation during streaming', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Measure FPS during streaming
      const metrics = await page.evaluate(() =>
        new Promise<{ fps: number }>((resolve) => {
          let frames = 0;
          let lastTime = performance.now();

          const measureFPS = () => {
            frames++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
              resolve({ fps: frames });
            } else {
              requestAnimationFrame(measureFPS);
            }
          };

          requestAnimationFrame(measureFPS);
        })
      );

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate animation test');
      await input.press('Enter');

      // Should maintain 60 FPS
      expect(metrics.fps).toBeGreaterThan(50);
    });

    test('should handle concurrent streams properly', async ({ page }) => {
      // Open two chat sessions in different tabs
      const page2 = await page.context().newPage();
      await setFeatureFlag(page2, impl.featureFlag);

      await page.goto('http://localhost:5174/projects/test-project/chat/session1');
      await page2.goto('http://localhost:5174/projects/test-project/chat/session2');

      // Send messages in both
      const input1 = page.locator('textarea[placeholder*="Type your message"]');
      const input2 = page2.locator('textarea[placeholder*="Type your message"]');

      await input1.fill('Message in session 1');
      await input2.fill('Message in session 2');

      await input1.press('Enter');
      await input2.press('Enter');

      // Both should stream independently
      await expect(page.locator('.streaming-cursor')).toBeVisible();
      await expect(page2.locator('.streaming-cursor')).toBeVisible();

      await page2.close();
    });

    test('should persist stream events correctly', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Execute a tool');
      await input.press('Enter');

      // Wait for completion
      await page.waitForSelector('.streaming-cursor', { state: 'hidden', timeout: 10000 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Stream events should be persisted as agent actions
      const actionBlocks = page.locator('.action-block, [data-testid="agent-action"]');
      expect(await actionBlocks.count()).toBeGreaterThan(0);
    });
  });
});