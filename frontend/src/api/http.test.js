import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mkInstance = () => ({
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  });
  return {
    default: {
      ...mkInstance(),
      create: vi.fn(() => mkInstance()),
    },
  };
});

vi.mock('../auth/authService', () => ({
  LS_TOKEN: 'access_token',
  logout: vi.fn(),
}));

describe('http', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('axios.create is a function', () => {
    expect(axios.create).toBeTypeOf('function');
  });

  it('create returns an instance with interceptors', () => {
    const instance = axios.create({ baseURL: 'http://test', withCredentials: true });
    expect(instance).toBeDefined();
    expect(instance.interceptors.request.use).toBeTypeOf('function');
    expect(instance.interceptors.response.use).toBeTypeOf('function');
  });

  it('http module exports a defined instance', async () => {
    const { default: http } = await import('./http');
    expect(http).toBeDefined();
  });
});
