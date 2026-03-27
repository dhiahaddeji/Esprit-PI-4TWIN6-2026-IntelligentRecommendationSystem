// src/utils/tts.js

function isHidden(el) {
  if (!el || el.nodeType !== 1) return false;
  const style = window.getComputedStyle(el);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    el.hasAttribute("hidden") ||
    el.getAttribute("aria-hidden") === "true"
  );
}

function shouldSkipElement(el) {
  if (!el || el.nodeType !== 1) return true;

  const tag = el.tagName?.toLowerCase();
  if (!tag) return true;

  // On évite navigation / UI / icons / formulaires
  const blockedTags = new Set([
    "aside",
    "nav",
    "header",
    "footer",
    "script",
    "style",
    "noscript",
    "svg",
    "canvas",
    "img",
    "video",
    "audio",
    "input",
    "textarea",
    "select",
    "button",
  ]);
  if (blockedTags.has(tag)) return true;

  // classes courantes UI
  const cls = (el.className || "").toString().toLowerCase();
  if (
    cls.includes("sidebar") ||
    cls.includes("topbar") ||
    cls.includes("menu") ||
    cls.includes("popover") ||
    cls.includes("dropdown") ||
    cls.includes("icon") ||
    cls.includes("badge")
  ) {
    return true;
  }

  // si l’élément est caché
  if (isHidden(el)) return true;

  return false;
}

/**
 * ✅ Récupère uniquement le texte de la zone principale.
 * Priorité: [data-tts-main] -> <main> -> .layoutContent
 */
export function extractMainText() {
  if (typeof window === "undefined") return "";

  const root =
    document.querySelector("[data-tts-main]") ||
    document.querySelector("main") ||
    document.querySelector(".layoutContent");

  if (!root) return "";

  // TreeWalker sur les TextNodes (meilleur contrôle que textContent)
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parentEl = node.parentElement;
        if (!parentEl) return NodeFilter.FILTER_REJECT;
        if (shouldSkipElement(parentEl)) return NodeFilter.FILTER_REJECT;

        const txt = (node.nodeValue || "").replace(/\s+/g, " ").trim();
        if (!txt) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const parts = [];
  let n;
  while ((n = walker.nextNode())) {
    let t = (n.nodeValue || "").replace(/\s+/g, " ").trim();
    if (!t) continue;
    parts.push(t);
  }

  // On rejoint avec des espaces + ponctuation légère pour éviter "collé"
  return parts.join(" • ");
}

/**
 * ✅ Nettoyage pour éviter emojis/symboles + corriger nombres collés
 */
export function sanitizeForTTS(input) {
  let text = String(input || "");

  // Enlever emojis (approx) + pictos
  text = text.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
    ""
  );

  // Remplacer quelques symboles courants
  text = text.replace(/%/g, " pour cent ");
  text = text.replace(/\+/g, " plus ");
  text = text.replace(/•/g, ". ");
  text = text.replace(/[|]/g, ". ");

  // Ajouter espaces entre chiffres et lettres: 593Employés -> 593 Employés
  text = text.replace(/(\d)([A-Za-zÀ-ÿ])/g, "$1 $2");
  text = text.replace(/([A-Za-zÀ-ÿ])(\d)/g, "$1 $2");

  // Corriger les collages type "HR)Vue" -> "HR). Vue"
  text = text.replace(/\)([A-Za-zÀ-ÿ])/g, "). $1");

  // Nettoyage final
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * ✅ Choisir une voix FR si possible
 */
export function pickFrenchVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const fr =
    voices.find((v) => (v.lang || "").toLowerCase().startsWith("fr")) ||
    voices.find((v) => (v.name || "").toLowerCase().includes("fr")) ||
    null;
  return fr;
}