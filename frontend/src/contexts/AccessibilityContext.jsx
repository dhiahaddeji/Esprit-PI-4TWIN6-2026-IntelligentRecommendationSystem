import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  // thème
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  // taille du texte
  const [fontSize, setFontSize] = useState(
    Number(localStorage.getItem("fontSize")) || 16
  );

  // appliquer le thème
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // appliquer taille du texte
  useEffect(() => {
    localStorage.setItem("fontSize", fontSize);
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const value = useMemo(() => {
    return {
      theme,
      setTheme,
      fontSize,
      setFontSize,
    };
  }, [theme, fontSize]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error(
      "useAccessibility must be used inside AccessibilityProvider"
    );
  }

  return context;
}