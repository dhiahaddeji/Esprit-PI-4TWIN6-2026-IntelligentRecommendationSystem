import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

// Create the mock api instance before the module loads
const mockApiInstance = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockApiInstance),
  },
}));

import * as authService from "./authService";

// Capture the request interceptor callback registered at module load time
let requestInterceptor;
beforeAll(() => {
  requestInterceptor = mockApiInstance.interceptors.request.use.mock.calls[0]?.[0];
});

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── constants ─────────────────────────────────────────────────────────────

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

  // ── request interceptor ───────────────────────────────────────────────────

  describe("request interceptor", () => {
    it("adds Authorization header when token is stored", () => {
      localStorage.setItem(authService.LS_TOKEN, "jwt-abc");
      const config = { headers: {} };
      const result = requestInterceptor(config);
      expect(result.headers.Authorization).toBe("Bearer jwt-abc");
    });

    it("does not add Authorization header when no token", () => {
      const config = { headers: {} };
      const result = requestInterceptor(config);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it("returns the config object", () => {
      const config = { headers: {} };
      expect(requestInterceptor(config)).toBe(config);
    });
  });

  // ── getStoredUser ─────────────────────────────────────────────────────────

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
      expect(authService.getStoredUser().id).toBe("u-99");
    });

    it("copies id to userId when userId missing", () => {
      const user = { id: "id-42", role: "MANAGER", email: "m@a.com" };
      localStorage.setItem(authService.LS_USER, JSON.stringify(user));
      expect(authService.getStoredUser().userId).toBe("id-42");
    });
  });

  // ── getStoredToken ────────────────────────────────────────────────────────

  describe("getStoredToken", () => {
    it("returns null when no token stored", () => {
      expect(authService.getStoredToken()).toBeNull();
    });

    it("returns stored token", () => {
      localStorage.setItem(authService.LS_TOKEN, "my-jwt-token");
      expect(authService.getStoredToken()).toBe("my-jwt-token");
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("removes token and user from localStorage", () => {
      localStorage.setItem(authService.LS_TOKEN, "tok");
      localStorage.setItem(authService.LS_USER, JSON.stringify({ id: "1" }));
      authService.logout();
      expect(localStorage.getItem(authService.LS_TOKEN)).toBeNull();
      expect(localStorage.getItem(authService.LS_USER)).toBeNull();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("posts to /auth/login and persists accessToken and user", async () => {
      mockApiInstance.post.mockResolvedValue({
        data: { accessToken: "tok123", user: { id: "1", email: "a@a.com" } },
      });
      const result = await authService.login({ email: "a@a.com", password: "pw" });
      expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/login", {
        email: "a@a.com",
        password: "pw",
      });
      expect(localStorage.getItem(authService.LS_TOKEN)).toBe("tok123");
      expect(result.accessToken).toBe("tok123");
    });

    it("falls back to token field when accessToken is absent", async () => {
      mockApiInstance.post.mockResolvedValue({
        data: { token: "tok-alt", user: { id: "2", email: "b@b.com" } },
      });
      const result = await authService.login({ email: "b@b.com", password: "pw" });
      expect(localStorage.getItem(authService.LS_TOKEN)).toBe("tok-alt");
      expect(result.accessToken).toBe("tok-alt");
    });

    it("persists user to localStorage on success", async () => {
      mockApiInstance.post.mockResolvedValue({
        data: { accessToken: "t", user: { id: "3", email: "c@c.com" } },
      });
      await authService.login({ email: "c@c.com", password: "pw" });
      const stored = JSON.parse(localStorage.getItem(authService.LS_USER));
      expect(stored.email).toBe("c@c.com");
    });

    it("throws error from response.data.message on failure", async () => {
      mockApiInstance.post.mockRejectedValue({
        response: { data: { message: "Invalid credentials" } },
      });
      await expect(authService.login({ email: "x@x.com", password: "bad" })).rejects.toThrow(
        "Invalid credentials",
      );
    });

    it("throws error from response.data.error on failure", async () => {
      mockApiInstance.post.mockRejectedValue({
        response: { data: { error: "Unauthorized" } },
      });
      await expect(authService.login({ email: "x@x.com", password: "bad" })).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("throws err.message when no response data", async () => {
      mockApiInstance.post.mockRejectedValue({ message: "Network Error" });
      await expect(authService.login({ email: "x@x.com", password: "bad" })).rejects.toThrow(
        "Network Error",
      );
    });

    it("throws default message when error has no usable info", async () => {
      mockApiInstance.post.mockRejectedValue({});
      await expect(authService.login({ email: "x@x.com", password: "bad" })).rejects.toThrow(
        "Échec de connexion",
      );
    });
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe("register", () => {
    it("posts to /auth/register and returns auth data", async () => {
      mockApiInstance.post.mockResolvedValue({
        data: { accessToken: "reg-tok", user: { id: "3", email: "c@c.com" } },
      });
      const result = await authService.register({
        name: "C",
        email: "c@c.com",
        password: "pw",
        role: "EMPLOYEE",
      });
      expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/register", {
        name: "C",
        email: "c@c.com",
        password: "pw",
        role: "EMPLOYEE",
      });
      expect(result.accessToken).toBe("reg-tok");
    });

    it("throws error from response on failure", async () => {
      mockApiInstance.post.mockRejectedValue({
        response: { data: { message: "Email already exists" } },
      });
      await expect(
        authService.register({ name: "D", email: "d@d.com", password: "pw", role: "HR" }),
      ).rejects.toThrow("Email already exists");
    });

    it("throws default message on generic failure", async () => {
      mockApiInstance.post.mockRejectedValue({});
      await expect(
        authService.register({ name: "E", email: "e@e.com", password: "pw", role: "HR" }),
      ).rejects.toThrow("Échec d'inscription");
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe("changePassword", () => {
    it("posts to /auth/change-password and returns response data", async () => {
      mockApiInstance.post.mockResolvedValue({ data: { success: true } });
      const result = await authService.changePassword("NewPass123!");
      expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/change-password", {
        newPassword: "NewPass123!",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws error from response on failure", async () => {
      mockApiInstance.post.mockRejectedValue({
        response: { data: { message: "Weak password" } },
      });
      await expect(authService.changePassword("weak")).rejects.toThrow("Weak password");
    });

    it("throws default message on generic failure", async () => {
      mockApiInstance.post.mockRejectedValue({});
      await expect(authService.changePassword("x")).rejects.toThrow(
        "Échec du changement de mot de passe",
      );
    });
  });

  // ── requestPasswordReset ──────────────────────────────────────────────────

  describe("requestPasswordReset", () => {
    it("posts to /auth/forgot-password and returns response data", async () => {
      mockApiInstance.post.mockResolvedValue({ data: { sent: true } });
      const result = await authService.requestPasswordReset("user@test.com");
      expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "user@test.com",
      });
      expect(result).toEqual({ sent: true });
    });

    it("throws err.message on failure", async () => {
      mockApiInstance.post.mockRejectedValue({ message: "Server error" });
      await expect(authService.requestPasswordReset("user@test.com")).rejects.toThrow(
        "Server error",
      );
    });

    it("throws default message on generic failure", async () => {
      mockApiInstance.post.mockRejectedValue({});
      await expect(authService.requestPasswordReset("user@test.com")).rejects.toThrow(
        "Échec de la demande de réinitialisation",
      );
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("posts to /auth/reset-password and returns response data", async () => {
      mockApiInstance.post.mockResolvedValue({ data: { reset: true } });
      const result = await authService.resetPassword("reset-token", "NewPass123!");
      expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "reset-token",
        newPassword: "NewPass123!",
      });
      expect(result).toEqual({ reset: true });
    });

    it("throws error from response on failure", async () => {
      mockApiInstance.post.mockRejectedValue({
        response: { data: { message: "Token expired" } },
      });
      await expect(authService.resetPassword("bad-token", "NewPass")).rejects.toThrow(
        "Token expired",
      );
    });

    it("throws default message on generic failure", async () => {
      mockApiInstance.post.mockRejectedValue({});
      await expect(authService.resetPassword("bad-token", "NewPass")).rejects.toThrow(
        "Échec de la réinitialisation",
      );
    });
  });

  // ── completeProfile ───────────────────────────────────────────────────────

  describe("completeProfile", () => {
    it("posts to /auth/complete-profile with multipart header", async () => {
      mockApiInstance.post.mockResolvedValue({ data: { user: { id: "1", name: "Alice" } } });
      const formData = new FormData();
      const result = await authService.completeProfile(formData);
      expect(mockApiInstance.post).toHaveBeenCalledWith(
        "/auth/complete-profile",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      expect(result.user).toEqual({ id: "1", name: "Alice" });
    });

    it("merges updated user into localStorage when response has user", async () => {
      const existing = { id: "1", email: "a@a.com", role: "EMPLOYEE" };
      localStorage.setItem(authService.LS_USER, JSON.stringify(existing));
      mockApiInstance.post.mockResolvedValue({
        data: { user: { name: "Alice Updated" } },
      });
      await authService.completeProfile(new FormData());
      const stored = JSON.parse(localStorage.getItem(authService.LS_USER));
      expect(stored.name).toBe("Alice Updated");
      expect(stored.email).toBe("a@a.com");
    });

    it("does not modify localStorage when response has no user", async () => {
      const existing = { id: "1", email: "a@a.com" };
      localStorage.setItem(authService.LS_USER, JSON.stringify(existing));
      mockApiInstance.post.mockResolvedValue({ data: {} });
      await authService.completeProfile(new FormData());
      expect(JSON.parse(localStorage.getItem(authService.LS_USER))).toEqual(existing);
    });

    it("uses empty object as base when no user in localStorage", async () => {
      mockApiInstance.post.mockResolvedValue({
        data: { user: { id: "new", name: "New User" } },
      });
      await authService.completeProfile(new FormData());
      const stored = JSON.parse(localStorage.getItem(authService.LS_USER));
      expect(stored.name).toBe("New User");
    });

    it("throws error from response on failure", async () => {
      mockApiInstance.post.mockRejectedValue({
        response: { data: { message: "Upload failed" } },
      });
      await expect(authService.completeProfile(new FormData())).rejects.toThrow("Upload failed");
    });

    it("throws default message on generic failure", async () => {
      mockApiInstance.post.mockRejectedValue({});
      await expect(authService.completeProfile(new FormData())).rejects.toThrow(
        "Échec de la complétion du profil",
      );
    });
  });
});
