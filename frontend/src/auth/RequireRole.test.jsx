import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("./authService", () => ({
  getStoredUser: vi.fn(),
}));

import RequireRole from "./RequireRole";
import * as authService from "./authService";

function renderWithRole(user, allowed = ["HR"]) {
  authService.getStoredUser.mockReturnValue(user);
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/not-authorized" element={<div>Not Authorized</div>} />
        <Route
          path="/protected"
          element={
            <RequireRole allowed={allowed}>
              <div>Protected Content</div>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("redirects to /login when no user", () => {
    renderWithRole(null);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders children when role is allowed", () => {
    renderWithRole({ role: "HR" }, ["HR", "SUPERADMIN"]);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /not-authorized when role not allowed", () => {
    renderWithRole({ role: "EMPLOYEE" }, ["HR", "SUPERADMIN"]);
    expect(screen.getByText("Not Authorized")).toBeInTheDocument();
  });

  it("allows SUPERADMIN when in allowed list", () => {
    renderWithRole({ role: "SUPERADMIN" }, ["HR", "SUPERADMIN"]);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
