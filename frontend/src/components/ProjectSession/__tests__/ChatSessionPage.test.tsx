import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatSessionPage from '../ChatSessionPage';
import * as api from '@/services/api';
import * as useOptimizedStreamingModule from '../hooks/useOptimizedStreaming';

// Mock child components
vi.mock('../components/VirtualizedChatList', () => ({
  VirtualizedChatList: ({ messages, isStreaming, streamEvents }: any) => (
    <div data-testid="virtualized-chat-list">
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="is-streaming">{isStreaming ? 'streaming' : 'not-streaming'}</div>
      <div data-testid="stream-events-count">{streamEvents?.length || 0}</div>
    </div>
  ),
}));

vi.mock('../components/MessageInput', () => ({
  MessageInput: ({ onSend, onCancel, isStreaming }: any) => (
    <div data-testid="message-input">
      <button data-testid="send-button" onClick={() => onSend('test message')}>
        Send
      </button>
      <button data-testid="cancel-button" onClick={onCancel} disabled={!isStreaming}>
        Cancel
      </button>
      <div data-testid="input-streaming">{isStreaming ? 'streaming' : 'not-streaming'}</div>
    </div>
  ),
}));

// Mock API
vi.mock('@/services/api', () => ({
  chatSessionsAPI: {
    get: vi.fn(),
  },
  messagesAPI: {
    list: vi.fn(),
  },
}));

// Create mock navigate function at module level
const mockNavigate = vi.fn();

// Mock react-router-dom at module level
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ChatSessionPage', () => {
  let queryClient: QueryClient;
  let mockUseOptimizedStreaming: any;

  const mockSession = {
    id: 'session-123',
    name: 'Test Session',
    environment_type: 'docker',
    project_id: 'project-123',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockMessages = [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Hi there!',
      created_at: '2024-01-01T00:00:10Z',
    },
  ];

  const mockStreamingHook = {
    messages: mockMessages,
    streamEvents: [],
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    cancelStream: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock useOptimizedStreaming
    mockUseOptimizedStreaming = vi
      .spyOn(useOptimizedStreamingModule, 'useOptimizedStreaming')
      .mockReturnValue(mockStreamingHook);

    // Mock API responses
    vi.mocked(api.chatSessionsAPI.get).mockResolvedValue(mockSession);
    vi.mocked(api.messagesAPI.list).mockResolvedValue({ messages: mockMessages });

    // Mock sessionStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (projectId = 'project-123', sessionId = 'session-123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/projects/${projectId}/chat/${sessionId}`]}>
          <Routes>
            <Route
              path="/projects/:projectId/chat/:sessionId"
              element={<ChatSessionPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('rendering', () => {
    it('should render the component with all main sections', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('← Back to Project')).toBeInTheDocument();
        expect(screen.getByTestId('virtualized-chat-list')).toBeInTheDocument();
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
    });

    it('should display session name when loaded', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Test Session')).toBeInTheDocument();
      });
    });

    it('should display default session name while loading', () => {
      vi.mocked(api.chatSessionsAPI.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter();

      expect(screen.getByText('Chat Session')).toBeInTheDocument();
    });

    it('should display environment badge when environment_type is present', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('docker')).toBeInTheDocument();
        expect(screen.getByTitle('Sandbox environment')).toBeInTheDocument();
      });
    });

    it('should not display environment badge when environment_type is null', async () => {
      vi.mocked(api.chatSessionsAPI.get).mockResolvedValue({
        ...mockSession,
        environment_type: null,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.queryByTitle('Sandbox environment')).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate back to project when back button is clicked', async () => {
      const { container } = renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('← Back to Project')).toBeInTheDocument();
      });

      const backButton = screen.getByText('← Back to Project');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-123');
    });

    it('should have correct aria-label on back button', async () => {
      renderWithRouter();

      await waitFor(() => {
        const backButton = screen.getByLabelText('Back to project');
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('message display', () => {
    it('should pass messages to VirtualizedChatList', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('2');
      });
    });

    it('should pass streaming state to VirtualizedChatList', async () => {
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        isStreaming: true,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('is-streaming')).toHaveTextContent('streaming');
      });
    });

    it('should pass stream events to VirtualizedChatList', async () => {
      const streamEvents = [
        { type: 'chunk', content: 'Hello' },
        { type: 'action', tool: 'bash', args: {} },
      ];

      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        streamEvents,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('stream-events-count')).toHaveTextContent('2');
      });
    });
  });

  describe('message input', () => {
    it('should pass sendMessage callback to MessageInput', async () => {
      const sendMessage = vi.fn();
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        sendMessage,
      });

      renderWithRouter();

      await waitFor(() => {
        const sendButton = screen.getByTestId('send-button');
        fireEvent.click(sendButton);
      });

      expect(sendMessage).toHaveBeenCalledWith('test message');
    });

    it('should pass cancelStream callback to MessageInput', async () => {
      const cancelStream = vi.fn();
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        cancelStream,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(cancelStream).toHaveBeenCalled();
    });

    it('should pass streaming state to MessageInput', async () => {
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        isStreaming: true,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('input-streaming')).toHaveTextContent('streaming');
      });
    });
  });

  describe('error handling', () => {
    it('should display error banner when error exists', async () => {
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        error: 'Connection failed',
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    it('should not display error banner when no error', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
      });
    });

    it('should call clearError when close button is clicked', async () => {
      const clearError = vi.fn();
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        error: 'Test error',
        clearError,
      });

      renderWithRouter();

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close error');
        fireEvent.click(closeButton);
      });

      expect(clearError).toHaveBeenCalled();
    });

    it('should have accessible close button', async () => {
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        error: 'Test error',
      });

      renderWithRouter();

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close error');
        expect(closeButton).toHaveAttribute('aria-label', 'Close error');
      });
    });
  });

  describe('pending message handling', () => {
    it('should send pending message from sessionStorage on mount', async () => {
      const sendMessage = vi.fn();
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        sendMessage,
      });

      vi.mocked(Storage.prototype.getItem).mockReturnValue('Pending message from quick start');

      renderWithRouter();

      // Wait for the 500ms timeout in the component
      await waitFor(
        () => {
          expect(sendMessage).toHaveBeenCalledWith('Pending message from quick start');
        },
        { timeout: 1000 }
      );
    });

    it('should remove pending message from sessionStorage after retrieval', async () => {
      vi.mocked(Storage.prototype.getItem).mockReturnValue('Pending message');

      renderWithRouter();

      await waitFor(
        () => {
          expect(Storage.prototype.removeItem).toHaveBeenCalledWith('pendingMessage');
        },
        { timeout: 1000 }
      );
    });

    it('should not send message if no pending message in sessionStorage', async () => {
      const sendMessage = vi.fn();
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        sendMessage,
      });

      vi.mocked(Storage.prototype.getItem).mockReturnValue(null);

      renderWithRouter();

      // Wait a bit to ensure no message is sent
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should not send pending message if sessionId is not available', async () => {
      const sendMessage = vi.fn();
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        sendMessage,
      });

      vi.mocked(Storage.prototype.getItem).mockReturnValue('Pending message');

      // Render with undefined sessionId
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/project-123/chat/']}>
            <Routes>
              <Route path="/projects/:projectId/chat/" element={<ChatSessionPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait a bit to ensure no message is sent
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('React Query integration', () => {
    it('should fetch session metadata on mount', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(api.chatSessionsAPI.get).toHaveBeenCalledWith('session-123');
      });
    });

    it('should fetch messages on mount', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(api.messagesAPI.list).toHaveBeenCalledWith('session-123');
      });
    });

    it('should not fetch session when sessionId is undefined', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/project-123/chat/']}>
            <Routes>
              <Route path="/projects/:projectId/chat/" element={<ChatSessionPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(api.chatSessionsAPI.get).not.toHaveBeenCalled();
    });

    it('should not fetch messages when sessionId is undefined', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/project-123/chat/']}>
            <Routes>
              <Route path="/projects/:projectId/chat/" element={<ChatSessionPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(api.messagesAPI.list).not.toHaveBeenCalled();
    });

    it('should pass initial messages to useOptimizedStreaming', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(mockUseOptimizedStreaming).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'session-123',
            initialMessages: mockMessages,
          })
        );
      });
    });

    it('should pass empty array when no messages data', () => {
      vi.mocked(api.messagesAPI.list).mockResolvedValue({ messages: undefined });

      renderWithRouter();

      expect(mockUseOptimizedStreaming).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessages: [],
        })
      );
    });
  });

  describe('URL parameters', () => {
    it('should extract projectId from URL', async () => {
      renderWithRouter('project-456', 'session-789');

      await waitFor(() => {
        const backButton = screen.getByText('← Back to Project');
        fireEvent.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-456');
    });

    it('should extract sessionId from URL', async () => {
      renderWithRouter('project-456', 'session-789');

      await waitFor(() => {
        expect(api.chatSessionsAPI.get).toHaveBeenCalledWith('session-789');
        expect(api.messagesAPI.list).toHaveBeenCalledWith('session-789');
      });
    });
  });

  describe('component structure', () => {
    it('should have correct CSS classes', async () => {
      const { container } = renderWithRouter();

      await waitFor(() => {
        expect(container.querySelector('.chat-session-page')).toBeInTheDocument();
        expect(container.querySelector('.chat-header')).toBeInTheDocument();
        expect(container.querySelector('.chat-messages-container')).toBeInTheDocument();
      });
    });

    it('should have correct header structure', async () => {
      const { container } = renderWithRouter();

      await waitFor(() => {
        expect(container.querySelector('.back-btn')).toBeInTheDocument();
        expect(container.querySelector('.session-title')).toBeInTheDocument();
        expect(container.querySelector('.header-spacer')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle session API error gracefully', async () => {
      vi.mocked(api.chatSessionsAPI.get).mockRejectedValue(new Error('API Error'));

      renderWithRouter();

      // Should still render the page with default values
      await waitFor(() => {
        expect(screen.getByText('Chat Session')).toBeInTheDocument();
      });
    });

    it('should handle messages API error gracefully', async () => {
      vi.mocked(api.messagesAPI.list).mockRejectedValue(new Error('API Error'));

      renderWithRouter();

      // Should still render the page
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-chat-list')).toBeInTheDocument();
      });
    });

    it('should handle empty messages array', async () => {
      vi.mocked(api.messagesAPI.list).mockResolvedValue({ messages: [] });
      mockUseOptimizedStreaming.mockReturnValue({
        ...mockStreamingHook,
        messages: [],
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('0');
      });
    });

    it('should handle session with long name', async () => {
      vi.mocked(api.chatSessionsAPI.get).mockResolvedValue({
        ...mockSession,
        name: 'This is a very long session name that should be handled properly',
      });

      renderWithRouter();

      await waitFor(() => {
        expect(
          screen.getByText('This is a very long session name that should be handled properly')
        ).toBeInTheDocument();
      });
    });

    it('should handle multiple environment types', async () => {
      const environments = ['docker', 'python', 'node'];

      for (const env of environments) {
        vi.mocked(api.chatSessionsAPI.get).mockResolvedValue({
          ...mockSession,
          environment_type: env,
        });

        const { unmount } = renderWithRouter();

        await waitFor(() => {
          expect(screen.getByText(env)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });
});
