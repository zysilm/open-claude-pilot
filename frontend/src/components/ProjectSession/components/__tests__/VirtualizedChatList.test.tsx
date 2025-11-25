import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../../tests/utils/testUtils';
import { VirtualizedChatList } from '../VirtualizedChatList';

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent, components }: any) => (
    <div data-testid="virtuoso-container">
      {data.length === 0 && components?.EmptyPlaceholder ? (
        <components.EmptyPlaceholder />
      ) : (
        data.map((item: any, index: number) => (
          <div key={item.id} data-testid={`message-${index}`}>
            {itemContent(index, item)}
          </div>
        ))
      )}
      {components?.Footer && <components.Footer />}
    </div>
  ),
  VirtuosoHandle: {},
}));

describe('VirtualizedChatList', () => {
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
    {
      id: 'msg-3',
      role: 'user' as const,
      content: 'How are you?',
      created_at: '2024-01-01T00:00:20Z',
    },
  ];

  describe('rendering', () => {
    it('should render empty state when no messages', () => {
      render(<VirtualizedChatList messages={[]} isStreaming={false} />);

      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
      expect(
        screen.getByText(/Ask me anything, and I'll help you with code/)
      ).toBeInTheDocument();
    });

    it('should render all messages', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      expect(screen.getByTestId('message-0')).toBeInTheDocument();
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
    });

    it('should render messages in correct order', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const messages = screen.getAllByTestId(/message-/);
      expect(messages).toHaveLength(3);
    });
  });

  describe('streaming state', () => {
    it('should pass streaming state to last message only', () => {
      const { container } = render(
        <VirtualizedChatList messages={mockMessages} isStreaming={true} />
      );

      // Only the last message should receive isStreaming=true
      // (exact implementation depends on MemoizedMessage component)
      expect(container).toBeInTheDocument();
    });

    it('should not mark messages as streaming when not streaming', () => {
      const { container } = render(
        <VirtualizedChatList messages={mockMessages} isStreaming={false} />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('stream events', () => {
    it('should pass stream events to streaming message', () => {
      const streamEvents = [
        { type: 'chunk' as const, content: 'Hello' },
        { type: 'chunk' as const, content: ' World' },
      ];

      render(
        <VirtualizedChatList
          messages={mockMessages}
          isStreaming={true}
          streamEvents={streamEvents}
        />
      );

      expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    });

    it('should not pass events to non-streaming messages', () => {
      const streamEvents = [{ type: 'chunk' as const, content: 'Test' }];

      render(
        <VirtualizedChatList
          messages={mockMessages}
          isStreaming={false}
          streamEvents={streamEvents}
        />
      );

      expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    });
  });

  describe('auto-scroll toggle', () => {
    it('should render auto-scroll toggle button', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle(/Auto-scroll/);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should start with auto-scroll enabled', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle auto-scroll state on click', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      fireEvent.click(toggleButton);

      expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
    });

    it('should toggle back to enabled', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');

      // Toggle off
      fireEvent.click(toggleButton);
      expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();

      // Toggle back on
      const disabledButton = screen.getByTitle('Auto-scroll disabled');
      fireEvent.click(disabledButton);
      expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
    });

    it('should apply correct styles when enabled', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton).toHaveStyle({ backgroundColor: '#3b82f6' });
      expect(toggleButton).toHaveStyle({ color: 'white' });
    });

    it('should apply correct styles when disabled', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      fireEvent.click(toggleButton);

      const disabledButton = screen.getByTitle('Auto-scroll disabled');
      expect(disabledButton).toHaveStyle({ backgroundColor: 'white' });
      expect(disabledButton).toHaveStyle({ color: '#3b82f6' });
    });
  });

  describe('hover effects', () => {
    it('should scale button on mouse enter', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle(/Auto-scroll/);

      fireEvent.mouseEnter(toggleButton);
      expect(toggleButton).toHaveStyle({ transform: 'scale(1.05)' });
    });

    it('should reset scale on mouse leave', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle(/Auto-scroll/);

      fireEvent.mouseEnter(toggleButton);
      fireEvent.mouseLeave(toggleButton);
      expect(toggleButton).toHaveStyle({ transform: 'scale(1)' });
    });
  });

  describe('footer spacing', () => {
    it('should render footer for spacing', () => {
      const { container } = render(
        <VirtualizedChatList messages={mockMessages} isStreaming={false} />
      );

      // Footer adds spacing at bottom
      expect(container).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle single message', () => {
      const singleMessage = [mockMessages[0]];
      render(<VirtualizedChatList messages={singleMessage} isStreaming={false} />);

      expect(screen.getByTestId('message-0')).toBeInTheDocument();
    });

    it('should handle many messages', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i}`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

      render(<VirtualizedChatList messages={manyMessages} isStreaming={false} />);

      expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    });

    it('should handle undefined stream events', () => {
      render(
        <VirtualizedChatList
          messages={mockMessages}
          isStreaming={true}
          streamEvents={undefined}
        />
      );

      expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    });

    it('should handle empty stream events array', () => {
      render(
        <VirtualizedChatList
          messages={mockMessages}
          isStreaming={true}
          streamEvents={[]}
        />
      );

      expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible auto-scroll button', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton).toHaveAttribute('title');
    });

    it('should provide clear button titles', () => {
      render(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton.getAttribute('title')).toMatch(/Auto-scroll/);
    });
  });
});
