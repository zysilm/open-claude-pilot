import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Create a custom render function that includes providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Utility to wait for async updates
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock WebSocket factory
export const createMockWebSocket = () => {
  const listeners: Record<string, Function[]> = {
    open: [],
    message: [],
    error: [],
    close: [],
  };

  const ws = {
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, handler: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: Function) => {
      listeners[event] = listeners[event]?.filter((h) => h !== handler) || [];
    }),
    dispatchEvent: vi.fn(),
    onopen: null as any,
    onmessage: null as any,
    onerror: null as any,
    onclose: null as any,
    trigger: (event: string, data?: any) => {
      if (ws[`on${event}` as keyof typeof ws]) {
        (ws[`on${event}` as keyof typeof ws] as any)(data);
      }
      listeners[event]?.forEach((handler) => handler(data));
    },
    url: '',
    protocol: '',
    extensions: '',
    bufferedAmount: 0,
    binaryType: 'blob' as BinaryType,
  };

  return ws;
};

// Mock Axios response
export const mockAxiosResponse = <T,>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

// Mock Axios error
export const mockAxiosError = (message: string, status = 500) => ({
  response: {
    data: { detail: message },
    status,
    statusText: 'Error',
    headers: {},
    config: {} as any,
  },
  message,
  isAxiosError: true,
});
