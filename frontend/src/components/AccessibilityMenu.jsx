// src/components/AccessibilityMenu.jsx
import { useMemo, useState } from "react";
import { useAccessibility } from "../contexts/AccessibilityContext";
import "../styles/accessibility.css";
import { extractMainText, sanitizeForTTS, pickFrenchVoice } from "../utils/tts";

export default function AccessibilityMenu({ onClose }) {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion,
    dyslexicFont,
    setDyslexicFont,
  } = useAccessibility();

  const [isSpeaking, setIsSpeaking] = useState(false);

  const canSpeak = useMemo(() => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }, []);

  const stopSpeaking = () => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speakFR = (text) => {
    if (!canSpeak) return;

    const clean = sanitizeForTTS(text || "");
    if (!clean) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "fr-FR";

    // ✅ un peu plus lent et naturel
    u.rate = 0.9;
    u.pitch = 1.0;
    u.volume = 1.0;

    const v = pickFrenchVoice?.();
    if (v) u.voice = v;

    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const readSelection = () => {
    const selected = window.getSelection?.()?.toString?.() || "";
    speakFR(selected);
  };

  const readMain = () => {
    const text = extractMainText();
    speakFR(text);
  };

  return (
    <div className="a11yPopover" role="dialog" aria-label="Accessibilité">
      <div className="a11yHeader">
        <div className="a11yTitle">Accessibilité</div>
        <button className="a11yClose" type="button" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>

      {/* Mode */}
      <div className="a11ySection">
        <div className="a11yLabel">Mode d'affichage</div>
        <div className="a11yToggleRow">
          <button
            type="button"
            className={`a11yToggle ${theme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
          >
            ☀️ Clair
          </button>
          <button
            type="button"
            className={`a11yToggle ${theme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            🌙 Sombre
          </button>
        </div>
      </div>

      {/* Taille texte */}
      <div className="a11ySection">
        <div className="a11yLabel">Taille du texte: {fontSize}px</div>
        <div className="a11ySliderRow">
          <span className="a11ySmall">Petit</span>
          <input
            className="a11ySlider"
            type="range"
            min={12}
            max={24}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
          <span className="a11ySmall">Grand</span>
        </div>
      </div>

      {/* ✅ Nouveau: Contraste élevé */}
      <div className="a11ySection">
        <div className="a11yLabel">Lisibilité</div>

        <button
          type="button"
          className={`a11yToggle a11yToggleFull ${highContrast ? "active" : ""}`}
          onClick={() => setHighContrast(!highContrast)}
        >
          {highContrast ? "✅" : "⬜"} Contraste élevé
        </button>

        <button
          type="button"
          className={`a11yToggle a11yToggleFull ${reduceMotion ? "active" : ""}`}
          onClick={() => setReduceMotion(!reduceMotion)}
        >
          {reduceMotion ? "✅" : "⬜"} Réduire les animations
        </button>

        <button
          type="button"
          className={`a11yToggle a11yToggleFull ${dyslexicFont ? "active" : ""}`}
          onClick={() => setDyslexicFont(!dyslexicFont)}
        >
          {dyslexicFont ? "✅" : "⬜"} Police OpenDyslexic
        </button>
      </div>

      {/* Synthèse vocale */}
      <div className="a11ySection">
        <div className="a11yLabel">Synthèse vocale</div>
        <p className="a11yHint">
          Sélectionnez du texte puis cliquez “Lire la sélection”, ou cliquez “Lire le contenu principal”.
        </p>

        <button
          className="a11yAction"
          type="button"
          onClick={readSelection}
          disabled={!canSpeak}
          title={!canSpeak ? "SpeechSynthesis non supporté sur ce navigateur" : ""}
        >
          🔊 Lire la sélection
        </button>

        <button className="a11yAction" type="button" onClick={readMain} disabled={!canSpeak}>
          📖 Lire le contenu principal
        </button>

        {isSpeaking && (
          <button className="a11yAction" type="button" onClick={stopSpeaking}>
            ⛔ Arrêter la lecture
          </button>
        )}
      </div>
    </div>
  );
}