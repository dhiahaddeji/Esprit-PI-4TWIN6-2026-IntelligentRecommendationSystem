/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AccessibilityContext = createContext(null);

const DEFAULTS = {
  theme: "light", // "light" | "dark"
  fontSize: 14,   // px
};

export function AccessibilityProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || DEFAULTS.theme);
  const [fontSize, setFontSize] = useState(
    Number(localStorage.getItem("fontSize")) || DEFAULTS.fontSize
  );

  // Persist + apply
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("fontSize", String(fontSize));
    document.documentElement.style.setProperty("--app-font-size", `${fontSize}px`);
  }, [fontSize]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      fontSize,
      setFontSize,
    }),
    [theme, fontSize]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used inside AccessibilityProvider");
  return ctx;
}