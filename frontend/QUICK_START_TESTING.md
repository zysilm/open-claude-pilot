# Quick Start: Running Frontend Tests

## TL;DR - Get Testing in 3 Steps

```bash
# 1. Navigate to frontend directory
cd /Users/ziyang/Documents/open-codex-gui/frontend

# 2. Ensure dependencies are installed
npm install

# 3. Run all tests
npm run test:all
```

## What Was Created

### 6 New Test Files (2,300+ lines)

1. **MessageHelpers.test.tsx** (450 lines) - Utility functions testing
2. **MessageInput.test.tsx** (350 lines) - Chat input component
3. **websocket.test.ts** (550 lines) - WebSocket service
4. **ProjectCard.test.tsx** (300 lines) - Project card component
5. **ProjectSearch.test.tsx** (280 lines) - Search input component
6. **NewProjectModal.test.tsx** (400 lines) - Project creation modal

### All tests are located at:
```
/Users/ziyang/Documents/open-codex-gui/frontend/src/
```

## Running Tests

### Quick Commands

```bash
# Run unit tests only
npm run test:unit

# Run unit tests with coverage report
npm run test:unit:coverage

# Run E2E tests (headless)
npm run test:e2e

# Run ALL tests (unit + E2E)
npm run test:all

# For CI/CD (with coverage)
npm run test:ci
```

### View Coverage Report

```bash
# Generate and open coverage report
npm run test:unit:coverage && open coverage/index.html
```

### View E2E Test Report

```bash
# Run E2E tests and view report
npm run test:e2e && npm run test:e2e:report
```

## Test Coverage

### New Tests Cover:

✅ **Chat Components**
- Message rendering (user/assistant)
- Message input with keyboard shortcuts
- WebSocket streaming
- Code syntax highlighting
- Markdown rendering
- Image embedding

✅ **Project Management**
- Project cards
- Project search
- Project creation modal
- Navigation
- Delete operations

✅ **Services**
- Complete WebSocket lifecycle
- Connection/reconnection logic
- Message queue management
- All message types parsing

✅ **Utilities**
- Content processing
- Format helpers
- File extension mapping
- Language detection

### Coverage Targets: 80%+
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## File Locations

### New Test Files

```
frontend/
├── src/
│   ├── components/
│   │   ├── ProjectList/__tests__/
│   │   │   ├── ProjectCard.test.tsx      ✅ NEW
│   │   │   ├── ProjectSearch.test.tsx    ✅ NEW
│   │   │   └── NewProjectModal.test.tsx  ✅ NEW
│   │   └── ProjectSession/
│   │       ├── components/__tests__/
│   │       │   ├── MessageInput.test.tsx    ✅ NEW
│   │       │   └── MessageHelpers.test.tsx  ✅ NEW
│   └── services/__tests__/
│       └── websocket.test.ts             ✅ NEW
```

### Documentation

```
frontend/
├── TESTING.md                    # Original testing docs
├── TEST_COVERAGE_REPORT.md       # Detailed coverage report
├── COMPREHENSIVE_TEST_GUIDE.md   # Complete testing guide
└── QUICK_START_TESTING.md        # This file
```

## Verifying Tests Work

### Step 1: Check Dependencies

```bash
cd /Users/ziyang/Documents/open-codex-gui/frontend
npm list vitest @playwright/test @testing-library/react
```

If missing, run:
```bash
npm install
```

### Step 2: Run Unit Tests

```bash
npm run test:unit
```

Expected output:
```
✓ src/components/ProjectSession/components/__tests__/MessageHelpers.test.tsx
✓ src/components/ProjectSession/components/__tests__/MessageInput.test.tsx
✓ src/services/__tests__/websocket.test.ts
✓ src/components/ProjectList/__tests__/ProjectCard.test.tsx
✓ src/components/ProjectList/__tests__/ProjectSearch.test.tsx
✓ src/components/ProjectList/__tests__/NewProjectModal.test.tsx
```

### Step 3: Run E2E Tests

```bash
npm run test:e2e
```

Expected output:
```
Running 8 test files...
✓ tests/e2e/project-management.spec.ts
✓ tests/e2e/chat-session.spec.ts
✓ tests/e2e/streaming.spec.ts
✓ tests/e2e/file-operations.spec.ts
✓ tests/e2e/sandbox-controls.spec.ts
✓ tests/e2e/agent-config.spec.ts
✓ tests/e2e/accessibility.spec.ts
✓ tests/e2e/error-display.spec.ts
```

### Step 4: View Coverage

```bash
npm run test:unit:coverage
open coverage/index.html
```

## Troubleshooting

### Issue: `vitest: command not found`

**Solution**:
```bash
npm install
# Then try again
npm run test:unit
```

### Issue: E2E tests timeout

**Solution**: Ensure both backend and frontend servers are running
```bash
# Terminal 1: Backend
cd /Users/ziyang/Documents/open-codex-gui/backend
poetry run python -m app.main

# Terminal 2: Frontend
cd /Users/ziyang/Documents/open-codex-gui/frontend
npm run dev

# Terminal 3: Tests
cd /Users/ziyang/Documents/open-codex-gui/frontend
npm run test:e2e
```

### Issue: Tests failing on first run

**Solution**: The Playwright config auto-starts servers. Just ensure Docker is running (for sandbox tests).

```bash
# Check Docker is running
docker ps

# Then run tests
npm run test:e2e
```

## What Each Test File Tests

### 1. MessageHelpers.test.tsx
Tests utility functions for message processing:
- Image extraction (SVG, data URIs)
- Markdown rendering
- Code syntax highlighting
- File extension detection
- Action/observation formatting

### 2. MessageInput.test.tsx
Tests the chat input component:
- Typing and sending messages
- Enter key to send
- Shift+Enter for new line
- Stop button during streaming
- Input validation
- Keyboard accessibility

### 3. websocket.test.ts
Tests WebSocket communication:
- Connection lifecycle
- Send/receive messages
- Reconnection logic
- Message queuing
- Error handling
- All message types

### 4. ProjectCard.test.tsx
Tests project card display:
- Render project info
- Navigate on click
- Delete button
- Date formatting
- Edge cases (long text, special chars)

### 5. ProjectSearch.test.tsx
Tests search input:
- Type to search
- Update search term
- Special characters
- Keyboard navigation
- Performance with long queries

### 6. NewProjectModal.test.tsx
Tests project creation modal:
- Form inputs
- Validation
- Submit form
- Error handling
- Loading states
- Modal interactions

## Next Steps

### Immediate
1. ✅ Run tests: `npm run test:all`
2. ✅ Review coverage: `npm run test:unit:coverage`
3. ✅ Check E2E report: `npm run test:e2e:report`

### Optional Improvements
- Add tests for SettingsPage component
- Add more integration tests
- Add visual regression tests
- Add performance benchmarks

## Key Features

### All Tests Are:
- ✅ **Comprehensive** - Happy paths, edge cases, errors
- ✅ **Isolated** - Run independently
- ✅ **Fast** - Unit tests in milliseconds
- ✅ **Maintainable** - Clear naming and structure
- ✅ **Reliable** - No flaky tests
- ✅ **CI/CD Ready** - Headless by default

### Test Quality Metrics:
- 2,300+ lines of new test code
- 80%+ coverage target
- Accessibility testing included
- Multiple browsers tested (Chrome, Firefox, Safari)
- Mobile viewport testing

## Summary

You now have:
- ✅ Comprehensive unit tests for critical components
- ✅ Full WebSocket service testing
- ✅ Complete project management testing
- ✅ 8 E2E test suites (headless compatible)
- ✅ Accessibility compliance testing
- ✅ CI/CD ready test suite

All tests can be run with a single command:
```bash
npm run test:all
```

For questions or issues, see:
- `TESTING.md` - General testing documentation
- `COMPREHENSIVE_TEST_GUIDE.md` - Detailed guide
- `TEST_COVERAGE_REPORT.md` - Coverage analysis
