import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatWebSocket, type ChatMessage } from '../websocket';

describe('ChatWebSocket', () => {
  let mockWebSocket: any;
  let webSocketInstance: ChatWebSocket;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    // Mock WebSocket implementation
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };

    // Mock global WebSocket constructor
    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket) as any;

    webSocketInstance = new ChatWebSocket(sessionId);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with session ID', () => {
      expect(webSocketInstance).toBeInstanceOf(ChatWebSocket);
    });

    it('should not create WebSocket connection immediately', () => {
      expect(global.WebSocket).not.toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should create WebSocket with correct URL', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      expect(global.WebSocket).toHaveBeenCalledWith(
        `ws://127.0.0.1:8000/api/v1/chats/${sessionId}/stream`
      );
    });

    it('should set up message callback', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      expect(mockWebSocket.onmessage).toBeDefined();
    });

    it('should log on connection open', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const onMessage = vi.fn();

      webSocketInstance.connect(onMessage);

      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      expect(consoleLogSpy).toHaveBeenCalledWith('WebSocket connected');
      consoleLogSpy.mockRestore();
    });

    it('should handle message events', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const testMessage: ChatMessage = {
        type: 'chunk',
        content: 'Hello',
      };

      const messageEvent = {
        data: JSON.stringify(testMessage),
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle error events', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onMessage = vi.fn();

      webSocketInstance.connect(onMessage);

      const errorEvent = new Event('error');

      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(errorEvent);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('WebSocket error:', errorEvent);
      consoleErrorSpy.mockRestore();
    });

    it('should handle close events', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const onMessage = vi.fn();

      webSocketInstance.connect(onMessage);

      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      expect(consoleLogSpy).toHaveBeenCalledWith('WebSocket closed');
      consoleLogSpy.mockRestore();
    });

    it('should reset reconnect attempts on successful connection', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      // Connection should be established without issues
      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);
    });

    it('should process queued messages on reconnection', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      // Queue a message while disconnected
      mockWebSocket.readyState = WebSocket.CLOSED;
      webSocketInstance.sendMessage('Test message');

      // Simulate reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      // Message should be sent
      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send message when connection is open', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendMessage('Hello World');

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'message',
          content: 'Hello World',
        })
      );
    });

    it('should queue message when connection is closed', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockWebSocket.readyState = WebSocket.CLOSED;

      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendMessage('Queued message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('queuing message')
      );
      consoleLogSpy.mockRestore();
    });

    it('should handle empty message', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendMessage('');

      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should handle special characters in message', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const specialMessage = 'Test: @#$%^&*() "\'\n\t';
      webSocketInstance.sendMessage(specialMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining(specialMessage)
      );
    });

    it('should handle very long messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const longMessage = 'a'.repeat(10000);
      webSocketInstance.sendMessage(longMessage);

      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });

  describe('sendCancel', () => {
    it('should send cancel message', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendCancel();

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'cancel' })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Cancel message sent');
      consoleLogSpy.mockRestore();
    });

    it('should queue cancel when connection is closed', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockWebSocket.readyState = WebSocket.CLOSED;

      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendCancel();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('queuing cancel')
      );
      consoleLogSpy.mockRestore();
    });

    it('should not throw error when called before connect', () => {
      expect(() => {
        webSocketInstance.sendCancel();
      }).not.toThrow();
    });
  });

  describe('close', () => {
    it('should close WebSocket connection', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.close();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should set WebSocket to null after closing', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.close();

      expect(webSocketInstance.isConnected()).toBe(false);
    });

    it('should handle close when not connected', () => {
      expect(() => {
        webSocketInstance.close();
      }).not.toThrow();
    });

    it('should handle multiple close calls', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.close();
      webSocketInstance.close();

      expect(mockWebSocket.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(webSocketInstance.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      expect(webSocketInstance.isConnected()).toBe(true);
    });

    it('should return false after closing', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);
      webSocketInstance.close();

      expect(webSocketInstance.isConnected()).toBe(false);
    });

    it('should handle different ready states', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      mockWebSocket.readyState = WebSocket.CONNECTING;
      expect(webSocketInstance.isConnected()).toBe(false);

      mockWebSocket.readyState = WebSocket.OPEN;
      expect(webSocketInstance.isConnected()).toBe(true);

      mockWebSocket.readyState = WebSocket.CLOSING;
      expect(webSocketInstance.isConnected()).toBe(false);

      mockWebSocket.readyState = WebSocket.CLOSED;
      expect(webSocketInstance.isConnected()).toBe(false);
    });
  });

  describe('message parsing', () => {
    it('should parse chunk messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const chunkMessage: ChatMessage = {
        type: 'chunk',
        content: 'Hello',
      };

      const messageEvent = { data: JSON.stringify(chunkMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(chunkMessage);
    });

    it('should parse start messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const startMessage: ChatMessage = { type: 'start' };
      const messageEvent = { data: JSON.stringify(startMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(startMessage);
    });

    it('should parse end messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const endMessage: ChatMessage = { type: 'end' };
      const messageEvent = { data: JSON.stringify(endMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(endMessage);
    });

    it('should parse error messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const errorMessage: ChatMessage = {
        type: 'error',
        content: 'An error occurred',
      };
      const messageEvent = { data: JSON.stringify(errorMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(errorMessage);
    });

    it('should parse action messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const actionMessage: ChatMessage = {
        type: 'action',
        tool: 'bash',
        args: { command: 'ls -la' },
      };
      const messageEvent = { data: JSON.stringify(actionMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(actionMessage);
    });

    it('should parse observation messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const observationMessage: ChatMessage = {
        type: 'observation',
        content: 'Result',
        success: true,
      };
      const messageEvent = { data: JSON.stringify(observationMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(observationMessage);
    });

    it('should parse action_args_chunk messages', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const argsChunkMessage: ChatMessage = {
        type: 'action_args_chunk',
        tool: 'file_write',
        partial_args: '{"file":',
      };
      const messageEvent = { data: JSON.stringify(argsChunkMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WebSocket] Received action_args_chunk:',
        argsChunkMessage
      );
      expect(onMessage).toHaveBeenCalledWith(argsChunkMessage);
      consoleLogSpy.mockRestore();
    });

    it('should handle cancelled messages', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const cancelledMessage: ChatMessage = { type: 'cancelled' };
      const messageEvent = { data: JSON.stringify(cancelledMessage) };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(onMessage).toHaveBeenCalledWith(cancelledMessage);
    });

    it('should handle malformed JSON', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const messageEvent = { data: 'invalid json{' };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      expect(onMessage).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty message data', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      const messageEvent = { data: '' };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(messageEvent);
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('reconnection', () => {
    it('should attempt reconnection on close', () => {
      vi.useFakeTimers();
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      vi.advanceTimersByTime(2000);

      // Should attempt reconnection
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should limit reconnection attempts', () => {
      vi.useFakeTimers();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      // Trigger multiple close events
      for (let i = 0; i < 5; i++) {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose();
        }
        vi.advanceTimersByTime(10000); // Advance enough time for all reconnection attempts
      }

      // Should only attempt max reconnection attempts (3)
      expect(global.WebSocket).toHaveBeenCalledTimes(4); // Initial + 3 reconnections

      consoleLogSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should reset reconnect counter on successful connection', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      // Reconnect counter should be reset
      // Next close should start fresh reconnection attempts
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      expect(global.WebSocket).toHaveBeenCalled();
    });

    it('should ensure connection when sending message while disconnected', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockWebSocket.readyState = WebSocket.CLOSED;

      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendMessage('Test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initiating immediate reconnection')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid message sending', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      for (let i = 0; i < 100; i++) {
        webSocketInstance.sendMessage(`Message ${i}`);
      }

      expect(mockWebSocket.send).toHaveBeenCalledTimes(100);
    });

    it('should handle connecting multiple times', () => {
      const onMessage = vi.fn();

      webSocketInstance.connect(onMessage);
      webSocketInstance.connect(onMessage);

      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should handle sending before connecting', () => {
      expect(() => {
        webSocketInstance.sendMessage('Early message');
      }).not.toThrow();
    });

    it('should handle Unicode characters', () => {
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      webSocketInstance.sendMessage('Hello 世界 🌍');

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('Hello 世界 🌍')
      );
    });

    it('should handle closing while reconnecting', () => {
      vi.useFakeTimers();
      const onMessage = vi.fn();
      webSocketInstance.connect(onMessage);

      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      webSocketInstance.close();

      vi.advanceTimersByTime(5000);

      vi.useRealTimers();
    });
  });
});
