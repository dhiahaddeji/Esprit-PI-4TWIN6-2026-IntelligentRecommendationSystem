import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// MicButton uses navigator.mediaDevices which doesn't exist in jsdom
vi.mock("./components/MicButton", () => ({ default: () => null }));

describe("App", () => {
  it("renders login screen when visiting /login", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    // findBy* waits for the lazy-loaded Login component to resolve
    expect(await screen.findByRole("heading", { name: /connexion/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/adresse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  });
});
