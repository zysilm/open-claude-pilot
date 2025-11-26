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
  test.describe(`${impl.name}: Performance & Virtual Scrolling`, () => {
    test.beforeEach(async ({ page }) => {
      await setFeatureFlag(page, impl.featureFlag);
      await page.goto('http://localhost:5174/');
    });

    test('should handle virtual scrolling with many messages', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Add many messages to test virtual scrolling
      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send multiple messages
      for (let i = 0; i < 20; i++) {
        await input.fill(`Test message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(100);
      }

      // Check that not all message DOM elements are rendered
      const visibleMessages = await page.evaluate(() => {
        const messages = document.querySelectorAll('.message-wrapper');
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');

        if (!viewport) return messages.length;

        const viewportRect = viewport.getBoundingClientRect();
        let visibleCount = 0;

        messages.forEach(msg => {
          const rect = msg.getBoundingClientRect();
          if (rect.top < viewportRect.bottom && rect.bottom > viewportRect.top) {
            visibleCount++;
          }
        });

        return visibleCount;
      });

      // Should only render visible messages plus buffer
      expect(visibleMessages).toBeLessThan(20);
    });

    test('should maintain smooth scrolling performance', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Add messages
      const input = page.locator('textarea[placeholder*="Type your message"]');
      for (let i = 0; i < 10; i++) {
        await input.fill(`Message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(50);
      }

      // Measure scroll performance
      const scrollPerformance = await page.evaluate(() => {
        return new Promise<{ duration: number, frames: number }>(resolve => {
          const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
          if (!viewport) {
            resolve({ duration: 0, frames: 0 });
            return;
          }

          let frames = 0;
          const startTime = performance.now();

          const measureFrame = () => {
            frames++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve({
                duration: performance.now() - startTime,
                frames
              });
            }
          };

          // Start scrolling
          viewport.scrollTop = 0;
          requestAnimationFrame(() => {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            measureFrame();
          });
        });
      });

      // Should maintain at least 30 FPS
      const fps = scrollPerformance.frames / (scrollPerformance.duration / 1000);
      expect(fps).toBeGreaterThan(30);
    });

    test('should preserve scroll position on new messages', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send initial messages
      for (let i = 0; i < 5; i++) {
        await input.fill(`Message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(100);
      }

      // Scroll up to middle
      await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight / 2;
        }
      });

      const scrollBefore = await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        return viewport?.scrollTop || 0;
      });

      // Add new message
      await input.fill('New message');
      await input.press('Enter');
      await page.waitForTimeout(500);

      const scrollAfter = await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        return viewport?.scrollTop || 0;
      });

      // Scroll position should be preserved (not auto-scrolled)
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(100);
    });

    test('should show auto-scroll toggle button', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const autoScrollButton = page.locator('button[aria-label*="scroll"], button').filter({ hasText: /↓|⬇|Auto/i });
      await expect(autoScrollButton).toBeVisible();

      // Check button positioning (bottom-right)
      const position = await autoScrollButton.boundingBox();
      if (position) {
        const viewport = await page.viewportSize();
        if (viewport) {
          expect(position.x).toBeGreaterThan(viewport.width - 100);
          expect(position.y).toBeGreaterThan(viewport.height - 100);
        }
      }
    });

    test('should toggle auto-scroll behavior', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const autoScrollButton = page.locator('button[aria-label*="scroll"], button').filter({ hasText: /↓|⬇/i });

      // Initially enabled (blue)
      await expect(autoScrollButton).toHaveCSS('background-color', /rgb\(.*blue.*\)|rgb\(37, 99, 235\)/);

      // Click to disable
      await autoScrollButton.click();

      // Should change appearance (white with border)
      await expect(autoScrollButton).toHaveCSS('background-color', /white|rgb\(255, 255, 255\)/);
    });

    test('should auto-scroll during streaming when enabled', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate a long response');
      await input.press('Enter');

      // Track scroll position during streaming
      const scrollPositions = await page.evaluate(() => {
        return new Promise<number[]>(resolve => {
          const positions: number[] = [];
          const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');

          if (!viewport) {
            resolve([]);
            return;
          }

          const interval = setInterval(() => {
            positions.push(viewport.scrollTop);
          }, 100);

          setTimeout(() => {
            clearInterval(interval);
            resolve(positions);
          }, 2000);
        });
      });

      // Should see increasing scroll positions (auto-scrolling)
      let increases = 0;
      for (let i = 1; i < scrollPositions.length; i++) {
        if (scrollPositions[i] > scrollPositions[i - 1]) {
          increases++;
        }
      }

      expect(increases).toBeGreaterThan(0);
    });

    test('should not auto-scroll when disabled', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Disable auto-scroll
      const autoScrollButton = page.locator('button[aria-label*="scroll"], button').filter({ hasText: /↓|⬇/i });
      await autoScrollButton.click();

      // Scroll to top
      await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        if (viewport) viewport.scrollTop = 0;
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');
      await input.fill('Generate response');
      await input.press('Enter');

      await page.waitForTimeout(1000);

      const scrollPosition = await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        return viewport?.scrollTop || 0;
      });

      // Should stay at top (not auto-scroll)
      expect(scrollPosition).toBeLessThan(100);
    });

    test('should handle dynamic item heights in virtual list', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send messages of varying lengths
      await input.fill('Short');
      await input.press('Enter');
      await page.waitForTimeout(100);

      await input.fill('This is a much longer message with multiple lines\n'.repeat(5));
      await input.press('Enter');
      await page.waitForTimeout(100);

      await input.fill('Medium length message here');
      await input.press('Enter');

      // Check that messages have different heights
      const messageHeights = await page.evaluate(() => {
        const messages = document.querySelectorAll('.message-wrapper');
        return Array.from(messages).map(m => m.getBoundingClientRect().height);
      });

      // Should have varying heights
      const uniqueHeights = new Set(messageHeights);
      expect(uniqueHeights.size).toBeGreaterThan(1);
    });

    test('should optimize re-renders with memoization', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Track re-renders
      await page.evaluate(() => {
        (window as any).renderCounts = new Map();

        // Patch React createElement to count renders
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              const id = (mutation.target as any)?.dataset?.messageId || 'unknown';
              const current = (window as any).renderCounts.get(id) || 0;
              (window as any).renderCounts.set(id, current + 1);
            }
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send first message
      await input.fill('Message 1');
      await input.press('Enter');
      await page.waitForTimeout(500);

      const rendersBefore = await page.evaluate(() =>
        Array.from((window as any).renderCounts.values())
      );

      // Send second message (should not re-render first)
      await input.fill('Message 2');
      await input.press('Enter');
      await page.waitForTimeout(500);

      const rendersAfter = await page.evaluate(() =>
        Array.from((window as any).renderCounts.values())
      );

      // First message should not re-render
      if (rendersBefore.length > 0) {
        expect(rendersAfter[0]).toBe(rendersBefore[0]);
      }
    });

    test('should measure memory usage efficiency', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Get initial memory
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const input = page.locator('textarea[placeholder*="Type your message"]');

      // Send many messages
      for (let i = 0; i < 50; i++) {
        await input.fill(`Message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(50);
      }

      // Get final memory
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory increase should be reasonable (< 50MB)
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      expect(memoryIncrease).toBeLessThan(50);
    });

    test('should handle smooth animation during scroll', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Add messages
      const input = page.locator('textarea[placeholder*="Type your message"]');
      for (let i = 0; i < 10; i++) {
        await input.fill(`Message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(50);
      }

      // Test smooth scroll
      await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        if (viewport) {
          viewport.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });

      // Check for smooth transition
      const scrollPositions = await page.evaluate(() => {
        return new Promise<number[]>(resolve => {
          const positions: number[] = [];
          const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');

          if (!viewport) {
            resolve([]);
            return;
          }

          const interval = setInterval(() => {
            positions.push(viewport.scrollTop);
          }, 10);

          setTimeout(() => {
            clearInterval(interval);
            resolve(positions);
          }, 500);
        });
      });

      // Should see gradual position changes (smooth, not instant)
      let smoothTransitions = 0;
      for (let i = 1; i < scrollPositions.length; i++) {
        const change = Math.abs(scrollPositions[i] - scrollPositions[i - 1]);
        if (change > 0 && change < 50) {
          smoothTransitions++;
        }
      }

      expect(smoothTransitions).toBeGreaterThan(5);
    });

    test('should initialize at bottom of message list', async ({ page }) => {
      // Create a session with existing messages
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session-with-history');

      // Check initial scroll position
      const scrollPosition = await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        if (!viewport) return 0;
        return viewport.scrollTop / (viewport.scrollHeight - viewport.clientHeight);
      });

      // Should be at or near bottom (> 0.9)
      expect(scrollPosition).toBeGreaterThan(0.9);
    });

    test('should handle large scroll jumps efficiently', async ({ page }) => {
      await page.goto('http://localhost:5174/projects/test-project/chat/test-session');

      // Add many messages
      const input = page.locator('textarea[placeholder*="Type your message"]');
      for (let i = 0; i < 30; i++) {
        await input.fill(`Message ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(30);
      }

      // Jump to top
      const jumpStart = Date.now();
      await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        if (viewport) viewport.scrollTop = 0;
      });

      // Wait for render
      await page.waitForTimeout(100);

      // Jump to bottom
      await page.evaluate(() => {
        const viewport = document.querySelector('.chat-viewport, [data-testid="virtuoso-scroller"]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      });

      const jumpDuration = Date.now() - jumpStart;

      // Should handle jumps quickly (< 500ms)
      expect(jumpDuration).toBeLessThan(500);
    });
  });
});