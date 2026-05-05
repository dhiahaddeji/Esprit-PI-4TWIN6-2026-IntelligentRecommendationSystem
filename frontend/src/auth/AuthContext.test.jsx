import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import * as authService from "./authService";

vi.mock("./authService", () => ({
  getStoredUser: vi.fn(() => null),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  completeProfile: vi.fn(),
  LS_USER: "user",
  LS_TOKEN: "access_token",
}));

function TestConsumer() {
  const auth = useAuth();
  if (!auth) return <div>no context</div>;
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.email : "null"}</div>
      <button onClick={() => auth.login({ email: "a@a.com", password: "pw" })}>
        login
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it("provides null user by default", () => {
    authService.getStoredUser.mockReturnValue(null);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("provides stored user from localStorage on mount", () => {
    authService.getStoredUser.mockReturnValue({
      email: "stored@example.com",
      role: "EMPLOYEE",
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId("user").textContent).toBe("stored@example.com");
  });

  it("updates user state after login", async () => {
    authService.getStoredUser.mockReturnValue(null);
    authService.login.mockResolvedValue({
      accessToken: "tok",
      user: { email: "new@example.com", role: "EMPLOYEE" },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: /login/i }).click();
    });

    expect(screen.getByTestId("user").textContent).toBe("new@example.com");
  });

  it("clears user state after logout", async () => {
    authService.getStoredUser.mockReturnValue({ email: "me@example.com", role: "HR" });
    authService.logout.mockImplementation(() => {});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user").textContent).toBe("me@example.com");

    await act(async () => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(authService.logout).toHaveBeenCalled();
  });

  it("useAuth returns null outside AuthProvider", () => {
    render(<TestConsumer />);
    expect(screen.getByText("no context")).toBeInTheDocument();
  });
});
