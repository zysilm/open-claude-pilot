import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../../tests/utils/testUtils';
import { MemoizedMessage } from '../MemoizedMessage';
import type { StreamEvent } from '../../hooks/useOptimizedStreaming';

describe('MemoizedMessage', () => {
  const mockUserMessage = {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, how can you help me?',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockAssistantMessage = {
    id: 'msg-2',
    role: 'assistant' as const,
    content: 'Hello! I can help you with coding tasks.',
    created_at: '2024-01-01T00:00:10Z',
  };

  describe('user messages', () => {
    it('should render user message', () => {
      render(<MemoizedMessage message={mockUserMessage} />);

      expect(screen.getByText('Hello, how can you help me?')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should apply user role class', () => {
      const { container } = render(<MemoizedMessage message={mockUserMessage} />);

      const messageWrapper = container.querySelector('.message-wrapper.user');
      expect(messageWrapper).toBeInTheDocument();
    });

    it('should preserve whitespace in user messages', () => {
      const messageWithWhitespace = {
        ...mockUserMessage,
        content: 'Line 1\nLine 2\n  Indented',
      };

      render(<MemoizedMessage message={messageWithWhitespace} />);

      const messageBody = screen.getByText(/Line 1/).closest('.message-body');
      expect(messageBody).toHaveStyle({ whiteSpace: 'pre-wrap' });
    });
  });

  describe('assistant messages', () => {
    it('should render assistant message', () => {
      render(<MemoizedMessage message={mockAssistantMessage} />);

      expect(screen.getByText('Hello! I can help you with coding tasks.')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('should apply assistant role class', () => {
      const { container } = render(<MemoizedMessage message={mockAssistantMessage} />);

      const messageWrapper = container.querySelector('.message-wrapper.assistant');
      expect(messageWrapper).toBeInTheDocument();
    });

    it('should render markdown content for assistant', () => {
      const messageWithMarkdown = {
        ...mockAssistantMessage,
        content: 'Here is some **bold** text and `code`',
      };

      render(<MemoizedMessage message={messageWithMarkdown} />);

      // Markdown should be rendered (exact structure depends on markdown renderer)
      expect(screen.getByText(/bold/)).toBeInTheDocument();
    });
  });

  describe('streaming state', () => {
    it('should show streaming cursor when streaming', () => {
      const { container } = render(
        <MemoizedMessage message={mockAssistantMessage} isStreaming={true} />
      );

      const cursor = container.querySelector('.streaming-cursor');
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveTextContent('▋');
    });

    it('should not show cursor when not streaming', () => {
      const { container } = render(
        <MemoizedMessage message={mockAssistantMessage} isStreaming={false} />
      );

      const cursor = container.querySelector('.streaming-cursor');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  describe('stream events', () => {
    it('should render chunk events while streaming', () => {
      const streamEvents: StreamEvent[] = [
        { type: 'chunk', content: 'Hello' },
        { type: 'chunk', content: ' World' },
      ];

      const streamingMessage = {
        ...mockAssistantMessage,
        content: '',
      };

      render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      // Content should be rendered via Streamdown
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });

    it('should render action events', () => {
      const streamEvents: StreamEvent[] = [
        {
          type: 'action',
          content: 'Using file_write',
          tool: 'file_write',
          args: { file_path: '/test.txt', content: 'test' },
          step: 1,
        },
      ];

      const streamingMessage = {
        ...mockAssistantMessage,
        content: '',
      };

      const { container } = render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      const actionUsage = container.querySelector('.action-usage');
      expect(actionUsage).toBeInTheDocument();
      expect(screen.getByText(/file_write/)).toBeInTheDocument();
    });

    it('should render observation events', () => {
      const streamEvents: StreamEvent[] = [
        {
          type: 'observation',
          content: 'File written successfully',
          success: true,
          step: 1,
        },
      ];

      const streamingMessage = {
        ...mockAssistantMessage,
        content: '',
      };

      const { container } = render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      const observation = container.querySelector('.observation.success');
      expect(observation).toBeInTheDocument();
      expect(screen.getByText('File written successfully')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should render error observations', () => {
      const streamEvents: StreamEvent[] = [
        {
          type: 'observation',
          content: 'Command failed',
          success: false,
          step: 1,
        },
      ];

      const streamingMessage = {
        ...mockAssistantMessage,
        content: '',
      };

      const { container } = render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      const observation = container.querySelector('.observation.error');
      expect(observation).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('should filter action_args_chunk events when action arrives', () => {
      const streamEvents: StreamEvent[] = [
        {
          type: 'action_args_chunk',
          content: '{"file":',
          tool: 'file_write',
          partial_args: '{"file":',
          step: 1,
        },
        {
          type: 'action',
          content: 'Using file_write',
          tool: 'file_write',
          args: { file: 'test.txt' },
          step: 1,
        },
      ];

      const streamingMessage = {
        ...mockAssistantMessage,
        content: '',
      };

      const { container } = render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      // Should only show action, not the partial args
      const argsStreaming = container.querySelector('.args-streaming');
      expect(argsStreaming).not.toBeInTheDocument();
    });

    it('should show last action_args_chunk when no action yet', () => {
      const streamEvents: StreamEvent[] = [
        {
          type: 'action_args_chunk',
          content: '{"file": "test.txt"}',
          tool: 'file_write',
          partial_args: '{"file": "test.txt"}',
          step: 1,
        },
      ];

      const streamingMessage = {
        ...mockAssistantMessage,
        content: '',
      };

      const { container } = render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      const argsStreaming = container.querySelector('.args-streaming');
      expect(argsStreaming).toBeInTheDocument();
    });
  });

  describe('persisted agent actions', () => {
    it('should render persisted agent actions', () => {
      const messageWithActions = {
        ...mockAssistantMessage,
        agent_actions: [
          {
            id: 'action-1',
            action_type: 'bash',
            action_input: { command: 'ls -la' },
            action_output: 'file1.txt\nfile2.txt',
            status: 'success',
            created_at: '2024-01-01T00:00:05Z',
          },
        ],
      };

      const { container } = render(<MemoizedMessage message={messageWithActions} />);

      const agentActions = container.querySelector('.agent-actions-inline');
      expect(agentActions).toBeInTheDocument();
      expect(screen.getByText(/bash/)).toBeInTheDocument();
    });

    it('should show action results', () => {
      const messageWithActions = {
        ...mockAssistantMessage,
        agent_actions: [
          {
            id: 'action-1',
            action_type: 'file_write',
            action_input: { file_path: '/test.txt' },
            action_output: 'Success',
            status: 'success',
            created_at: '2024-01-01T00:00:05Z',
          },
        ],
      };

      render(<MemoizedMessage message={messageWithActions} />);

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should sort agent actions by created_at', () => {
      const messageWithActions = {
        ...mockAssistantMessage,
        agent_actions: [
          {
            id: 'action-2',
            action_type: 'second',
            action_input: {},
            action_output: 'Second',
            status: 'success',
            created_at: '2024-01-01T00:00:10Z',
          },
          {
            id: 'action-1',
            action_type: 'first',
            action_input: {},
            action_output: 'First',
            status: 'success',
            created_at: '2024-01-01T00:00:05Z',
          },
        ],
      };

      const { container } = render(<MemoizedMessage message={messageWithActions} />);

      const actionBlocks = container.querySelectorAll('.action-block');
      expect(actionBlocks).toHaveLength(2);
      // First action should appear before second (sorted by created_at)
      const texts = Array.from(actionBlocks).map((block) => block.textContent);
      expect(texts[0]).toContain('first');
      expect(texts[1]).toContain('second');
    });
  });

  describe('memoization', () => {
    it('should not re-render if props unchanged', () => {
      const { rerender } = render(<MemoizedMessage message={mockUserMessage} />);

      const initialElement = screen.getByText('Hello, how can you help me?');

      // Rerender with same props
      rerender(<MemoizedMessage message={mockUserMessage} />);

      const afterElement = screen.getByText('Hello, how can you help me?');

      // Should be the same DOM element (memoized)
      expect(initialElement).toBe(afterElement);
    });

    it('should re-render if content changes', () => {
      const { rerender } = render(<MemoizedMessage message={mockUserMessage} />);

      expect(screen.getByText('Hello, how can you help me?')).toBeInTheDocument();

      const updatedMessage = {
        ...mockUserMessage,
        content: 'Updated content',
      };

      rerender(<MemoizedMessage message={updatedMessage} />);

      expect(screen.getByText('Updated content')).toBeInTheDocument();
      expect(screen.queryByText('Hello, how can you help me?')).not.toBeInTheDocument();
    });

    it('should re-render if streaming state changes', () => {
      const { rerender } = render(
        <MemoizedMessage message={mockAssistantMessage} isStreaming={false} />
      );

      expect(screen.queryByText('▋')).not.toBeInTheDocument();

      rerender(<MemoizedMessage message={mockAssistantMessage} isStreaming={true} />);

      expect(screen.getByText('▋')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const emptyMessage = {
        ...mockUserMessage,
        content: '',
      };

      render(<MemoizedMessage message={emptyMessage} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should handle messages without agent_actions', () => {
      const message = {
        ...mockAssistantMessage,
        agent_actions: undefined,
      };

      const { container } = render(<MemoizedMessage message={message} />);

      const agentActions = container.querySelector('.agent-actions-inline');
      expect(agentActions).not.toBeInTheDocument();
    });

    it('should handle empty agent_actions array', () => {
      const message = {
        ...mockAssistantMessage,
        agent_actions: [],
      };

      const { container } = render(<MemoizedMessage message={message} />);

      const agentActions = container.querySelector('.agent-actions-inline');
      expect(agentActions).not.toBeInTheDocument();
    });

    it('should handle streaming with no events', () => {
      const streamingMessage = {
        ...mockAssistantMessage,
        content: 'Streaming content',
      };

      render(
        <MemoizedMessage
          message={streamingMessage}
          isStreaming={true}
          streamEvents={[]}
        />
      );

      expect(screen.getByText('Streaming content')).toBeInTheDocument();
      expect(screen.getByText('▋')).toBeInTheDocument();
    });
  });
});
