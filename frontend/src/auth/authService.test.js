import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// Mock axios before importing the module under test
vi.mock("axios", () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    create: vi.fn(),
  };
  return {
    default: { ...mockApi, create: vi.fn(() => mockApi) },
    create: vi.fn(() => mockApi),
  };
});

// Mock import.meta.env
vi.stubGlobal("import", { meta: { env: { VITE_API_BASE_URL: "http://localhost:3000" } } });

// Re-import after mocking
import * as authService from "./authService";

const mockPost = vi.fn();

// Patch the internal api.post through module-level mock
vi.mock("./authService", async (importOriginal) => {
  const mod = await importOriginal();
  return mod;
});

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── getStoredUser ─────────────────────────────────────────────────────

  describe("getStoredUser", () => {
    it("returns null when nothing stored", () => {
      expect(authService.getStoredUser()).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      localStorage.setItem(authService.LS_USER, "{invalid json}");
      expect(authService.getStoredUser()).toBeNull();
    });

    it("returns null for 'null' string", () => {
      localStorage.setItem(authService.LS_USER, "null");
      expect(authService.getStoredUser()).toBeNull();
    });

    it("returns null for 'undefined' string", () => {
      localStorage.setItem(authService.LS_USER, "undefined");
      expect(authService.getStoredUser()).toBeNull();
    });

    it("returns parsed user with normalized role", () => {
      const user = { id: "1", userId: "1", role: "employee", email: "a@a.com" };
      localStorage.setItem(authService.LS_USER, JSON.stringify(user));
      const result = authService.getStoredUser();
      expect(result).not.toBeNull();
      expect(result.role).toBe("EMPLOYEE");
    });

    it("falls back id from userId when id missing", () => {
      const user = { userId: "u-99", role: "HR", email: "hr@a.com" };
      localStorage.setItem(authService.LS_USER, JSON.stringify(user));
      const result = authService.getStoredUser();
      expect(result.id).toBe("u-99");
    });
  });

  // ── getStoredToken ────────────────────────────────────────────────────

  describe("getStoredToken", () => {
    it("returns null when no token stored", () => {
      expect(authService.getStoredToken()).toBeNull();
    });

    it("returns stored token", () => {
      localStorage.setItem(authService.LS_TOKEN, "my-jwt-token");
      expect(authService.getStoredToken()).toBe("my-jwt-token");
    });
  });

  // ── logout ────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("clears token and user from localStorage", () => {
      localStorage.setItem(authService.LS_TOKEN, "tok");
      localStorage.setItem(authService.LS_USER, JSON.stringify({ id: "1" }));
      authService.logout();
      expect(localStorage.getItem(authService.LS_TOKEN)).toBeNull();
      expect(localStorage.getItem(authService.LS_USER)).toBeNull();
    });
  });

  // ── LS_TOKEN / LS_USER constants ──────────────────────────────────────

  describe("constants", () => {
    it("LS_TOKEN is a non-empty string", () => {
      expect(typeof authService.LS_TOKEN).toBe("string");
      expect(authService.LS_TOKEN.length).toBeGreaterThan(0);
    });

    it("LS_USER is a non-empty string", () => {
      expect(typeof authService.LS_USER).toBe("string");
      expect(authService.LS_USER.length).toBeGreaterThan(0);
    });
  });
});
