# Assistant-UI Integration Testing Guide

## Quick Test Steps

### 1. Enable Assistant-UI Feature Flag

The feature flag is already enabled via the `.env` file:
```
VITE_ENABLE_ASSISTANT_UI=true
```

Alternatively, you can enable it at runtime in the browser console:
```javascript
featureFlags.toggleAssistantUI(true)
```

### 2. Access the Application

Open your browser and navigate to:
```
http://localhost:5174/
```

### 3. Testing the New Chat Interface

1. **Create or select a project**
2. **Start a new chat session** or open an existing one
3. **Verify assistant-ui components are loaded:**
   - The chat interface should show the new Thread component
   - Messages should render with the custom OpenCodexMessage component
   - Input should use the Composer component

### 4. Test Key Features

#### Message Interactions:
- [ ] Send a message
- [ ] Verify streaming response works
- [ ] Check agent actions are visualized correctly
- [ ] Test message editing (hover over message)
- [ ] Test message regeneration
- [ ] Test copy functionality

#### Tool/Action Rendering:
- [ ] Send a request that triggers file operations
- [ ] Verify tool calls are displayed with proper formatting
- [ ] Check that file write previews show syntax highlighting
- [ ] Confirm observations/results are rendered correctly

#### Performance:
- [ ] Confirm 33 updates/second streaming speed
- [ ] Verify virtual scrolling works with many messages
- [ ] Check memory usage stays under 50MB
- [ ] Ensure smooth 60 FPS during streaming

#### Integration Features:
- [ ] Sandbox controls still work
- [ ] File panel functions correctly
- [ ] Agent config modal opens and saves
- [ ] Session management works

### 5. Toggle Between Old and New Implementation

To compare with the original implementation:

```javascript
// In browser console:
featureFlags.toggleAssistantUI(false) // Switches to old implementation
featureFlags.toggleAssistantUI(true)  // Switches to new implementation
```

### 6. Check for Console Errors

Open browser DevTools and check:
- No errors in console
- Network requests complete successfully
- WebSocket connection establishes properly

## Troubleshooting

### If the new interface doesn't load:
1. Check that `.env` file has `VITE_ENABLE_ASSISTANT_UI=true`
2. Restart the dev server: `npm run dev`
3. Clear browser cache and reload

### If streaming doesn't work:
1. Verify backend is running on port 8000
2. Check WebSocket connection in Network tab
3. Ensure `VITE_WS_URL=ws://localhost:8000` in `.env`

### If styles look broken:
1. Check Tailwind CSS is processing correctly
2. Verify `postcss.config.js` and `tailwind.config.js` exist
3. Check that `@tailwind` directives are in `index.css`

## Current Status

✅ **Completed:**
- Assistant-UI packages installed
- Tailwind CSS and shadcn/ui configured
- OpenCodex runtime adapter created
- Custom message component with agent actions
- Thread component integrated into chat page
- Feature flag system implemented
- Lazy loading for code splitting

🔄 **To Verify:**
- Streaming performance (33 updates/sec)
- All 180+ UX features preserved
- Tool visualization working correctly
- Memory usage optimized
- No regression in existing features

## Next Steps

If all tests pass:
1. Conduct more thorough testing with complex scenarios
2. Get user feedback on the new interface
3. Monitor performance metrics
4. Plan gradual rollout to users

## Rollback Plan

If issues are found, disable the feature:

1. **Quick disable:** Set `VITE_ENABLE_ASSISTANT_UI=false` in `.env`
2. **Restart server:** `npm run dev`
3. **Users automatically get old interface**

No data migration needed - all messages stored in same format.