import { test, expect } from '@playwright/test';

test.describe('Verify Both Chat Versions', () => {
  const projectId = 'f75e06b1-bb07-430c-b82c-a0871adc67f4';
  const sessionId = '788de109-52ce-42e1-bc38-df28412f9d9f';
  const chatUrl = `http://localhost:5174/projects/${projectId}/chat/${sessionId}`;

  test('Legacy Version - Should render chat UI', async ({ page }) => {
    // Disable assistant-ui
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => {
      localStorage.setItem('enableAssistantUI', 'false');
    });

    // Navigate to chat
    await page.goto(chatUrl);
    await page.waitForLoadState('networkidle');

    // Verify UI elements
    await expect(page.locator('.chat-session-page')).toBeVisible();
    await expect(page.locator('.chat-header')).toBeVisible();
    await expect(page.locator('.back-btn')).toBeVisible();
    await expect(page.locator('.session-title')).toBeVisible();
    await expect(page.locator('.chat-input')).toBeVisible();
    await expect(page.locator('.send-btn')).toBeVisible();

    console.log('✅ Legacy version renders correctly!');
  });

  test('Assistant-UI Version - Should render chat UI', async ({ page }) => {
    // Enable assistant-ui
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => {
      localStorage.setItem('enableAssistantUI', 'true');
    });

    // Navigate to chat
    await page.goto(chatUrl);
    await page.waitForLoadState('networkidle');

    // Verify UI elements
    await expect(page.locator('.chat-session-page')).toBeVisible();
    await expect(page.locator('.chat-header')).toBeVisible();
    await expect(page.locator('.back-btn')).toBeVisible();
    await expect(page.locator('.session-title')).toBeVisible();
    await expect(page.locator('.chat-input')).toBeVisible();
    await expect(page.locator('.send-btn')).toBeVisible();

    console.log('✅ Assistant-UI version renders correctly!');
  });

  test('Feature parity - Both versions have same elements', async ({ page }) => {
    // Test legacy
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => localStorage.setItem('enableAssistantUI', 'false'));
    await page.goto(chatUrl);
    await page.waitForLoadState('networkidle');

    const legacyElements = {
      chatPage: await page.locator('.chat-session-page').count(),
      header: await page.locator('.chat-header').count(),
      backBtn: await page.locator('.back-btn').count(),
      title: await page.locator('.session-title').count(),
      messagesContainer: await page.locator('.chat-messages-container').count(),
      input: await page.locator('.chat-input').count(),
      sendBtn: await page.locator('.send-btn').count(),
    };

    // Test assistant-ui
    await page.goto('http://localhost:5174/');
    await page.evaluate(() => localStorage.setItem('enableAssistantUI', 'true'));
    await page.goto(chatUrl);
    await page.waitForLoadState('networkidle');

    const assistantUIElements = {
      chatPage: await page.locator('.chat-session-page').count(),
      header: await page.locator('.chat-header').count(),
      backBtn: await page.locator('.back-btn').count(),
      title: await page.locator('.session-title').count(),
      messagesContainer: await page.locator('.chat-messages-container').count(),
      input: await page.locator('.chat-input').count(),
      sendBtn: await page.locator('.send-btn').count(),
    };

    // Verify feature parity
    expect(legacyElements).toEqual(assistantUIElements);
    console.log('✅ Both versions have identical UI elements!');
    console.log('Element counts:', legacyElements);
  });
});
