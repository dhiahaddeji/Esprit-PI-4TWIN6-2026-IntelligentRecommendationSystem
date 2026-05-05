import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../styles/auth.css", () => ({}));
vi.mock("../auth/authService", () => ({
  requestPasswordReset: vi.fn(),
}));

import ForgotPassword from "./ForgotPassword";
import * as authService from "../auth/authService";

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );
}

describe("ForgotPassword page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /mot de passe oubli/i })).toBeInTheDocument();
  });

  it("renders email input", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/sarah\.hr/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeInTheDocument();
  });

  it("shows error when email is empty", async () => {
    renderPage();
    // Clear the email and submit
    const input = screen.getByPlaceholderText(/sarah\.hr/i);
    fireEvent.change(input, { target: { value: "" } });
    // The input has required attribute, so we need to bypass it
    const form = input.closest("form");
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/email requis/i)).toBeInTheDocument();
    });
  });

  it("shows success message on successful request", async () => {
    authService.requestPasswordReset.mockResolvedValue({ message: "Email envoyé" });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/sarah\.hr/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }));
    await waitFor(() => {
      expect(screen.getByText(/email envoyé/i)).toBeInTheDocument();
    });
  });

  it("shows error message on failed request", async () => {
    authService.requestPasswordReset.mockRejectedValue(new Error("Compte introuvable"));
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/sarah\.hr/i), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }));
    await waitFor(() => {
      expect(screen.getByText(/compte introuvable/i)).toBeInTheDocument();
    });
  });

  it("disables button during loading", async () => {
    let resolve;
    authService.requestPasswordReset.mockImplementation(
      () => new Promise(r => { resolve = r; })
    );
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/sarah\.hr/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }));
    expect(screen.getByRole("button", { name: /envoi/i })).toBeDisabled();
    resolve({ message: "ok" });
  });

  it("renders back to login link", () => {
    renderPage();
    expect(screen.getByText(/retour/i)).toBeInTheDocument();
  });
});
