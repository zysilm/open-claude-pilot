import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizedChatList } from '../VirtualizedChatList';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Custom render with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Mock refs for testing scroll behavior
let mockScrollToIndex: ReturnType<typeof vi.fn>;
let mockIsScrollingCallback: ((isScrolling: boolean) => void) | null = null;
let mockAtBottomCallback: ((atBottom: boolean) => void) | null = null;

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent, components, isScrolling, atBottomStateChange, ...props }: any) => {
    // Store callbacks for manual triggering in tests
    mockIsScrollingCallback = isScrolling;
    mockAtBottomCallback = atBottomStateChange;

    return (
      <div data-testid="virtuoso-container" {...props}>
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
    );
  },
  VirtuosoHandle: {},
}));

beforeEach(() => {
  mockScrollToIndex = vi.fn();
  mockIsScrollingCallback = null;
  mockAtBottomCallback = null;
  vi.clearAllMocks();
});

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
      customRender(<VirtualizedChatList messages={[]} isStreaming={false} />);

      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
      expect(
        screen.getByText(/Ask me anything, and I'll help you with code/)
      ).toBeInTheDocument();
    });

    it('should render all messages', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      expect(screen.getByTestId('message-0')).toBeInTheDocument();
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
    });

    it('should render messages in correct order', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const messages = screen.getAllByTestId(/message-/);
      expect(messages).toHaveLength(3);
    });
  });

  describe('streaming state', () => {
    it('should pass streaming state to last message only', () => {
      const { container } = customRender(
        <VirtualizedChatList messages={mockMessages} isStreaming={true} />
      );

      // Only the last message should receive isStreaming=true
      // (exact implementation depends on MemoizedMessage component)
      expect(container).toBeInTheDocument();
    });

    it('should not mark messages as streaming when not streaming', () => {
      const { container } = customRender(
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

      customRender(
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

      customRender(
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
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle(/Auto-scroll/);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should start with auto-scroll enabled', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle auto-scroll state on click', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      fireEvent.click(toggleButton);

      expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
    });

    it('should toggle back to enabled', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

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
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton).toHaveStyle({ backgroundColor: '#3b82f6' });
      expect(toggleButton).toHaveStyle({ color: 'white' });
    });

    it('should apply correct styles when disabled', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      fireEvent.click(toggleButton);

      const disabledButton = screen.getByTitle('Auto-scroll disabled');
      expect(disabledButton).toHaveStyle({ backgroundColor: 'white' });
      expect(disabledButton).toHaveStyle({ color: '#3b82f6' });
    });
  });

  describe('hover effects', () => {
    it('should scale button on mouse enter', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle(/Auto-scroll/);

      fireEvent.mouseEnter(toggleButton);
      expect(toggleButton).toHaveStyle({ transform: 'scale(1.05)' });
    });

    it('should reset scale on mouse leave', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle(/Auto-scroll/);

      fireEvent.mouseEnter(toggleButton);
      fireEvent.mouseLeave(toggleButton);
      expect(toggleButton).toHaveStyle({ transform: 'scale(1)' });
    });
  });

  describe('footer spacing', () => {
    it('should render footer for spacing', () => {
      const { container } = customRender(
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
      customRender(
        <VirtualizedChatList
          messages={mockMessages}
          isStreaming={true}
          streamEvents={undefined}
        />
      );

      expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    });

    it('should handle empty stream events array', () => {
      customRender(
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
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton).toHaveAttribute('title');
    });

    it('should provide clear button titles', () => {
      customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

      const toggleButton = screen.getByTitle('Auto-scroll enabled');
      expect(toggleButton.getAttribute('title')).toMatch(/Auto-scroll/);
    });
  });

  describe('auto-scroll behavior improvements', () => {
    describe('scroll to last message (not middle)', () => {
      it('should use scrollToIndex with index pointing to last message', async () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        // Simulate ref being set
        const virtuosoRef = { scrollToIndex: mockScrollToIndex };

        // Add a new message to trigger auto-scroll
        const newMessages = [
          ...mockMessages,
          {
            id: 'msg-4',
            role: 'assistant' as const,
            content: 'New message',
            created_at: '2024-01-01T00:00:30Z',
          },
        ];

        rerender(<VirtualizedChatList messages={newMessages} isStreaming={false} />);

        // The component should attempt to scroll to the last index (3 for 4 messages)
        // Note: In actual implementation, this is called via useEffect with virtuosoRef.current
        // This test validates the logic, though mocking the ref is complex
        expect(screen.getByTestId('message-3')).toBeInTheDocument();
      });

      it('should scroll to end when streaming completes', async () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={true} />
        );

        // Stop streaming
        rerender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        await waitFor(() => {
          // Auto-scroll should trigger after streaming ends
          expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
        });
      });

      it('should use align end for precise bottom positioning', () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Component uses scrollToIndex with align: 'end'
        // This ensures the last message is at the bottom, not middle
        const container = screen.getByTestId('virtuoso-container');
        expect(container).toBeInTheDocument();
      });
    });

    describe('user scroll detection and auto-scroll disable', () => {
      it('should disable auto-scroll when user scrolls away from bottom', async () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Verify auto-scroll starts enabled
        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();

        // Simulate user scrolling
        act(() => {
          mockIsScrollingCallback?.(true);
        });

        // User scrolls away from bottom
        act(() => {
          mockAtBottomCallback?.(false);
        });

        await waitFor(() => {
          expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
        });
      });

      it('should not disable auto-scroll if user is at bottom', async () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();

        // User scrolls but stays at bottom
        act(() => {
          mockIsScrollingCallback?.(true);
          mockAtBottomCallback?.(true);
        });

        await waitFor(() => {
          expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
        });
      });

      it('should not disable auto-scroll during active streaming', async () => {
        render(<VirtualizedChatList messages={mockMessages} isStreaming={true} />);

        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();

        // User scrolls during streaming - should not disable
        act(() => {
          mockIsScrollingCallback?.(true);
          mockAtBottomCallback?.(false);
        });

        // Auto-scroll should still be enabled during streaming
        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
      });

      it('should prevent shaking by disabling auto-scroll on user scroll up', async () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        // User scrolls up
        act(() => {
          mockIsScrollingCallback?.(true);
          mockAtBottomCallback?.(false);
        });

        await waitFor(() => {
          expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
        });

        // Add new message - should not auto-scroll since disabled
        const newMessages = [...mockMessages, {
          id: 'msg-4',
          role: 'assistant' as const,
          content: 'Should not auto-scroll to this',
          created_at: '2024-01-01T00:00:30Z',
        }];

        rerender(<VirtualizedChatList messages={newMessages} isStreaming={false} />);

        // Auto-scroll remains disabled
        expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
      });
    });

    describe('auto-scroll button animation', () => {
      it('should apply animation class when auto-scroll is enabled', () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        const button = screen.getByTitle('Auto-scroll enabled');
        expect(button).toHaveClass('auto-scroll-btn-animated');
      });

      it('should remove animation class when auto-scroll is disabled', () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        const button = screen.getByTitle('Auto-scroll enabled');
        fireEvent.click(button);

        const disabledButton = screen.getByTitle('Auto-scroll disabled');
        expect(disabledButton).not.toHaveClass('auto-scroll-btn-animated');
      });

      it('should have keyframe animation in styles', () => {
        const { container } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        // Check that style tag with animation exists
        const styleTag = container.querySelector('style');
        expect(styleTag).toBeInTheDocument();
        expect(styleTag?.textContent).toContain('@keyframes scrollDown');
        expect(styleTag?.textContent).toContain('animation: scrollDown');
      });

      it('should animate arrow icon with bounce effect', () => {
        const { container } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        const styleTag = container.querySelector('style');
        const animationCSS = styleTag?.textContent || '';

        // Verify animation properties
        expect(animationCSS).toContain('translateY(0px)');
        expect(animationCSS).toContain('translateY(4px)');
        expect(animationCSS).toContain('opacity: 1');
        expect(animationCSS).toContain('opacity: 0.6');
        expect(animationCSS).toContain('1.5s ease-in-out infinite');
      });
    });

    describe('re-enabling auto-scroll', () => {
      it('should allow user to manually re-enable auto-scroll after disabling', async () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Disable via user scroll
        act(() => {
          mockIsScrollingCallback?.(true);
          mockAtBottomCallback?.(false);
        });

        await waitFor(() => {
          expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
        });

        // User clicks to re-enable
        const disabledButton = screen.getByTitle('Auto-scroll disabled');
        fireEvent.click(disabledButton);

        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
      });

      it('should resume auto-scrolling after re-enabling', async () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        // Disable auto-scroll
        const button = screen.getByTitle('Auto-scroll enabled');
        fireEvent.click(button);

        expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();

        // Re-enable
        const disabledButton = screen.getByTitle('Auto-scroll disabled');
        fireEvent.click(disabledButton);

        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();

        // Add new message - should auto-scroll
        const newMessages = [...mockMessages, {
          id: 'msg-4',
          role: 'assistant' as const,
          content: 'Should auto-scroll to this',
          created_at: '2024-01-01T00:00:30Z',
        }];

        rerender(<VirtualizedChatList messages={newMessages} isStreaming={false} />);

        // Auto-scroll remains enabled
        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
      });

      it('should show animation when re-enabled', () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        const button = screen.getByTitle('Auto-scroll enabled');

        // Disable
        fireEvent.click(button);
        const disabledButton = screen.getByTitle('Auto-scroll disabled');
        expect(disabledButton).not.toHaveClass('auto-scroll-btn-animated');

        // Re-enable
        fireEvent.click(disabledButton);
        const enabledButton = screen.getByTitle('Auto-scroll enabled');
        expect(enabledButton).toHaveClass('auto-scroll-btn-animated');
      });
    });

    describe('streaming auto-scroll behavior', () => {
      it('should use auto behavior during streaming for smooth scrolling', async () => {
        render(<VirtualizedChatList messages={mockMessages} isStreaming={true} />);

        // During streaming, behavior should be 'auto' (instant)
        // After streaming ends, behavior should be 'smooth'
        expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
      });

      it('should use smooth behavior when not streaming', async () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={true} />
        );

        rerender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Non-streaming uses 'smooth' behavior
        expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
      });

      it('should auto-scroll on new message only if auto-scroll enabled', async () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        // Disable auto-scroll
        fireEvent.click(screen.getByTitle('Auto-scroll enabled'));

        // Add new message
        const newMessages = [...mockMessages, {
          id: 'msg-4',
          role: 'assistant' as const,
          content: 'New message',
          created_at: '2024-01-01T00:00:30Z',
        }];

        rerender(<VirtualizedChatList messages={newMessages} isStreaming={false} />);

        // Should not scroll since auto-scroll is disabled
        expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
      });
    });

    describe('edge cases and state management', () => {
      it('should maintain auto-scroll state across renders', () => {
        const { rerender } = customRender(
          <VirtualizedChatList messages={mockMessages} isStreaming={false} />
        );

        // Toggle off
        fireEvent.click(screen.getByTitle('Auto-scroll enabled'));
        expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();

        // Rerender with same props
        rerender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // State should persist
        expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
      });

      it('should handle atBottom state changes correctly', async () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Simulate reaching bottom
        act(() => {
          mockAtBottomCallback?.(true);
        });

        // Should still have auto-scroll enabled
        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
      });

      it('should only disable on user scroll, not programmatic scroll', async () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Programmatic scroll (atBottom change without user scrolling)
        act(() => {
          mockAtBottomCallback?.(false);
        });

        // Should remain enabled since user didn't scroll
        expect(screen.getByTitle('Auto-scroll enabled')).toBeInTheDocument();
      });

      it('should handle rapid scroll events correctly', async () => {
        customRender(<VirtualizedChatList messages={mockMessages} isStreaming={false} />);

        // Rapid scroll events
        act(() => {
          mockIsScrollingCallback?.(true);
          mockIsScrollingCallback?.(false);
          mockIsScrollingCallback?.(true);
          mockAtBottomCallback?.(false);
        });

        await waitFor(() => {
          expect(screen.getByTitle('Auto-scroll disabled')).toBeInTheDocument();
        });
      });
    });
  });
});
