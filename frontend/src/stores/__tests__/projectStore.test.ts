import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../projectStore';
import { mockProject, mockProjects } from '../../../tests/fixtures/mockData';

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { setSelectedProject } = useProjectStore.getState();
    setSelectedProject(null);
  });

  describe('selectedProject', () => {
    it('should initialize with null', () => {
      const { selectedProject } = useProjectStore.getState();
      expect(selectedProject).toBeNull();
    });

    it('should set selected project', () => {
      const { setSelectedProject } = useProjectStore.getState();

      setSelectedProject(mockProject);

      expect(useProjectStore.getState().selectedProject).toEqual(mockProject);
    });

    it('should update selected project', () => {
      const { setSelectedProject } = useProjectStore.getState();
      const secondProject = mockProjects[1];

      setSelectedProject(mockProject);
      setSelectedProject(secondProject);

      expect(useProjectStore.getState().selectedProject).toEqual(secondProject);
    });

    it('should clear selected project', () => {
      const { setSelectedProject } = useProjectStore.getState();

      setSelectedProject(mockProject);
      setSelectedProject(null);

      expect(useProjectStore.getState().selectedProject).toBeNull();
    });

    it('should preserve project data immutability', () => {
      const { setSelectedProject } = useProjectStore.getState();
      const originalProject = { ...mockProject };

      setSelectedProject(mockProject);

      // Modify the original
      mockProject.name = 'Modified Name';

      // Store should have the original value
      expect(useProjectStore.getState().selectedProject?.name).toBe('Test Project');

      // Restore for other tests
      mockProject.name = originalProject.name;
    });
  });

  describe('integration scenarios', () => {
    it('should handle project selection workflow', () => {
      const { setSelectedProject } = useProjectStore.getState();

      // User browses projects
      expect(useProjectStore.getState().selectedProject).toBeNull();

      // User selects first project
      setSelectedProject(mockProjects[0]);
      expect(useProjectStore.getState().selectedProject?.id).toBe(mockProjects[0].id);

      // User navigates back
      setSelectedProject(null);
      expect(useProjectStore.getState().selectedProject).toBeNull();

      // User selects second project
      setSelectedProject(mockProjects[1]);
      expect(useProjectStore.getState().selectedProject?.id).toBe(mockProjects[1].id);
    });
  });
});
