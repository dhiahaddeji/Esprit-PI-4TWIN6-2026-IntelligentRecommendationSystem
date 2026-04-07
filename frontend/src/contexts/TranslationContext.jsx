import { createContext, useContext, useEffect, useState, useCallback } from "react";

const TranslationContext = createContext(null);
const LANG_KEY = "assurreco_lang";

/** Set or clear the googtrans cookie that Google Translate reads on page load */
function setGoogTransCookie(targetLang) {
  const exp = "expires=Thu, 01 Jan 2099 00:00:01 GMT";
  if (targetLang === "fr") {
    // Clear the cookie so Google Translate shows the original French
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    document.cookie = `googtrans=; domain=${window.location.hostname}; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  } else {
    document.cookie = `googtrans=/fr/${targetLang}; path=/; ${exp}`;
    document.cookie = `googtrans=/fr/${targetLang}; domain=${window.location.hostname}; path=/; ${exp}`;
  }
}

/** Try to trigger Google Translate via its hidden combo box (instant, no reload) */
function tryComboTranslate(targetLang) {
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) return false;
  combo.value = targetLang === "fr" ? "" : targetLang;
  combo.dispatchEvent(new Event("change"));
  return true;
}

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "fr");

  // On mount: re-apply saved language when Google Translate widget is ready
  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) || "fr";
    if (saved === "fr") return;

    let tries = 0;
    const id = setInterval(() => {
      if (tryComboTranslate(saved)) {
        clearInterval(id);
      }
      if (++tries > 30) clearInterval(id);
    }, 400);

    return () => clearInterval(id);
  }, []);

  const changeLanguage = useCallback((newLang) => {
    if (newLang === lang) return;

    setLang(newLang);
    localStorage.setItem(LANG_KEY, newLang);

    // Try instant combo translation first
    if (tryComboTranslate(newLang)) return;

    // Combo not ready → set cookie then reload (Google Translate reads it on load)
    setGoogTransCookie(newLang);
    window.location.reload();
  }, [lang]);

  return (
    <TranslationContext.Provider value={{ lang, changeLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within a TranslationProvider");
  return ctx;
}
