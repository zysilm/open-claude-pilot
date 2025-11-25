import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../tests/utils/testUtils';
import NewProjectModal from '../NewProjectModal';
import userEvent from '@testing-library/user-event';
import { projectsAPI } from '@/services/api';

vi.mock('@/services/api');

describe('NewProjectModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal title', () => {
      render(<NewProjectModal {...defaultProps} />);

      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });

    it('should render project name input', () => {
      render(<NewProjectModal {...defaultProps} />);

      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      render(<NewProjectModal {...defaultProps} />);

      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<NewProjectModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should render create button', () => {
      render(<NewProjectModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Create Project/i })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<NewProjectModal {...defaultProps} />);

      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();
    });

    it('should focus name input on mount', () => {
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      expect(nameInput).toHaveFocus();
    });
  });

  describe('user input', () => {
    it('should update name field', async () => {
      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'My Project');

      expect(nameInput).toHaveValue('My Project');
    });

    it('should update description field', async () => {
      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Project description');

      expect(descriptionInput).toHaveValue('Project description');
    });

    it('should handle multiline description', async () => {
      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Line 1{Enter}Line 2');

      expect(descriptionInput.value).toContain('Line 1');
      expect(descriptionInput.value).toContain('Line 2');
    });
  });

  describe('form submission', () => {
    it('should create project with name only', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123', name: 'Test' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<NewProjectModal onClose={onClose} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Test Project');

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Test Project',
          description: undefined,
        });
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should create project with name and description', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal onClose={vi.fn()} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Test Project');
      await user.type(screen.getByLabelText(/Description/i), 'Test description');

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Test Project',
          description: 'Test description',
        });
      });
    });

    it('should trim whitespace from inputs', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal onClose={vi.fn()} />);

      await user.type(screen.getByLabelText(/Project Name/i), '  Project  ');
      await user.type(screen.getByLabelText(/Description/i), '  Description  ');

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Project',
          description: 'Description',
        });
      });
    });

    it('should handle empty description as undefined', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal onClose={vi.fn()} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Project',
          description: undefined,
        });
      });
    });

    it('should close modal after successful creation', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<NewProjectModal onClose={onClose} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('validation', () => {
    it('should disable create button when name is empty', () => {
      render(<NewProjectModal {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      expect(createButton).toBeDisabled();
    });

    it('should disable create button when name is only whitespace', async () => {
      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, '   ');

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when name is provided', async () => {
      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      await user.type(nameInput, 'Project');

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      expect(createButton).not.toBeDisabled();
    });

    it('should not submit form with empty name', async () => {
      const mockCreate = vi.fn();
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      await user.click(createButton);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should mark name as required', () => {
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      expect(nameInput).toBeRequired();
    });
  });

  describe('error handling', () => {
    it('should display error message on creation failure', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Creation failed'));
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(screen.getByText(/Error creating project/i)).toBeInTheDocument();
      });
    });

    it('should display API error details', async () => {
      const mockCreate = vi.fn().mockRejectedValue({
        message: 'Invalid project name',
      });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Invalid');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid project name/i)).toBeInTheDocument();
      });
    });

    it('should not close modal on error', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Error'));
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<NewProjectModal onClose={onClose} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(screen.getByText(/Error creating project/i)).toBeInTheDocument();
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading state during creation', async () => {
      const mockCreate = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    });

    it('should disable buttons during creation', async () => {
      const mockCreate = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      const createButton = screen.getByRole('button', { name: /Creating.../i });

      expect(cancelButton).toBeDisabled();
      expect(createButton).toBeDisabled();
    });
  });

  describe('modal interaction', () => {
    it('should call onClose when cancel button clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<NewProjectModal onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when X button clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<NewProjectModal onClose={onClose} />);

      const closeButton = screen.getByText('×');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<NewProjectModal onClose={onClose} />);

      const overlay = container.querySelector('.modal-overlay');
      await user.click(overlay!);

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close when modal content clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<NewProjectModal onClose={onClose} />);

      const modalContent = container.querySelector('.modal-content');
      await user.click(modalContent!);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close during submission', async () => {
      const mockCreate = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<NewProjectModal onClose={onClose} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Should be disabled, so onClose shouldn't be called
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(<NewProjectModal {...defaultProps} />);

      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('should indicate required fields', () => {
      render(<NewProjectModal {...defaultProps} />);

      const nameLabel = screen.getByText(/Project Name \*/);
      expect(nameLabel).toBeInTheDocument();
    });

    it('should have proper input IDs', () => {
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      expect(nameInput).toHaveAttribute('id', 'project-name');

      const descInput = screen.getByLabelText(/Description/i);
      expect(descInput).toHaveAttribute('id', 'project-description');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Project Name/i);
      const descInput = screen.getByLabelText(/Description/i);

      expect(nameInput).toHaveFocus();

      await user.tab();
      expect(descInput).toHaveFocus();
    });
  });

  describe('edge cases', () => {
    it('should handle very long project names', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      const longName = 'A'.repeat(200);
      await user.type(screen.getByLabelText(/Project Name/i), longName.substring(0, 50));

      const createButton = screen.getByRole('button', { name: /Create Project/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });

    it('should handle special characters in name', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Test @#$%');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Test @#$%' })
        );
      });
    });

    it('should handle network timeout', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Network timeout'));
      (projectsAPI.create as any).mockImplementation(mockCreate);

      const user = userEvent.setup();
      render(<NewProjectModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/Project Name/i), 'Project');
      await user.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
      });
    });
  });
});
