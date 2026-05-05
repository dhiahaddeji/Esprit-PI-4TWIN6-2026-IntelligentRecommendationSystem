import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("./authService", () => ({
  LS_TOKEN: "access_token",
  getStoredUser: vi.fn(),
}));

import RequireAuth from "./RequireAuth";
import * as authService from "./authService";

function renderWithRoute(initialPath, user = null, token = null) {
  if (token) localStorage.setItem("access_token", token);
  authService.getStoredUser.mockReturnValue(user);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/change-password" element={<div>Change Password</div>} />
        <Route path="/complete-profile" element={<div>Complete Profile</div>} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <div>Dashboard</div>
            </RequireAuth>
          }
        />
        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <div>Change Password</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it("redirects to /login when no token", () => {
    renderWithRoute("/dashboard", null, null);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders children when token exists and user is complete", () => {
    renderWithRoute(
      "/dashboard",
      { role: "EMPLOYEE", mustChangePassword: false, isProfileComplete: true },
      "valid-token"
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("redirects to /change-password when mustChangePassword is true", () => {
    renderWithRoute(
      "/dashboard",
      { role: "EMPLOYEE", mustChangePassword: true, isProfileComplete: true },
      "valid-token"
    );
    expect(screen.getByText("Change Password")).toBeInTheDocument();
  });

  it("redirects to /complete-profile when profile is incomplete", () => {
    renderWithRoute(
      "/dashboard",
      { role: "EMPLOYEE", mustChangePassword: false, isProfileComplete: false },
      "valid-token"
    );
    expect(screen.getByText("Complete Profile")).toBeInTheDocument();
  });

  it("does not redirect SUPERADMIN even if profile incomplete", () => {
    renderWithRoute(
      "/dashboard",
      { role: "SUPERADMIN", mustChangePassword: false, isProfileComplete: false },
      "valid-token"
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
