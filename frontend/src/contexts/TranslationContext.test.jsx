import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TranslationProvider, useTranslation } from "./TranslationContext";

function LangConsumer() {
  const { lang, changeLanguage } = useTranslation();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => changeLanguage("en")}>English</button>
      <button onClick={() => changeLanguage("fr")}>French</button>
      <button onClick={() => changeLanguage("ar")}>Arabic</button>
    </div>
  );
}

describe("TranslationContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("defaults to French", () => {
    render(
      <TranslationProvider>
        <LangConsumer />
      </TranslationProvider>
    );
    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });

  it("reads saved language from localStorage", () => {
    localStorage.setItem("assurreco_lang", "en");
    render(
      <TranslationProvider>
        <LangConsumer />
      </TranslationProvider>
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });

  it("changes language on button click", async () => {
    render(
      <TranslationProvider>
        <LangConsumer />
      </TranslationProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /english/i }));
    });

    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(localStorage.getItem("assurreco_lang")).toBe("en");
  });

  it("does not change language when same language selected", async () => {
    render(
      <TranslationProvider>
        <LangConsumer />
      </TranslationProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /french/i }));
    });

    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });

  it("throws when useTranslation used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<LangConsumer />)).toThrow();
    spy.mockRestore();
  });
});
