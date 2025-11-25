import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimizedStreaming } from '../useOptimizedStreaming';
import { QueryClient, QueryClientProvider } from '@tantml:query/react-query';
import { ReactNode } from 'react';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  // Helper method to simulate errors
  simulateError(error: any) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

describe('useOptimizedStreaming', () => {
  let mockWs: MockWebSocket;
  let queryClient: QueryClient;

  beforeEach(() => {
    // Mock WebSocket globally
    global.WebSocket = MockWebSocket as any;

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.streamEvents).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with initial messages', () => {
      const initialMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session', initialMessages }),
        { wrapper }
      );

      expect(result.current.messages).toEqual(initialMessages);
    });

    it('should establish WebSocket connection', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isWebSocketReady).toBe(true);
    });

    it('should not connect without sessionId', () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: undefined }),
        { wrapper }
      );

      expect(result.current.isWebSocketReady).toBe(false);
    });
  });

  describe('message streaming', () => {
    it('should handle start event', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      // Get WebSocket instance
      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
      });

      expect(result.current.isStreaming).toBe(true);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content).toBe('');
    });

    it('should accumulate chunk events', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({ type: 'chunk', content: 'Hello' });
        instance.simulateMessage({ type: 'chunk', content: ' ' });
        instance.simulateMessage({ type: 'chunk', content: 'World' });
      });

      // Advance timers to trigger flush (30ms interval)
      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      expect(result.current.messages[0].content).toBe('Hello World');
    });

    it('should handle action events', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({
          type: 'action',
          tool: 'file_write',
          args: { file_path: '/test.txt' },
          step: 1,
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      expect(result.current.streamEvents).toHaveLength(1);
      expect(result.current.streamEvents[0].type).toBe('action');
      expect(result.current.streamEvents[0].tool).toBe('file_write');
    });

    it('should handle observation events', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({
          type: 'observation',
          content: 'File written successfully',
          success: true,
          step: 1,
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      expect(result.current.streamEvents).toHaveLength(1);
      expect(result.current.streamEvents[0].type).toBe('observation');
      expect(result.current.streamEvents[0].success).toBe(true);
    });

    it('should handle end event', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({ type: 'chunk', content: 'Final message' });
        instance.simulateMessage({ type: 'end' });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamEvents).toEqual([]);
    });

    it('should handle action_args_chunk events', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({
          type: 'action_args_chunk',
          tool: 'bash',
          partial_args: '{"command": "ls"}',
          step: 1,
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      expect(result.current.streamEvents).toHaveLength(1);
      expect(result.current.streamEvents[0].type).toBe('action_args_chunk');
    });

    it('should remove action_args_chunk when action event arrives', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({
          type: 'action_args_chunk',
          tool: 'bash',
          partial_args: '{"command"',
          step: 1,
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      expect(result.current.streamEvents).toHaveLength(1);

      act(() => {
        instance.simulateMessage({
          type: 'action',
          tool: 'bash',
          args: { command: 'ls -la' },
          step: 1,
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      // action_args_chunk should be removed, only action should remain
      const argChunks = result.current.streamEvents.filter(
        (e) => e.type === 'action_args_chunk'
      );
      expect(argChunks).toHaveLength(0);
    });
  });

  describe('sendMessage', () => {
    it('should send message via WebSocket', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        result.current.sendMessage('Hello, world!');
      });

      expect(instance.sentMessages).toHaveLength(1);
      const sentData = JSON.parse(instance.sentMessages[0]);
      expect(sentData.type).toBe('message');
      expect(sentData.content).toBe('Hello, world!');
    });

    it('should add user message to local state', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.sendMessage('Test message');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Test message');
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        result.current.sendMessage('   ');
      });

      expect(instance.sentMessages).toHaveLength(0);
      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('cancelStream', () => {
    it('should send cancel message', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        result.current.cancelStream();
      });

      const cancelMessage = instance.sentMessages.find((msg: string) => {
        const data = JSON.parse(msg);
        return data.type === 'cancel';
      });

      expect(cancelMessage).toBeDefined();
    });

    it('should handle cancelled event', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({ type: 'chunk', content: 'Partial content' });
      });

      await act(async () => {
        vi.advanceTimersByTime(30);
      });

      act(() => {
        instance.simulateMessage({ type: 'cancelled' });
      });

      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle error events', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'start' });
        instance.simulateMessage({ type: 'error', content: 'Connection failed' });
      });

      expect(result.current.error).toBe('Connection failed');
      expect(result.current.isStreaming).toBe(false);
    });

    it('should clear error', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'error', content: 'Test error' });
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle WebSocket connection errors', async () => {
      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateError(new Error('WebSocket error'));
      });

      expect(result.current.error).toBe('Connection error occurred');
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should close WebSocket on unmount', async () => {
      const { unmount } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      unmount();

      expect(instance.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe('title updates', () => {
    it('should invalidate queries on title_updated event', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useOptimizedStreaming({ sessionId: 'test-session' }),
        { wrapper }
      );

      await act(async () => {
        vi.runAllTimers();
      });

      const ws = global.WebSocket as any;
      const instance = ws.mock.results[0]?.value as MockWebSocket;

      act(() => {
        instance.simulateMessage({ type: 'title_updated', title: 'New Title' });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });
});
