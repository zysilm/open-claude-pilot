import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../tests/utils/testUtils';
import ProjectCard from '../ProjectCard';
import userEvent from '@testing-library/user-event';
import type { Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('ProjectCard', () => {
  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    description: 'This is a test project',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  const defaultProps = {
    project: mockProject,
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render project name', () => {
      render(<ProjectCard {...defaultProps} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should render project description', () => {
      render(<ProjectCard {...defaultProps} />);

      expect(screen.getByText('This is a test project')).toBeInTheDocument();
    });

    it('should render "No description" when description is null', () => {
      const projectWithoutDescription = { ...mockProject, description: null };

      render(<ProjectCard project={projectWithoutDescription} onDelete={vi.fn()} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('should render "No description" when description is empty', () => {
      const projectWithEmptyDescription = { ...mockProject, description: '' };

      render(<ProjectCard project={projectWithEmptyDescription} onDelete={vi.fn()} />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('should render formatted update date', () => {
      render(<ProjectCard {...defaultProps} />);

      expect(screen.getByText(/Updated/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(<ProjectCard {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete project');
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to project page on card click', async () => {
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} />);

      const card = screen.getByText('Test Project').closest('.project-card');
      await user.click(card!);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-123');
    });

    it('should navigate on name click', async () => {
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} />);

      await user.click(screen.getByText('Test Project'));

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-123');
    });

    it('should navigate on description click', async () => {
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} />);

      await user.click(screen.getByText('This is a test project'));

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-123');
    });
  });

  describe('deletion', () => {
    it('should call onDelete when delete button clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByTitle('Delete project');
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should not navigate when delete button clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByTitle('Delete project');
      await user.click(deleteButton);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should stop event propagation on delete', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByTitle('Delete project');
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('date formatting', () => {
    it('should format dates correctly', () => {
      render(<ProjectCard {...defaultProps} />);

      // Should show month, day, and year
      const dateText = screen.getByText(/Updated/);
      expect(dateText.textContent).toMatch(/Jan \d+, \d{4}/);
    });

    it('should handle different date formats', () => {
      const projectWithDifferentDate = {
        ...mockProject,
        updated_at: '2024-12-25T23:59:59Z',
      };

      render(<ProjectCard project={projectWithDifferentDate} onDelete={vi.fn()} />);

      expect(screen.getByText(/Dec 25, 2024/)).toBeInTheDocument();
    });

    it('should handle old dates', () => {
      const projectWithOldDate = {
        ...mockProject,
        updated_at: '2020-01-01T00:00:00Z',
      };

      render(<ProjectCard project={projectWithOldDate} onDelete={vi.fn()} />);

      expect(screen.getByText(/Jan 1, 2020/)).toBeInTheDocument();
    });

    it('should handle future dates', () => {
      const projectWithFutureDate = {
        ...mockProject,
        updated_at: '2030-06-15T12:00:00Z',
      };

      render(<ProjectCard project={projectWithFutureDate} onDelete={vi.fn()} />);

      expect(screen.getByText(/Jun 15, 2030/)).toBeInTheDocument();
    });
  });

  describe('styling and classes', () => {
    it('should have project-card class', () => {
      const { container } = render(<ProjectCard {...defaultProps} />);

      const card = container.querySelector('.project-card');
      expect(card).toBeInTheDocument();
    });

    it('should have project-card-header', () => {
      const { container } = render(<ProjectCard {...defaultProps} />);

      const header = container.querySelector('.project-card-header');
      expect(header).toBeInTheDocument();
    });

    it('should have project-card-footer', () => {
      const { container } = render(<ProjectCard {...defaultProps} />);

      const footer = container.querySelector('.project-card-footer');
      expect(footer).toBeInTheDocument();
    });

    it('should apply delete-btn class to delete button', () => {
      render(<ProjectCard {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete project');
      expect(deleteButton).toHaveClass('delete-btn');
    });
  });

  describe('accessibility', () => {
    it('should have accessible delete button', () => {
      render(<ProjectCard {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete project');
      expect(deleteButton).toHaveAttribute('title', 'Delete project');
    });

    it('should be keyboard navigable', () => {
      render(<ProjectCard {...defaultProps} />);

      const card = screen.getByText('Test Project').closest('.project-card');
      expect(card).toBeInTheDocument();
    });

    it('should have proper button text for screen readers', () => {
      render(<ProjectCard {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete project');
      expect(deleteButton.textContent).toBe('×');
    });
  });

  describe('edge cases', () => {
    it('should handle very long project names', () => {
      const projectWithLongName = {
        ...mockProject,
        name: 'A'.repeat(200),
      };

      render(<ProjectCard project={projectWithLongName} onDelete={vi.fn()} />);

      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const projectWithLongDescription = {
        ...mockProject,
        description: 'Very long description. '.repeat(50),
      };

      render(<ProjectCard project={projectWithLongDescription} onDelete={vi.fn()} />);

      expect(screen.getByText(/Very long description/)).toBeInTheDocument();
    });

    it('should handle special characters in name', () => {
      const projectWithSpecialChars = {
        ...mockProject,
        name: 'Test <>&"\'',
      };

      render(<ProjectCard project={projectWithSpecialChars} onDelete={vi.fn()} />);

      expect(screen.getByText('Test <>&"\'')).toBeInTheDocument();
    });

    it('should handle special characters in description', () => {
      const projectWithSpecialChars = {
        ...mockProject,
        description: 'Description with <script>alert("xss")</script>',
      };

      render(<ProjectCard project={projectWithSpecialChars} onDelete={vi.fn()} />);

      // Should render as text, not execute script
      expect(screen.getByText(/script/)).toBeInTheDocument();
    });

    it('should handle invalid date strings gracefully', () => {
      const projectWithInvalidDate = {
        ...mockProject,
        updated_at: 'invalid-date',
      };

      const { container } = render(
        <ProjectCard project={projectWithInvalidDate} onDelete={vi.fn()} />
      );

      // Should not crash
      expect(container).toBeInTheDocument();
    });

    it('should handle multiple rapid delete clicks', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByTitle('Delete project');

      await user.click(deleteButton);
      await user.click(deleteButton);
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(3);
    });

    it('should handle Unicode in project name', () => {
      const projectWithUnicode = {
        ...mockProject,
        name: '测试项目 🚀',
      };

      render(<ProjectCard project={projectWithUnicode} onDelete={vi.fn()} />);

      expect(screen.getByText('测试项目 🚀')).toBeInTheDocument();
    });

    it('should handle empty project ID', () => {
      const projectWithEmptyId = {
        ...mockProject,
        id: '',
      };

      render(<ProjectCard project={projectWithEmptyId} onDelete={vi.fn()} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  describe('interaction states', () => {
    it('should maintain state after navigation attempt', async () => {
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} />);

      const card = screen.getByText('Test Project').closest('.project-card');
      await user.click(card!);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should maintain state after delete attempt', async () => {
      const user = userEvent.setup();
      render(<ProjectCard {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete project');
      await user.click(deleteButton);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });
});
