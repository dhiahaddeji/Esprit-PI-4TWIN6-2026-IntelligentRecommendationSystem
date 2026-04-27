import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const TranslationContext = createContext(null);
const LANG_KEY = "assurreco_lang";

// Module-level promise so we only ever inject the script once
let gtPromise = null;

function loadGoogleTranslate() {
  if (gtPromise) return gtPromise;
  gtPromise = new Promise((resolve) => {
    if (window.google?.translate) { resolve(); return; }
    const originalInit = window.googleTranslateElementInit;
    window.googleTranslateElementInit = () => {
      if (originalInit) originalInit();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  });
  return gtPromise;
}

function applyLanguage(targetLang) {
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) return false;
  combo.value = targetLang === "fr" ? "" : targetLang;
  combo.dispatchEvent(new Event("change"));
  return true;
}

function setGoogTransCookie(targetLang) {
  const exp = "expires=Thu, 01 Jan 2099 00:00:01 GMT";
  const host = window.location.hostname;
  if (targetLang === "fr") {
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    document.cookie = `googtrans=; domain=${host}; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  } else {
    document.cookie = `googtrans=/fr/${targetLang}; path=/; ${exp}`;
    document.cookie = `googtrans=/fr/${targetLang}; domain=${host}; path=/; ${exp}`;
  }
}

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "fr");
  const appliedRef = useRef(false);

  // Only load & apply Google Translate when the saved language is non-French
  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) || "fr";
    if (saved === "fr" || appliedRef.current) return;

    const apply = () => {
      loadGoogleTranslate().then(() => {
        let tries = 0;
        const id = setInterval(() => {
          if (applyLanguage(saved) || ++tries > 20) {
            clearInterval(id);
            appliedRef.current = true;
          }
        }, 300);
      });
    };

    // Defer until the browser is idle so it doesn't compete with first paint
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(apply, { timeout: 2000 });
    } else {
      setTimeout(apply, 800);
    }
  }, []);

  const changeLanguage = useCallback(
    (newLang) => {
      if (newLang === lang) return;
      setLang(newLang);
      localStorage.setItem(LANG_KEY, newLang);

      if (newLang === "fr") {
        // Restore original without reload if possible
        const combo = document.querySelector(".goog-te-combo");
        if (combo) {
          applyLanguage("fr");
        } else {
          setGoogTransCookie("fr");
          window.location.reload();
        }
        return;
      }

      // Non-French: ensure GT is loaded then apply
      loadGoogleTranslate().then(() => {
        let tries = 0;
        const id = setInterval(() => {
          if (applyLanguage(newLang) || ++tries > 20) clearInterval(id);
        }, 300);
      });
    },
    [lang]
  );

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
