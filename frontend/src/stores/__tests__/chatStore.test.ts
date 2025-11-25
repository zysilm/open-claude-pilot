import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../chatStore';
import type { StreamEvent, AgentAction } from '../chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { clearStreamEvents, clearAgentActions, clearStreamingMessage, setActiveSession, clearError } =
      useChatStore.getState();
    clearStreamEvents();
    clearAgentActions();
    clearStreamingMessage();
    setActiveSession(null);
    clearError();
  });

  describe('activeSessionId', () => {
    it('should initialize with null', () => {
      const { activeSessionId } = useChatStore.getState();
      expect(activeSessionId).toBeNull();
    });

    it('should set active session', () => {
      const { setActiveSession, activeSessionId } = useChatStore.getState();

      setActiveSession('session-123');

      expect(useChatStore.getState().activeSessionId).toBe('session-123');
    });

    it('should update active session', () => {
      const { setActiveSession } = useChatStore.getState();

      setActiveSession('session-1');
      setActiveSession('session-2');

      expect(useChatStore.getState().activeSessionId).toBe('session-2');
    });

    it('should clear active session', () => {
      const { setActiveSession } = useChatStore.getState();

      setActiveSession('session-123');
      setActiveSession(null);

      expect(useChatStore.getState().activeSessionId).toBeNull();
    });
  });

  describe('streaming message', () => {
    it('should initialize with empty string', () => {
      const { streamingMessage } = useChatStore.getState();
      expect(streamingMessage).toBe('');
    });

    it('should append streaming message chunks', () => {
      const { appendStreamingMessage } = useChatStore.getState();

      appendStreamingMessage('Hello');
      appendStreamingMessage(' ');
      appendStreamingMessage('World');

      expect(useChatStore.getState().streamingMessage).toBe('Hello World');
    });

    it('should clear streaming message', () => {
      const { appendStreamingMessage, clearStreamingMessage } = useChatStore.getState();

      appendStreamingMessage('Test message');
      clearStreamingMessage();

      expect(useChatStore.getState().streamingMessage).toBe('');
    });
  });

  describe('streaming state', () => {
    it('should initialize as not streaming', () => {
      const { isStreaming } = useChatStore.getState();
      expect(isStreaming).toBe(false);
    });

    it('should set streaming state to true', () => {
      const { setStreaming } = useChatStore.getState();

      setStreaming(true);

      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it('should set streaming state to false', () => {
      const { setStreaming } = useChatStore.getState();

      setStreaming(true);
      setStreaming(false);

      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe('agent actions', () => {
    it('should initialize with empty array', () => {
      const { agentActions } = useChatStore.getState();
      expect(agentActions).toEqual([]);
    });

    it('should add agent action', () => {
      const { addAgentAction } = useChatStore.getState();

      const action: AgentAction = {
        type: 'action',
        content: 'Using tool: file_write',
        tool: 'file_write',
        args: { path: '/test.txt' },
        step: 1,
      };

      addAgentAction(action);

      expect(useChatStore.getState().agentActions).toHaveLength(1);
      expect(useChatStore.getState().agentActions[0]).toEqual(action);
    });

    it('should add multiple agent actions', () => {
      const { addAgentAction } = useChatStore.getState();

      const action1: AgentAction = {
        type: 'thought',
        content: 'I need to write a file',
        step: 1,
      };

      const action2: AgentAction = {
        type: 'action',
        content: 'Using tool: file_write',
        tool: 'file_write',
        step: 2,
      };

      addAgentAction(action1);
      addAgentAction(action2);

      expect(useChatStore.getState().agentActions).toHaveLength(2);
      expect(useChatStore.getState().agentActions).toEqual([action1, action2]);
    });

    it('should clear agent actions', () => {
      const { addAgentAction, clearAgentActions } = useChatStore.getState();

      addAgentAction({ type: 'thought', content: 'Test', step: 1 });
      addAgentAction({ type: 'action', content: 'Action', step: 2 });
      clearAgentActions();

      expect(useChatStore.getState().agentActions).toEqual([]);
    });
  });

  describe('stream events', () => {
    it('should initialize with empty array', () => {
      const { streamEvents } = useChatStore.getState();
      expect(streamEvents).toEqual([]);
    });

    it('should add stream event', () => {
      const { addStreamEvent } = useChatStore.getState();

      const event: StreamEvent = {
        type: 'chunk',
        content: 'Hello',
      };

      addStreamEvent(event);

      expect(useChatStore.getState().streamEvents).toHaveLength(1);
      expect(useChatStore.getState().streamEvents[0]).toEqual(event);
    });

    it('should add multiple stream events', () => {
      const { addStreamEvent } = useChatStore.getState();

      const events: StreamEvent[] = [
        { type: 'chunk', content: 'Hello' },
        { type: 'action', content: 'Using bash', tool: 'bash', step: 1 },
        { type: 'observation', content: 'Success', success: true, step: 1 },
      ];

      events.forEach(addStreamEvent);

      expect(useChatStore.getState().streamEvents).toHaveLength(3);
      expect(useChatStore.getState().streamEvents).toEqual(events);
    });

    it('should clear stream events', () => {
      const { addStreamEvent, clearStreamEvents } = useChatStore.getState();

      addStreamEvent({ type: 'chunk', content: 'Test' });
      addStreamEvent({ type: 'chunk', content: 'Test 2' });
      clearStreamEvents();

      expect(useChatStore.getState().streamEvents).toEqual([]);
    });

    it('should handle action_args_chunk events', () => {
      const { addStreamEvent } = useChatStore.getState();

      const event: StreamEvent = {
        type: 'action_args_chunk',
        content: '{"file": "test.txt"}',
        tool: 'file_write',
        partial_args: '{"file": "test.txt"}',
        step: 1,
      };

      addStreamEvent(event);

      expect(useChatStore.getState().streamEvents[0]).toEqual(event);
    });
  });

  describe('error handling', () => {
    it('should initialize with no error', () => {
      const { error } = useChatStore.getState();
      expect(error).toBeNull();
    });

    it('should set error', () => {
      const { setError } = useChatStore.getState();

      setError('Connection failed');

      expect(useChatStore.getState().error).toBe('Connection failed');
    });

    it('should update error', () => {
      const { setError } = useChatStore.getState();

      setError('Error 1');
      setError('Error 2');

      expect(useChatStore.getState().error).toBe('Error 2');
    });

    it('should clear error', () => {
      const { setError, clearError } = useChatStore.getState();

      setError('Some error');
      clearError();

      expect(useChatStore.getState().error).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete streaming session lifecycle', () => {
      const store = useChatStore.getState();

      // Start session
      store.setActiveSession('session-123');
      store.setStreaming(true);

      // Add streaming content
      store.appendStreamingMessage('Hello');
      store.addStreamEvent({ type: 'chunk', content: 'Hello' });

      store.appendStreamingMessage(' World');
      store.addStreamEvent({ type: 'chunk', content: ' World' });

      // Add action
      store.addAgentAction({
        type: 'action',
        content: 'Using tool',
        tool: 'bash',
        step: 1,
      });

      // End session
      store.setStreaming(false);
      store.clearStreamingMessage();
      store.clearStreamEvents();

      const state = useChatStore.getState();
      expect(state.activeSessionId).toBe('session-123');
      expect(state.isStreaming).toBe(false);
      expect(state.streamingMessage).toBe('');
      expect(state.streamEvents).toEqual([]);
      expect(state.agentActions).toHaveLength(1);
    });

    it('should handle error during streaming', () => {
      const store = useChatStore.getState();

      // Start streaming
      store.setStreaming(true);
      store.appendStreamingMessage('Partial message');

      // Error occurs
      store.setError('WebSocket connection lost');
      store.setStreaming(false);

      const state = useChatStore.getState();
      expect(state.isStreaming).toBe(false);
      expect(state.error).toBe('WebSocket connection lost');
      expect(state.streamingMessage).toBe('Partial message');
    });
  });
});
