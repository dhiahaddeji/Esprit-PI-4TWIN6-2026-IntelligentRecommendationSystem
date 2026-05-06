import '@testing-library/react/pure';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Prevent real HTTP calls from components that call axios on mount.
// Individual tests can override with their own vi.mock('axios') if needed.
vi.mock('axios', () => {
  const mkInstance = () => ({
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  });
  return {
    default: {
      ...mkInstance(),
      create: vi.fn(() => mkInstance()),
      CanceledError: class CanceledError extends Error {},
      isCancel: vi.fn().mockReturnValue(false),
    },
  };
});