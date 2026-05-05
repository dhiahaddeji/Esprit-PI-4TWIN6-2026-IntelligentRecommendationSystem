import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock all lazy-loaded pages to avoid heavy dependencies
vi.mock("./pages/Login", () => ({
  default: () => (
    <div>
      <h1>Connexion</h1>
      <label htmlFor="email">Email</label>
      <input id="email" />
      <label htmlFor="password">Mot de passe</label>
      <input id="password" type="password" />
      <button>Se connecter</button>
      <span>Continuer avec GitHub</span>
    </div>
  ),
}));
vi.mock("./components/KeyboardNavController", () => ({ default: () => null }));
vi.mock("./pages/Register", () => ({ default: () => <div>Register</div> }));
vi.mock("./pages/NotAuthorized", () => ({ default: () => <div>Not Authorized</div> }));
vi.mock("./pages/GitHubCallback", () => ({ default: () => <div>GitHub Callback</div> }));
vi.mock("./pages/ChangePassword", () => ({ default: () => <div>Change Password</div> }));
vi.mock("./pages/CompleteProfile", () => ({ default: () => <div>Complete Profile</div> }));
vi.mock("./pages/ForgotPassword", () => ({ default: () => <div>Forgot Password</div> }));
vi.mock("./pages/ResetPassword", () => ({ default: () => <div>Reset Password</div> }));
vi.mock("./layout/MainLayout", () => ({ default: () => <div>Main Layout</div> }));

import App from "./App";

describe("App", () => {
  it("renders login screen when visiting /login", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/login"]}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByRole("heading", { name: /connexion/i })).toBeInTheDocument();
    expect(screen.getByText(/continuer avec github/i)).toBeInTheDocument();
  });

  it("renders not-authorized page", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/not-authorized"]}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
  });

  it("renders forgot-password page", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <App />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });
});
