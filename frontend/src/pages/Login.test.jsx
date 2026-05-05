import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

// Mock CSS
vi.mock("../styles/auth.css", () => ({}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useNavigate: () => mockNavigate };
});

// Mock auth service
const mockLogin = vi.fn();
vi.mock("../auth/authService", () => ({
  login: mockLogin,
  LS_TOKEN: "access_token",
  LS_USER: "user",
}));

// Mock child components that have heavy dependencies
vi.mock("../components/FaceLogin", () => ({
  default: () => <div data-testid="face-login">FaceLogin</div>,
}));
vi.mock("../components/MicButton", () => ({
  default: () => <button>Mic</button>,
}));

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
  });

  // ── Rendering ─────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("shows the Connexion heading", () => {
      renderLogin();
      expect(screen.getByRole("heading", { name: /connexion/i })).toBeInTheDocument();
    });

    it("renders email input", () => {
      renderLogin();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders password input", () => {
      renderLogin();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      renderLogin();
      expect(
        screen.getByRole("button", { name: /se connecter/i }),
      ).toBeInTheDocument();
    });

    it("renders GitHub login button", () => {
      renderLogin();
      expect(
        screen.getByText(/continuer avec github/i),
      ).toBeInTheDocument();
    });

    it("renders face recognition tab", () => {
      renderLogin();
      expect(screen.getByText(/reconnaissance faciale/i)).toBeInTheDocument();
    });
  });

  // ── Form interaction ──────────────────────────────────────────────────

  describe("form interaction", () => {
    it("allows typing in email field", () => {
      renderLogin();
      const input = screen.getByLabelText(/email/i);
      fireEvent.change(input, { target: { value: "user@example.com" } });
      expect(input.value).toBe("user@example.com");
    });

    it("allows typing in password field", () => {
      renderLogin();
      const input = screen.getByLabelText(/mot de passe/i);
      fireEvent.change(input, { target: { value: "secret123" } });
      expect(input.value).toBe("secret123");
    });

    it("navigates to dashboard on successful login", async () => {
      mockLogin.mockResolvedValue({
        accessToken: "token-abc",
        user: { id: "1", email: "user@example.com", role: "EMPLOYEE" },
      });

      renderLogin();
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/mot de passe/i), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "password123",
        });
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      });
    });

    it("shows alert on login failure", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockLogin.mockRejectedValue(new Error("Identifiants incorrects"));

      renderLogin();
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "bad@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/mot de passe/i), {
        target: { value: "wrongpw" },
      });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith("Identifiants incorrects");
      });
      alertMock.mockRestore();
    });

    it("disables submit button during loading", async () => {
      let resolveLogin: (v: any) => void;
      mockLogin.mockImplementation(
        () => new Promise((resolve) => { resolveLogin = resolve; }),
      );

      renderLogin();
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/mot de passe/i), {
        target: { value: "password" },
      });
      fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

      expect(
        screen.getByRole("button", { name: /connexion en cours/i }),
      ).toBeDisabled();

      resolveLogin!({ accessToken: "t", user: { email: "u@u.com" } });
    });
  });

  // ── Tab switching ─────────────────────────────────────────────────────

  describe("tab switching", () => {
    it("shows face login component when face tab clicked", () => {
      renderLogin();
      const faceTab = screen.getByText(/reconnaissance faciale/i);
      fireEvent.click(faceTab);
      expect(screen.getByTestId("face-login")).toBeInTheDocument();
    });

    it("hides password form when face tab active", () => {
      renderLogin();
      fireEvent.click(screen.getByText(/reconnaissance faciale/i));
      expect(screen.queryByLabelText(/mot de passe/i)).not.toBeInTheDocument();
    });
  });
});
