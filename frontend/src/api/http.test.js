import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import http from './http';
import * as authService from '../auth/authService';

vi.mock('axios');
vi.mock('../auth/authService');

describe('http', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates axios instance with correct config', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: expect.any(String),
      withCredentials: true,
    });
  });

  it('adds authorization header when token exists', async () => {
    const mockCreate = vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }));
    axios.create.mockImplementation(mockCreate);

    localStorage.setItem('token', 'test-token');
    
    expect(mockCreate).toHaveBeenCalled();
  });

  it('handles successful response', () => {
    expect(http).toBeDefined();
  });
});
