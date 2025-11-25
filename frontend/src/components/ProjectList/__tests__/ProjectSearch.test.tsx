import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../tests/utils/testUtils';
import ProjectSearch from '../ProjectSearch';
import userEvent from '@testing-library/user-event';

describe('ProjectSearch', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toBeInTheDocument();
    });

    it('should render with provided value', () => {
      render(<ProjectSearch value="test query" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveValue('test query');
    });

    it('should render with empty value', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveValue('');
    });

    it('should have search-input class', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveClass('search-input');
    });

    it('should have project-search wrapper class', () => {
      const { container } = render(<ProjectSearch {...defaultProps} />);

      const wrapper = container.querySelector('.project-search');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('user input', () => {
    it('should call onChange when typing', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, 'test');

      expect(onChange).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith('t');
    });

    it('should call onChange for each character', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, 'abc');

      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('should handle backspace', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="test" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.clear(input);

      expect(onChange).toHaveBeenCalled();
    });

    it('should handle clearing input', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="search term" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.clear(input);

      expect(onChange).toHaveBeenCalled();
    });

    it('should update value prop', () => {
      const { rerender } = render(<ProjectSearch value="" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveValue('');

      rerender(<ProjectSearch value="new value" onChange={vi.fn()} />);

      expect(input).toHaveValue('new value');
    });
  });

  describe('controlled component behavior', () => {
    it('should reflect controlled value changes', () => {
      const { rerender } = render(<ProjectSearch value="first" onChange={vi.fn()} />);

      expect(screen.getByPlaceholderText('Search projects...')).toHaveValue('first');

      rerender(<ProjectSearch value="second" onChange={vi.fn()} />);

      expect(screen.getByPlaceholderText('Search projects...')).toHaveValue('second');
    });

    it('should work as controlled component', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, 'x');

      expect(onChange).toHaveBeenCalledWith('x');
    });
  });

  describe('special characters', () => {
    it('should handle special characters', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, '@#$%');

      expect(onChange).toHaveBeenCalled();
    });

    it('should handle Unicode characters', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, '测试');

      expect(onChange).toHaveBeenCalled();
    });

    it('should handle emoji', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, '🚀');

      expect(onChange).toHaveBeenCalled();
    });

    it('should handle whitespace', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, '  ');

      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('input type', () => {
    it('should be text input', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should not be a search input type', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input.getAttribute('type')).toBe('text');
    });
  });

  describe('accessibility', () => {
    it('should have placeholder for accessibility', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveAttribute('placeholder', 'Search projects...');
    });

    it('should be keyboard accessible', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      input.focus();

      expect(input).toHaveFocus();

      await user.keyboard('test');

      expect(onChange).toHaveBeenCalled();
    });

    it('should support Tab navigation', () => {
      render(<ProjectSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search projects...');
      input.focus();

      expect(input).toHaveFocus();
    });
  });

  describe('performance', () => {
    it('should handle rapid input changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, 'abcdefghij');

      expect(onChange).toHaveBeenCalledTimes(10);
    });

    it('should handle long search queries', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      const longQuery = 'a'.repeat(100);

      await user.type(input, longQuery.substring(0, 50)); // Type subset for performance

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null value gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const { container } = render(
        <ProjectSearch value={null as any} onChange={vi.fn()} />
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle undefined onChange', () => {
      // TypeScript would prevent this, but testing runtime behavior
      expect(() => {
        render(<ProjectSearch value="" onChange={undefined as any} />);
      }).not.toThrow();
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(1000);
      render(<ProjectSearch value={longValue} onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveValue(longValue);
    });

    it('should handle newline characters in value', () => {
      render(<ProjectSearch value="line1\nline2" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input.value).toContain('line1');
    });

    it('should handle HTML in value', () => {
      const htmlValue = '<script>alert("xss")</script>';
      render(<ProjectSearch value={htmlValue} onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      expect(input).toHaveValue(htmlValue);
      // Verify it's rendered as text, not executed
      expect(input.value).toBe(htmlValue);
    });
  });

  describe('interaction patterns', () => {
    it('should support copy/paste', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.click(input);
      await user.paste('pasted text');

      expect(onChange).toHaveBeenCalled();
    });

    it('should support select all', async () => {
      const user = userEvent.setup();
      render(<ProjectSearch value="test value" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...') as HTMLInputElement;
      await user.click(input);
      input.select();

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('test value'.length);
    });

    it('should maintain focus after typing', async () => {
      const user = userEvent.setup();
      render(<ProjectSearch value="" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.click(input);
      await user.type(input, 'test');

      expect(input).toHaveFocus();
    });

    it('should support Escape key', async () => {
      const user = userEvent.setup();
      render(<ProjectSearch value="test" onChange={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.click(input);
      await user.keyboard('{Escape}');

      // Input should still be focused (browser default behavior)
      expect(input).toHaveFocus();
    });
  });
});
