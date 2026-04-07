import { createContext, useContext, useEffect, useState } from "react";

const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  // Par défaut, la langue est FR (français).
  // On regarde la présence du cookie googtrans pour deviner la langue actuelle.
  const [lang, setLang] = useState("fr");

  useEffect(() => {
    // Si le cookie googtrans contient /en, on est en anglais, /ar pour arabe
    if (document.cookie.includes("googtrans=/fr/en")) {
      setLang("en");
    } else if (document.cookie.includes("googtrans=/fr/ar")) {
      setLang("ar");
    } else {
      setLang("fr");
    }
  }, []);

  const changeLanguage = (newLang) => {
    if (newLang === lang) return; // Ne rien faire si c'est la même langue
    
    // Définir le cookie pour Google Translate
    if (newLang === "en") {
      document.cookie = "googtrans=/fr/en; path=/";
      document.cookie = "googtrans=/fr/en; domain=" + window.location.hostname + "; path=/";
    } else if (newLang === "ar") {
      document.cookie = "googtrans=/fr/ar; path=/";
      document.cookie = "googtrans=/fr/ar; domain=" + window.location.hostname + "; path=/";
    } else {
      // Pour revenir au français (langue d'origine), on supprime le cookie ou on met /fr/fr
      document.cookie = "googtrans=/fr/fr; path=/";
      document.cookie = "googtrans=/fr/fr; domain=" + window.location.hostname + "; path=/";
    }
    
    setLang(newLang);
    window.location.reload();
  };

  return (
    <TranslationContext.Provider value={{ lang, changeLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
