import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { setCreateProjectModalOpen } = useUIStore.getState();
    setCreateProjectModalOpen(false);
  });

  describe('createProjectModal', () => {
    it('should initialize as closed', () => {
      const { isCreateProjectModalOpen } = useUIStore.getState();
      expect(isCreateProjectModalOpen).toBe(false);
    });

    it('should open modal', () => {
      const { setCreateProjectModalOpen } = useUIStore.getState();

      setCreateProjectModalOpen(true);

      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(true);
    });

    it('should close modal', () => {
      const { setCreateProjectModalOpen } = useUIStore.getState();

      setCreateProjectModalOpen(true);
      setCreateProjectModalOpen(false);

      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(false);
    });

    it('should toggle modal multiple times', () => {
      const { setCreateProjectModalOpen } = useUIStore.getState();

      setCreateProjectModalOpen(true);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(true);

      setCreateProjectModalOpen(false);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(false);

      setCreateProjectModalOpen(true);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle modal open/close workflow', () => {
      const { setCreateProjectModalOpen } = useUIStore.getState();

      // Initial state
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(false);

      // User clicks "Create Project" button
      setCreateProjectModalOpen(true);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(true);

      // User cancels or closes modal
      setCreateProjectModalOpen(false);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(false);

      // User opens modal again and creates project
      setCreateProjectModalOpen(true);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(true);

      // Modal closes after successful creation
      setCreateProjectModalOpen(false);
      expect(useUIStore.getState().isCreateProjectModalOpen).toBe(false);
    });
  });
});
