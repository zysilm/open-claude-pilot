import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import {
  projectsAPI,
  chatSessionsAPI,
  messagesAPI,
  filesAPI,
  sandboxAPI,
  settingsAPI,
} from '../api';
import {
  mockProject,
  mockProjects,
  mockChatSession,
  mockChatSessions,
  mockMessages,
  mockAgentConfig,
} from '../../../tests/fixtures/mockData';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create = vi.fn(() => mockedAxios);
  });

  describe('projectsAPI', () => {
    describe('list', () => {
      it('should fetch all projects', async () => {
        const mockResponse = {
          data: { projects: mockProjects, total: mockProjects.length },
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await projectsAPI.list();

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects');
        expect(result).toEqual(mockResponse.data);
        expect(result.projects).toHaveLength(2);
      });

      it('should handle empty project list', async () => {
        const mockResponse = { data: { projects: [], total: 0 } };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await projectsAPI.list();

        expect(result.projects).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });

    describe('create', () => {
      it('should create a new project', async () => {
        const newProject = { name: 'New Project', description: 'Test' };
        const mockResponse = { data: mockProject };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await projectsAPI.create(newProject);

        expect(mockedAxios.post).toHaveBeenCalledWith('/projects', newProject);
        expect(result).toEqual(mockProject);
      });

      it('should create project without description', async () => {
        const newProject = { name: 'Minimal Project' };
        const mockResponse = { data: { ...mockProject, description: null } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await projectsAPI.create(newProject);

        expect(result.description).toBeNull();
      });
    });

    describe('get', () => {
      it('should fetch a single project by id', async () => {
        const mockResponse = { data: mockProject };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await projectsAPI.get('test-project-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects/test-project-id');
        expect(result).toEqual(mockProject);
      });
    });

    describe('update', () => {
      it('should update a project', async () => {
        const updates = { name: 'Updated Name' };
        const updatedProject = { ...mockProject, ...updates };
        const mockResponse = { data: updatedProject };
        mockedAxios.put.mockResolvedValue(mockResponse);

        const result = await projectsAPI.update('test-project-id', updates);

        expect(mockedAxios.put).toHaveBeenCalledWith('/projects/test-project-id', updates);
        expect(result.name).toBe('Updated Name');
      });
    });

    describe('delete', () => {
      it('should delete a project', async () => {
        mockedAxios.delete.mockResolvedValue({});

        await projectsAPI.delete('test-project-id');

        expect(mockedAxios.delete).toHaveBeenCalledWith('/projects/test-project-id');
      });
    });

    describe('agent configuration', () => {
      it('should get agent config', async () => {
        const mockResponse = { data: mockAgentConfig };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await projectsAPI.getAgentConfig('test-project-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects/test-project-id/agent-config');
        expect(result).toEqual(mockAgentConfig);
      });

      it('should update agent config', async () => {
        const updates = { llm_model: 'gpt-4-turbo' };
        const updatedConfig = { ...mockAgentConfig, ...updates };
        const mockResponse = { data: updatedConfig };
        mockedAxios.put.mockResolvedValue(mockResponse);

        const result = await projectsAPI.updateAgentConfig('test-project-id', updates);

        expect(mockedAxios.put).toHaveBeenCalledWith(
          '/projects/test-project-id/agent-config',
          updates
        );
        expect(result.llm_model).toBe('gpt-4-turbo');
      });

      it('should list agent templates', async () => {
        const templates = [
          { id: 'template-1', name: 'Code Assistant' },
          { id: 'template-2', name: 'Data Analyst' },
        ];
        const mockResponse = { data: templates };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await projectsAPI.listAgentTemplates();

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects/templates/list');
        expect(result).toEqual(templates);
      });

      it('should get agent template by id', async () => {
        const template = { id: 'template-1', name: 'Code Assistant' };
        const mockResponse = { data: template };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await projectsAPI.getAgentTemplate('template-1');

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects/templates/template-1');
        expect(result).toEqual(template);
      });

      it('should apply agent template', async () => {
        const mockResponse = { data: mockAgentConfig };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await projectsAPI.applyAgentTemplate('test-project-id', 'template-1');

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/projects/test-project-id/agent-config/apply-template/template-1'
        );
        expect(result).toEqual(mockAgentConfig);
      });
    });
  });

  describe('chatSessionsAPI', () => {
    describe('list', () => {
      it('should list all chat sessions', async () => {
        const mockResponse = {
          data: { chat_sessions: mockChatSessions, total: mockChatSessions.length },
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await chatSessionsAPI.list();

        expect(mockedAxios.get).toHaveBeenCalledWith('/chats', { params: {} });
        expect(result.chat_sessions).toHaveLength(2);
      });

      it('should list sessions for specific project', async () => {
        const projectSessions = [mockChatSession];
        const mockResponse = {
          data: { chat_sessions: projectSessions, total: 1 },
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await chatSessionsAPI.list('test-project-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/chats', {
          params: { project_id: 'test-project-id' },
        });
        expect(result.chat_sessions).toHaveLength(1);
      });
    });

    describe('create', () => {
      it('should create a new chat session', async () => {
        const newSession = { name: 'New Chat' };
        const mockResponse = { data: mockChatSession };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await chatSessionsAPI.create('test-project-id', newSession);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/chats?project_id=test-project-id',
          newSession
        );
        expect(result).toEqual(mockChatSession);
      });
    });

    describe('get', () => {
      it('should fetch a single chat session', async () => {
        const mockResponse = { data: mockChatSession };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await chatSessionsAPI.get('test-session-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/chats/test-session-id');
        expect(result).toEqual(mockChatSession);
      });
    });

    describe('update', () => {
      it('should update a chat session', async () => {
        const updates = { name: 'Updated Chat' };
        const updatedSession = { ...mockChatSession, ...updates };
        const mockResponse = { data: updatedSession };
        mockedAxios.put.mockResolvedValue(mockResponse);

        const result = await chatSessionsAPI.update('test-session-id', updates);

        expect(mockedAxios.put).toHaveBeenCalledWith('/chats/test-session-id', updates);
        expect(result.name).toBe('Updated Chat');
      });
    });

    describe('delete', () => {
      it('should delete a chat session', async () => {
        mockedAxios.delete.mockResolvedValue({});

        await chatSessionsAPI.delete('test-session-id');

        expect(mockedAxios.delete).toHaveBeenCalledWith('/chats/test-session-id');
      });
    });
  });

  describe('messagesAPI', () => {
    describe('list', () => {
      it('should list messages for a chat session', async () => {
        const mockResponse = {
          data: { messages: mockMessages, total: mockMessages.length },
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await messagesAPI.list('test-session-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/chats/test-session-id/messages');
        expect(result.messages).toHaveLength(4);
      });

      it('should handle empty message list', async () => {
        const mockResponse = { data: { messages: [], total: 0 } };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await messagesAPI.list('test-session-id');

        expect(result.messages).toHaveLength(0);
      });
    });

    describe('create', () => {
      it('should create a new message', async () => {
        const newMessage = { content: 'Hello, world!', role: 'user' as const };
        const mockResponse = { data: mockMessages[0] };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await messagesAPI.create('test-session-id', newMessage);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/chats/test-session-id/messages',
          newMessage
        );
        expect(result).toEqual(mockMessages[0]);
      });
    });
  });

  describe('filesAPI', () => {
    describe('upload', () => {
      it('should upload a file', async () => {
        const file = new File(['content'], 'test.txt', { type: 'text/plain' });
        const mockResponse = { data: { id: 'file-1', name: 'test.txt' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await filesAPI.upload('test-project-id', file);

        expect(mockedAxios.post).toHaveBeenCalled();
        const callArgs = mockedAxios.post.mock.calls[0];
        expect(callArgs[0]).toBe('/files/upload/test-project-id');
        expect(callArgs[1]).toBeInstanceOf(FormData);
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('list', () => {
      it('should list files for a project', async () => {
        const files = [
          { id: 'file-1', name: 'test.txt' },
          { id: 'file-2', name: 'data.csv' },
        ];
        const mockResponse = { data: files };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await filesAPI.list('test-project-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/files/project/test-project-id');
        expect(result).toEqual(files);
      });
    });

    describe('download', () => {
      it('should download a file', async () => {
        const blob = new Blob(['file content'], { type: 'text/plain' });
        const mockResponse = { data: blob };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await filesAPI.download('file-1');

        expect(mockedAxios.get).toHaveBeenCalledWith('/files/file-1/download', {
          responseType: 'blob',
        });
        expect(result).toBeInstanceOf(Blob);
      });
    });

    describe('delete', () => {
      it('should delete a file', async () => {
        mockedAxios.delete.mockResolvedValue({});

        await filesAPI.delete('file-1');

        expect(mockedAxios.delete).toHaveBeenCalledWith('/files/file-1');
      });
    });
  });

  describe('sandboxAPI', () => {
    describe('start', () => {
      it('should start a sandbox', async () => {
        const mockResponse = { data: { status: 'running', container_id: 'container-123' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await sandboxAPI.start('test-session-id');

        expect(mockedAxios.post).toHaveBeenCalledWith('/sandbox/test-session-id/start');
        expect(result.status).toBe('running');
      });
    });

    describe('stop', () => {
      it('should stop a sandbox', async () => {
        const mockResponse = { data: { status: 'stopped' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await sandboxAPI.stop('test-session-id');

        expect(mockedAxios.post).toHaveBeenCalledWith('/sandbox/test-session-id/stop');
        expect(result.status).toBe('stopped');
      });
    });

    describe('reset', () => {
      it('should reset a sandbox', async () => {
        const mockResponse = { data: { status: 'reset' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await sandboxAPI.reset('test-session-id');

        expect(mockedAxios.post).toHaveBeenCalledWith('/sandbox/test-session-id/reset');
        expect(result.status).toBe('reset');
      });
    });

    describe('status', () => {
      it('should get sandbox status', async () => {
        const mockResponse = { data: { status: 'running', uptime: 3600 } };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await sandboxAPI.status('test-session-id');

        expect(mockedAxios.get).toHaveBeenCalledWith('/sandbox/test-session-id/status');
        expect(result.status).toBe('running');
      });
    });

    describe('execute', () => {
      it('should execute command in sandbox', async () => {
        const mockResponse = { data: { output: 'Hello World', exit_code: 0 } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await sandboxAPI.execute('test-session-id', 'echo "Hello World"');

        expect(mockedAxios.post).toHaveBeenCalledWith('/sandbox/test-session-id/execute', {
          command: 'echo "Hello World"',
          workdir: '/workspace',
        });
        expect(result.output).toBe('Hello World');
      });

      it('should execute command with custom workdir', async () => {
        const mockResponse = { data: { output: '', exit_code: 0 } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        await sandboxAPI.execute('test-session-id', 'ls', '/app');

        expect(mockedAxios.post).toHaveBeenCalledWith('/sandbox/test-session-id/execute', {
          command: 'ls',
          workdir: '/app',
        });
      });
    });
  });

  describe('settingsAPI', () => {
    describe('listApiKeys', () => {
      it('should list API keys', async () => {
        const apiKeys = [
          { provider: 'openai', is_configured: true, last_used_at: null, created_at: '2024-01-01' },
          { provider: 'anthropic', is_configured: false, last_used_at: null, created_at: '2024-01-01' },
        ];
        const mockResponse = { data: { api_keys: apiKeys } };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await settingsAPI.listApiKeys();

        expect(mockedAxios.get).toHaveBeenCalledWith('/settings/api-keys');
        expect(result.api_keys).toHaveLength(2);
      });
    });

    describe('setApiKey', () => {
      it('should set an API key', async () => {
        const keyData = { provider: 'openai', api_key: 'sk-test123' };
        const mockResponse = { data: { message: 'API key saved successfully' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await settingsAPI.setApiKey(keyData);

        expect(mockedAxios.post).toHaveBeenCalledWith('/settings/api-keys', keyData);
        expect(result.message).toBe('API key saved successfully');
      });
    });

    describe('deleteApiKey', () => {
      it('should delete an API key', async () => {
        mockedAxios.delete.mockResolvedValue({});

        await settingsAPI.deleteApiKey('openai');

        expect(mockedAxios.delete).toHaveBeenCalledWith('/settings/api-keys/openai');
      });
    });

    describe('testApiKey', () => {
      it('should test API key - valid', async () => {
        const mockResponse = { data: { valid: true, message: 'API key is valid' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await settingsAPI.testApiKey('openai', 'sk-test123');

        expect(mockedAxios.post).toHaveBeenCalledWith('/settings/api-keys/test', {
          provider: 'openai',
          api_key: 'sk-test123',
        });
        expect(result.valid).toBe(true);
      });

      it('should test API key - invalid', async () => {
        const mockResponse = { data: { valid: false, message: 'Invalid API key' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await settingsAPI.testApiKey('openai', 'sk-invalid');

        expect(result.valid).toBe(false);
        expect(result.message).toBe('Invalid API key');
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      await expect(projectsAPI.list()).rejects.toThrow('Network Error');
    });

    it('should handle API errors', async () => {
      const apiError = {
        response: {
          data: { detail: 'Not found' },
          status: 404,
        },
      };
      mockedAxios.get.mockRejectedValue(apiError);

      await expect(projectsAPI.get('nonexistent-id')).rejects.toEqual(apiError);
    });

    it('should handle validation errors', async () => {
      const validationError = {
        response: {
          data: { detail: 'Invalid input data' },
          status: 422,
        },
      };
      mockedAxios.post.mockRejectedValue(validationError);

      await expect(projectsAPI.create({ name: '' })).rejects.toEqual(validationError);
    });
  });
});
