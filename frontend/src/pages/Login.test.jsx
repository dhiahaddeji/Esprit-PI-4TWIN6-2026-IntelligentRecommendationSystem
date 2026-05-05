import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../styles/auth.css", () => ({}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock("../auth/authService", () => ({
  login: vi.fn(),
  LS_TOKEN: "access_token",
  LS_USER: "user",
}));

vi.mock("../components/FaceLogin", () => ({
  default: () => <div data-testid="face-login">FaceLogin</div>,
}));
vi.mock("../components/MicButton", () => ({
  default: () => null,
}));

import Login from "./Login";
import * as authService from "../auth/authService";

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  describe("rendering", () => {
    it("shows the Connexion heading", () => {
      renderLogin();
      expect(screen.getByRole("heading", { name: /connexion/i })).toBeInTheDocument();
    });

    it("renders email input", () => {
      renderLogin();
      expect(screen.getByPlaceholderText(/sarah\.hr/i)).toBeInTheDocument();
    });

    it("renders password input", () => {
      renderLogin();
      expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      renderLogin();
      expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
    });

    it("renders GitHub login button", () => {
      renderLogin();
      expect(screen.getByText(/github/i)).toBeInTheDocument();
    });

    it("renders face tab button", () => {
      renderLogin();
      const buttons = screen.getAllByRole("button");
      expect(buttons.some(b => b.textContent.includes("Visage"))).toBe(true);
    });
  });

  describe("form interaction", () => {
    it("allows typing in email field", () => {
      renderLogin();
      const input = screen.getByPlaceholderText(/sarah\.hr/i);
      fireEvent.change(input, { target: { value: "user@example.com" } });
      expect(input.value).toBe("user@example.com");
    });

    it("allows typing in password field", () => {
      renderLogin();
      const input = screen.getByPlaceholderText(/••••/);
      fireEvent.change(input, { target: { value: "secret123" } });
      expect(input.value).toBe("secret123");
    });

    it("navigates to dashboard on successful login", async () => {
      authService.login.mockResolvedValue({
        accessToken: "token-abc",
        user: { id: "1", email: "user@example.com", role: "EMPLOYEE" },
      });

      renderLogin();
      fireEvent.change(screen.getByPlaceholderText(/sarah\.hr/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••/), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "password123",
        });
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      });
    });

    it("shows alert on login failure", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
      authService.login.mockRejectedValue(new Error("Identifiants incorrects"));

      renderLogin();
      fireEvent.change(screen.getByPlaceholderText(/sarah\.hr/i), {
        target: { value: "bad@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••/), {
        target: { value: "wrongpw" },
      });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith("Identifiants incorrects");
      });
      alertMock.mockRestore();
    });

    it("disables submit button during loading", async () => {
      let resolveLogin;
      authService.login.mockImplementation(
        () => new Promise((resolve) => { resolveLogin = resolve; }),
      );

      renderLogin();
      fireEvent.change(screen.getByPlaceholderText(/sarah\.hr/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••/), {
        target: { value: "password" },
      });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      // Button should be disabled while loading
      const loadingBtn = screen.getByRole("button", { name: /connexion/i });
      expect(loadingBtn).toBeDisabled();

      resolveLogin({ accessToken: "t", user: { email: "u@u.com" } });
    });
  });

  describe("tab switching", () => {
    it("shows face login component when face tab clicked", () => {
      renderLogin();
      const buttons = screen.getAllByRole("button");
      const faceTab = buttons.find(b => b.textContent.includes("Visage"));
      fireEvent.click(faceTab);
      expect(screen.getByTestId("face-login")).toBeInTheDocument();
    });

    it("switches back to password tab", () => {
      renderLogin();
      const buttons = screen.getAllByRole("button");
      const faceTab = buttons.find(b => b.textContent.includes("Visage"));
      fireEvent.click(faceTab);
      expect(screen.getByTestId("face-login")).toBeInTheDocument();
      const pwTab = buttons.find(b => b.textContent.includes("Mot de passe"));
      fireEvent.click(pwTab);
      expect(screen.queryByTestId("face-login")).not.toBeInTheDocument();
    });
  });
});
