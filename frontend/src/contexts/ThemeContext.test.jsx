import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeConsumer() {
  const { isDark, toggle } = useTheme();
  return (
    <div>
      <span data-testid="theme">{isDark ? "dark" : "light"}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    cleanup();
    vi.stubGlobal("matchMedia", (query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("defaults to light theme when no preference saved", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("reads saved theme from localStorage", () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("toggles theme on button click", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /toggle/i }));
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("sets data-theme attribute on documentElement when dark", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /toggle/i }));
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("removes data-theme attribute when light", async () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /toggle/i }));
    });

    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("persists theme to localStorage on toggle", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /toggle/i }));
    });

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("throws when useTheme used outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow();
    spy.mockRestore();
  });

  it("respects OS dark mode preference", () => {
    vi.stubGlobal("matchMedia", (query) => ({
      matches: query.includes("dark"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
