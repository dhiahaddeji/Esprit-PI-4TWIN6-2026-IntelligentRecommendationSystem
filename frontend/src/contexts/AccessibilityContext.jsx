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

  // dyslexic font
  const [dyslexicFont, setDyslexicFont] = useState(
    localStorage.getItem("dyslexicFont") === "true"
  );

  // high contrast
  const [highContrast, setHighContrast] = useState(
    localStorage.getItem("highContrast") === "true"
  );

  // reduce motion
  const [reduceMotion, setReduceMotion] = useState(
    localStorage.getItem("reduceMotion") === "true"
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

  // appliquer police dyslexique
  useEffect(() => {
    localStorage.setItem("dyslexicFont", dyslexicFont);
    if (dyslexicFont) {
      document.body.classList.add("font-dyslexic");
    } else {
      document.body.classList.remove("font-dyslexic");
    }
  }, [dyslexicFont]);

  // appliquer contrast & animations (simples exemples: vous pouvez ajouter la logique CSS si souhaitée)
  useEffect(() => {
    localStorage.setItem("highContrast", highContrast);
    if (highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem("reduceMotion", reduceMotion);
    if (reduceMotion) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }
  }, [reduceMotion]);

  const value = useMemo(() => {
    return {
      theme,
      setTheme,
      fontSize,
      setFontSize,
      dyslexicFont,
      setDyslexicFont,
      highContrast,
      setHighContrast,
      reduceMotion,
      setReduceMotion,
    };
  }, [theme, fontSize, dyslexicFont, highContrast, reduceMotion]);

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