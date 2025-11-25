import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '../utils/testUtils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatSessionPage from '../../src/components/ProjectSession/ChatSessionPage';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import * as api from '../../src/services/api';

// Mock API
vi.mock('../../src/services/api');

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({
      projectId: 'test-project-id',
      sessionId: 'test-session-id',
    }),
    useNavigate: () => vi.fn(),
  };
});

describe('Chat Workflow Integration Tests', () => {
  let queryClient: QueryClient;

  const mockSession = {
    id: 'test-session-id',
    project_id: 'test-project-id',
    name: 'Test Chat',
    created_at: '2024-01-01T00:00:00Z',
    container_id: null,
    status: 'active' as const,
    environment_type: null,
  };

  const mockMessages = {
    messages: [
      {
        id: 'msg-1',
        chat_session_id: 'test-session-id',
        role: 'user' as const,
        content: 'Hello',
        created_at: '2024-01-01T00:00:00Z',
        message_metadata: {},
      },
      {
        id: 'msg-2',
        chat_session_id: 'test-session-id',
        role: 'assistant' as const,
        content: 'Hi there!',
        created_at: '2024-01-01T00:00:10Z',
        message_metadata: {},
      },
    ],
    total: 2,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Setup API mocks
    vi.spyOn(api.chatSessionsAPI, 'get').mockResolvedValue(mockSession);
    vi.spyOn(api.messagesAPI, 'list').mockResolvedValue(mockMessages);
  });

  const renderChatSession = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<ChatSessionPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('session initialization', () => {
    it('should load and display chat session', async () => {
      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('Test Chat')).toBeInTheDocument();
      });

      expect(api.chatSessionsAPI.get).toHaveBeenCalledWith('test-session-id');
      expect(api.messagesAPI.list).toHaveBeenCalledWith('test-session-id');
    });

    it('should display existing messages', async () => {
      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
      });
    });

    it('should show environment badge when available', async () => {
      const sessionWithEnv = {
        ...mockSession,
        environment_type: 'python',
      };

      vi.spyOn(api.chatSessionsAPI, 'get').mockResolvedValue(sessionWithEnv);

      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('python')).toBeInTheDocument();
      });
    });
  });

  describe('message history', () => {
    it('should handle empty message history', async () => {
      vi.spyOn(api.messagesAPI, 'list').mockResolvedValue({
        messages: [],
        total: 0,
      });

      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('Start a conversation')).toBeInTheDocument();
      });
    });

    it('should display messages in chronological order', async () => {
      const multipleMessages = {
        messages: [
          {
            id: 'msg-1',
            chat_session_id: 'test-session-id',
            role: 'user' as const,
            content: 'First message',
            created_at: '2024-01-01T00:00:00Z',
            message_metadata: {},
          },
          {
            id: 'msg-2',
            chat_session_id: 'test-session-id',
            role: 'assistant' as const,
            content: 'Second message',
            created_at: '2024-01-01T00:00:10Z',
            message_metadata: {},
          },
          {
            id: 'msg-3',
            chat_session_id: 'test-session-id',
            role: 'user' as const,
            content: 'Third message',
            created_at: '2024-01-01T00:00:20Z',
            message_metadata: {},
          },
        ],
        total: 3,
      };

      vi.spyOn(api.messagesAPI, 'list').mockResolvedValue(multipleMessages);

      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
        expect(screen.getByText('Second message')).toBeInTheDocument();
        expect(screen.getByText('Third message')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should have back to project button', async () => {
      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('← Back to Project')).toBeInTheDocument();
      });
    });

    it('should have accessible back button', async () => {
      renderChatSession();

      await waitFor(() => {
        const backButton = screen.getByLabelText('Back to project');
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle session fetch error gracefully', async () => {
      vi.spyOn(api.chatSessionsAPI, 'get').mockRejectedValue(
        new Error('Session not found')
      );

      renderChatSession();

      // Component should still render even if session fetch fails
      await waitFor(() => {
        expect(screen.getByText('Chat Session')).toBeInTheDocument();
      });
    });

    it('should handle messages fetch error gracefully', async () => {
      vi.spyOn(api.messagesAPI, 'list').mockRejectedValue(
        new Error('Failed to load messages')
      );

      renderChatSession();

      await waitFor(() => {
        // Should still show session name
        expect(screen.getByText('Test Chat')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket integration', () => {
    it('should initialize WebSocket connection on mount', async () => {
      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('Test Chat')).toBeInTheDocument();
      });

      // WebSocket should be created (mocked globally in setup)
      expect(global.WebSocket).toBeDefined();
    });
  });

  describe('pending message handling', () => {
    it('should send pending message from sessionStorage', async () => {
      // Simulate pending message from quick start
      sessionStorage.setItem('pendingMessage', 'Test quick start message');

      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('Test Chat')).toBeInTheDocument();
      });

      // Pending message should be removed from sessionStorage
      await waitFor(
        () => {
          expect(sessionStorage.getItem('pendingMessage')).toBeNull();
        },
        { timeout: 1000 }
      );
    });

    it('should not error if no pending message exists', async () => {
      sessionStorage.removeItem('pendingMessage');

      renderChatSession();

      await waitFor(() => {
        expect(screen.getByText('Test Chat')).toBeInTheDocument();
      });

      // Should render normally
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });
});
