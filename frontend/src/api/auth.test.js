import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./http", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import http from "./http";
import { authApi } from "./auth";

describe("authApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login posts to /auth/login", async () => {
    http.post.mockResolvedValue({ data: { accessToken: "tok" } });
    await authApi.login({ email: "a@a.com", password: "pw" });
    expect(http.post).toHaveBeenCalledWith("/auth/login", { email: "a@a.com", password: "pw" });
  });

  it("googleLogin posts to /auth/google", async () => {
    http.post.mockResolvedValue({ data: {} });
    await authApi.googleLogin({ credential: "cred" });
    expect(http.post).toHaveBeenCalledWith("/auth/google", { credential: "cred" });
  });

  it("me gets /auth/me", async () => {
    http.get.mockResolvedValue({ data: { id: "u1" } });
    await authApi.me();
    expect(http.get).toHaveBeenCalledWith("/auth/me");
  });

  it("logout posts to /auth/logout", async () => {
    http.post.mockResolvedValue({ data: {} });
    await authApi.logout();
    expect(http.post).toHaveBeenCalledWith("/auth/logout");
  });
});
