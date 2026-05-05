import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitizeForTTS, pickFrenchVoice, extractMainText } from "./tts";

describe("tts utils", () => {
  // ── sanitizeForTTS ────────────────────────────────────────────────────

  describe("sanitizeForTTS", () => {
    it("returns empty string for null/undefined", () => {
      expect(sanitizeForTTS(null)).toBe("");
      expect(sanitizeForTTS(undefined)).toBe("");
    });

    it("replaces % with pour cent", () => {
      expect(sanitizeForTTS("80%")).toContain("pour cent");
    });

    it("replaces + with plus", () => {
      expect(sanitizeForTTS("5+3")).toContain("plus");
    });

    it("replaces bullet • with period", () => {
      expect(sanitizeForTTS("item • item")).toContain(". ");
    });

    it("replaces | with period", () => {
      expect(sanitizeForTTS("a|b")).toContain(". ");
    });

    it("adds space between digits and letters", () => {
      const result = sanitizeForTTS("593Employés");
      expect(result).toContain("593 ");
    });

    it("adds space between letters and digits", () => {
      const result = sanitizeForTTS("HR2024");
      expect(result).toContain(" 2024");
    });

    it("fixes closing paren followed by letter", () => {
      const result = sanitizeForTTS("HR)Vue");
      expect(result).toContain("). ");
    });

    it("trims whitespace", () => {
      expect(sanitizeForTTS("  hello  ")).toBe("hello");
    });

    it("handles plain string input", () => {
      expect(sanitizeForTTS("Hello World")).toBe("Hello World");
    });

    it("collapses multiple spaces", () => {
      const result = sanitizeForTTS("hello   world");
      expect(result).toBe("hello world");
    });
  });

  // ── pickFrenchVoice ───────────────────────────────────────────────────

  describe("pickFrenchVoice", () => {
    it("returns null when no voices available", () => {
      vi.stubGlobal("speechSynthesis", { getVoices: () => [] });
      expect(pickFrenchVoice()).toBeNull();
      vi.unstubAllGlobals();
    });

    it("returns French voice when available", () => {
      const frVoice = { lang: "fr-FR", name: "French Voice" };
      const enVoice = { lang: "en-US", name: "English Voice" };
      vi.stubGlobal("speechSynthesis", { getVoices: () => [enVoice, frVoice] });
      const result = pickFrenchVoice();
      expect(result).toBe(frVoice);
      vi.unstubAllGlobals();
    });

    it("falls back to voice with 'fr' in name", () => {
      const frVoice = { lang: "en-US", name: "Google français" };
      vi.stubGlobal("speechSynthesis", { getVoices: () => [frVoice] });
      const result = pickFrenchVoice();
      expect(result).toBe(frVoice);
      vi.unstubAllGlobals();
    });

    it("returns null when speechSynthesis is undefined", () => {
      vi.stubGlobal("speechSynthesis", undefined);
      expect(pickFrenchVoice()).toBeNull();
      vi.unstubAllGlobals();
    });
  });

  // ── extractMainText ───────────────────────────────────────────────────

  describe("extractMainText", () => {
    it("returns empty string when no main element", () => {
      document.body.innerHTML = "<div>no main</div>";
      const result = extractMainText();
      expect(result).toBe("");
    });

    it("extracts text from main element", () => {
      document.body.innerHTML = "<main><p>Hello World</p></main>";
      const result = extractMainText();
      expect(result).toContain("Hello World");
    });

    it("extracts text from [data-tts-main] element", () => {
      document.body.innerHTML = '<div data-tts-main><p>TTS Content</p></div>';
      const result = extractMainText();
      expect(result).toContain("TTS Content");
    });

    it("skips hidden elements", () => {
      document.body.innerHTML = '<main><p style="display:none">Hidden</p><p>Visible</p></main>';
      const result = extractMainText();
      expect(result).not.toContain("Hidden");
      expect(result).toContain("Visible");
    });

    it("skips nav elements", () => {
      document.body.innerHTML = "<main><nav>Nav text</nav><p>Main text</p></main>";
      const result = extractMainText();
      expect(result).not.toContain("Nav text");
    });

    it("skips button elements", () => {
      document.body.innerHTML = "<main><button>Click me</button><p>Content</p></main>";
      const result = extractMainText();
      expect(result).not.toContain("Click me");
    });

    it("skips aria-hidden elements", () => {
      document.body.innerHTML = '<main><span aria-hidden="true">Hidden</span><p>Visible</p></main>';
      const result = extractMainText();
      expect(result).not.toContain("Hidden");
    });
  });
});
