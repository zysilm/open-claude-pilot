# OpenCodex Frontend Testing Guide

This document provides comprehensive guidance on testing the OpenCodex frontend application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Overview

The OpenCodex frontend uses a comprehensive testing strategy with three layers:

1. **Unit Tests** - Test individual components, hooks, and utilities in isolation
2. **Integration Tests** - Test how components work together
3. **E2E Tests** - Test complete user workflows using Playwright

### Testing Stack

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Coverage**: Vitest Coverage (v8)
- **Accessibility**: Axe-core Playwright

## Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── **/__tests__/          # Component unit tests
│   ├── stores/
│   │   └── __tests__/              # Store unit tests
│   ├── services/
│   │   └── __tests__/              # API service unit tests
│   └── hooks/
│       └── __tests__/              # Custom hooks tests
├── tests/
│   ├── setup.ts                    # Vitest setup
│   ├── fixtures/                   # Test data and files
│   │   ├── mockData.ts            # Mock data objects
│   │   └── test-file*.txt         # Test files for upload
│   ├── utils/
│   │   └── testUtils.tsx          # Test utilities
│   ├── integration/               # Integration tests
│   │   └── *.test.tsx
│   └── e2e/                       # E2E tests
│       ├── project-management.spec.ts
│       ├── chat-session.spec.ts
│       ├── streaming.spec.ts
│       ├── file-operations.spec.ts
│       ├── sandbox-controls.spec.ts
│       ├── accessibility.spec.ts
│       ├── agent-config.spec.ts
│       └── error-display.spec.ts
├── vitest.config.ts               # Vitest configuration
└── playwright.config.ts           # Playwright configuration
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Unit Tests

```bash
# Run all unit tests
npm test

# Run unit tests once
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run with coverage
npm run test:unit:coverage

# Run with UI
npm run test:unit:ui
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# View test report
npm run test:e2e:report
```

### Run All Tests

```bash
# Run all tests (unit + E2E)
npm run test:all

# CI mode (with coverage)
npm run test:ci
```

## Unit Tests

### Component Tests

Located in `src/components/**/__tests__/`

Example: `MemoizedMessage.test.tsx`

```typescript
import { render, screen } from '../../../../tests/utils/testUtils';
import { MemoizedMessage } from '../MemoizedMessage';

describe('MemoizedMessage', () => {
  it('should render user message', () => {
    const message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      created_at: '2024-01-01T00:00:00Z',
    };

    render(<MemoizedMessage message={message} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });
});
```

### Store Tests

Located in `src/stores/__tests__/`

Example: `chatStore.test.ts`

```typescript
import { useChatStore } from '../chatStore';

describe('chatStore', () => {
  it('should append streaming message', () => {
    const { appendStreamingMessage } = useChatStore.getState();

    appendStreamingMessage('Hello');
    appendStreamingMessage(' World');

    expect(useChatStore.getState().streamingMessage).toBe('Hello World');
  });
});
```

### Hook Tests

Located in `src/components/ProjectSession/hooks/__tests__/`

Example: `useOptimizedStreaming.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useOptimizedStreaming } from '../useOptimizedStreaming';

describe('useOptimizedStreaming', () => {
  it('should handle chunk events', async () => {
    const { result } = renderHook(() =>
      useOptimizedStreaming({ sessionId: 'test-session' })
    );

    act(() => {
      // Simulate WebSocket message
    });

    expect(result.current.messages).toHaveLength(1);
  });
});
```

## Integration Tests

Located in `tests/integration/`

Integration tests verify that multiple components work together correctly.

Example: `chat-workflow.test.tsx`

```typescript
import { render, screen, waitFor } from '../utils/testUtils';
import ChatSessionPage from '../../src/components/ProjectSession/ChatSessionPage';

describe('Chat Workflow', () => {
  it('should load and display chat session', async () => {
    render(<ChatSessionPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Chat')).toBeInTheDocument();
    });
  });
});
```

## E2E Tests

E2E tests are written using Playwright and test complete user workflows.

### Test Organization

- `project-management.spec.ts` - Project CRUD operations
- `chat-session.spec.ts` - Chat session creation and messaging
- `streaming.spec.ts` - Real-time streaming functionality
- `file-operations.spec.ts` - File upload/download
- `sandbox-controls.spec.ts` - Sandbox container management
- `accessibility.spec.ts` - Accessibility compliance
- `agent-config.spec.ts` - Agent configuration
- `error-display.spec.ts` - Error handling

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('Create new project', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Create Project")');
  await page.fill('input[name="name"]', 'Test Project');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=Test Project')).toBeVisible();
});
```

### Running Specific Test Files

```bash
# Run specific test file
npx playwright test tests/e2e/chat-session.spec.ts

# Run tests matching pattern
npx playwright test --grep "streaming"

# Run tests in specific browser
npx playwright test --project=chromium tests/e2e/streaming.spec.ts
```

## Test Coverage

### Coverage Thresholds

The project maintains the following coverage thresholds:

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:unit:coverage

# Coverage reports are generated in:
# - coverage/index.html (HTML report)
# - coverage/coverage-final.json (JSON report)
```

### Viewing Coverage

```bash
# Open HTML coverage report
open coverage/index.html
```

## Best Practices

### Unit Tests

1. **Test Behavior, Not Implementation**
   - Focus on what the component does, not how it does it
   - Avoid testing internal state or implementation details

2. **Use Semantic Queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Mock External Dependencies**
   - Mock API calls, WebSocket connections
   - Use fixtures for consistent test data

4. **Keep Tests Independent**
   - Each test should be able to run in isolation
   - Use `beforeEach` to reset state

### Integration Tests

1. **Test Real Interactions**
   - Test how components communicate
   - Verify data flow between components

2. **Use Real Dependencies Where Possible**
   - Only mock external services (APIs, WebSocket)
   - Use real React Query, Zustand stores

3. **Test Complete Workflows**
   - Cover happy paths and error scenarios
   - Test loading, success, and error states

### E2E Tests

1. **Test Critical User Paths**
   - Focus on essential user workflows
   - Ensure core functionality works end-to-end

2. **Use Stable Selectors**
   - Prefer semantic selectors: `button:has-text("Submit")`
   - Use `data-testid` for complex components
   - Avoid CSS selectors that might change

3. **Handle Timing Properly**
   - Use `waitFor` and `expect` with timeout
   - Avoid hard-coded `waitForTimeout` when possible

4. **Test Accessibility**
   - Run axe-core on all pages
   - Test keyboard navigation
   - Verify ARIA labels

## Accessibility Testing

Run accessibility tests to ensure WCAG compliance:

```bash
# Run accessibility tests
npx playwright test tests/e2e/accessibility.spec.ts

# View violations
npx playwright test tests/e2e/accessibility.spec.ts --reporter=list
```

### Accessibility Checks

Our accessibility tests verify:

- No critical or serious axe violations
- Proper heading hierarchy
- Keyboard navigation support
- ARIA labels on interactive elements
- Sufficient color contrast
- Form input labels
- Focus management in modals
- Screen reader support

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:unit:coverage

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Troubleshooting

### Common Issues

1. **WebSocket mock not working**
   - Ensure `tests/setup.ts` is loaded
   - Check that WebSocket is mocked globally

2. **React Query tests failing**
   - Wrap components in `QueryClientProvider`
   - Use test query client with `retry: false`

3. **Playwright tests timing out**
   - Increase timeout in `playwright.config.ts`
   - Use proper wait strategies instead of `waitForTimeout`

4. **Coverage not meeting threshold**
   - Run `npm run test:unit:coverage` to see report
   - Add tests for uncovered branches

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Axe Accessibility Testing](https://www.deque.com/axe/)

## Test Maintenance

### Updating Tests

When updating components:

1. Update corresponding unit tests
2. Check if integration tests need updates
3. Verify E2E tests still pass
4. Update test fixtures if data structures change

### Adding New Tests

When adding new features:

1. Write unit tests for new components/hooks
2. Add integration tests for workflows
3. Add E2E tests for user-facing features
4. Update this documentation if needed

## Questions?

For questions or issues with testing, please:

1. Check this documentation
2. Review existing tests for examples
3. Create an issue on GitHub
