import { Page } from '@playwright/test';

export interface TestProject {
  id: string;
  name: string;
}

export interface TestSession {
  id: string;
  projectId: string;
  title: string;
}

// Helper to set feature flag
export async function setFeatureFlag(page: Page, enabled: boolean) {
  // Navigate first to have access to localStorage
  await page.goto('http://localhost:5174/');
  await page.evaluate((flag) => {
    localStorage.setItem('enableAssistantUI', flag ? 'true' : 'false');
  }, enabled);
}

// Helper to create a test project via API
export async function createTestProject(page: Page): Promise<TestProject> {
  const projectId = `test-${Date.now()}`;
  const projectName = `Test Project ${Date.now()}`;

  // Use the page's context to make API calls
  const response = await page.request.post('http://localhost:8000/api/projects', {
    data: {
      id: projectId,
      name: projectName,
      description: 'Test project for Playwright tests',
      environment_type: 'python',
      settings: {}
    }
  });

  if (response.ok()) {
    const project = await response.json();
    return {
      id: project.id || projectId,
      name: project.name || projectName
    };
  }

  // Fallback if API doesn't work
  return {
    id: projectId,
    name: projectName
  };
}

// Helper to create a test session via API
export async function createTestSession(page: Page, projectId: string): Promise<TestSession> {
  const sessionId = `session-${Date.now()}`;
  const sessionTitle = `Test Session ${Date.now()}`;

  const response = await page.request.post(`http://localhost:8000/api/projects/${projectId}/sessions`, {
    data: {
      id: sessionId,
      title: sessionTitle,
      agent_config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 1000
      }
    }
  });

  if (response.ok()) {
    const session = await response.json();
    return {
      id: session.id || sessionId,
      projectId: projectId,
      title: session.title || sessionTitle
    };
  }

  // Fallback
  return {
    id: sessionId,
    projectId: projectId,
    title: sessionTitle
  };
}

// Helper to navigate to a chat session
export async function navigateToChat(page: Page, projectId: string, sessionId: string) {
  const url = `http://localhost:5174/projects/${projectId}/chat/${sessionId}`;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

// Helper to wait for chat interface to be ready
export async function waitForChatInterface(page: Page) {
  // Wait for the chat interface to be ready
  // Try multiple possible selectors
  const selectors = [
    'textarea',
    '[contenteditable="true"]',
    'input[type="text"]',
    '[role="textbox"]',
    '.chat-input',
    '.composer',
    '.message-input'
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch {
      // Try next selector
    }
  }

  return false;
}

// Helper to send a message in chat
export async function sendMessage(page: Page, message: string) {
  // Find the input
  const inputSelectors = [
    'textarea',
    '[contenteditable="true"]',
    'input[type="text"]',
    '[role="textbox"]',
    '.chat-input',
    '.composer textarea',
    '.message-input'
  ];

  let inputFound = false;
  for (const selector of inputSelectors) {
    const input = page.locator(selector).first();
    if (await input.count() > 0) {
      await input.fill(message);
      inputFound = true;
      break;
    }
  }

  if (!inputFound) {
    throw new Error('Could not find chat input');
  }

  // Find and click send button or press Enter
  const sendButton = page.locator('button').filter({
    has: page.locator('text=/send|submit|→|➤/i')
  }).or(page.locator('button[type="submit"]')).first();

  if (await sendButton.count() > 0) {
    await sendButton.click();
  } else {
    // Try pressing Enter
    await page.keyboard.press('Enter');
  }
}

// Helper to wait for a response
export async function waitForResponse(page: Page) {
  // Wait for assistant message to appear
  const messageSelectors = [
    '.message.assistant',
    '[data-role="assistant"]',
    '.assistant-message',
    '.message-content'
  ];

  for (const selector of messageSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      return true;
    } catch {
      // Try next selector
    }
  }

  return false;
}

// Helper to clean up test data
export async function cleanupTestData(page: Page, projectId: string) {
  try {
    await page.request.delete(`http://localhost:8000/api/projects/${projectId}`);
  } catch {
    // Ignore errors during cleanup
  }
}