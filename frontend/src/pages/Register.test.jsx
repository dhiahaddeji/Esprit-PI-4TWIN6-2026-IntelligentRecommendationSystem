import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../components/MicButton", () => ({ default: () => null }));
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useNavigate: () => vi.fn() };
});
vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import Register from "./Register";
import { useAuth } from "../auth/AuthContext";

function renderPage(registerFn = vi.fn()) {
  useAuth.mockReturnValue({ register: registerFn });
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

describe("Register page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders name input", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
  });

  it("renders email input", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/^email$/i)).toBeInTheDocument();
  });

  it("renders role select", () => {
    renderPage();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders password input", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it("renders sign up button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("allows typing in name field", () => {
    renderPage();
    const input = screen.getByPlaceholderText(/full name/i);
    fireEvent.change(input, { target: { value: "Alice Martin" } });
    expect(input.value).toBe("Alice Martin");
  });

  it("shows error on registration failure", async () => {
    const mockRegister = vi.fn().mockRejectedValue(new Error("Email already exists"));
    renderPage(mockRegister);

    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByPlaceholderText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it("calls register with correct data on submit", async () => {
    const mockRegister = vi.fn().mockResolvedValue({ user: { role: "EMPLOYEE" } });
    renderPage(mockRegister);

    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByPlaceholderText(/^email$/i), { target: { value: "alice@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Alice", email: "alice@test.com" })
      );
    });
  });
});
