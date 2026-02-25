import { useAccessibility } from "../accessibility/AccessibilityProvider";
import "../styles/accessibility.css";

export default function AccessibilityMenu({ open, onClose }) {
  const { theme, setTheme, fontSize, setFontSize } = useAccessibility();

  const speak = (text) => {
    if (!("speechSynthesis" in window)) {
      alert("Synthèse vocale non supportée sur ce navigateur.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    window.speechSynthesis.speak(u);
  };

  const readSelection = () => {
    const selected = window.getSelection()?.toString()?.trim();
    if (!selected) {
      alert("Sélectionne un texte sur la page d’abord.");
      return;
    }
    speak(selected);
  };

  const readMainContent = () => {
    const main = document.querySelector("main");
    const text = main?.innerText?.trim();
    if (!text) {
      alert("Contenu principal introuvable (ajoute <main> dans ton layout).");
      return;
    }
    speak(text.slice(0, 2500)); // avoid super long speech
  };

  if (!open) return null;

  return (
    <div className="a11yPopover" role="dialog" aria-label="Accessibilité">
      <div className="a11yHeader">
        <div className="a11yTitle">Accessibilité</div>
        <button className="a11yClose" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>

      <div className="a11ySection">
        <div className="a11yLabel">Mode d'affichage</div>
        <div className="a11yToggleRow">
          <button
            className={`a11yToggle ${theme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
            type="button"
          >
            ☀ Clair
          </button>
          <button
            className={`a11yToggle ${theme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
            type="button"
          >
            🌙 Sombre
          </button>
        </div>
      </div>

      <div className="a11ySection">
        <div className="a11yLabel">Taille du texte: {fontSize}px</div>
        <div className="a11ySliderRow">
          <span className="a11ySmall">Petit</span>
          <input
            className="a11ySlider"
            type="range"
            min="12"
            max="20"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
          <span className="a11ySmall">Grand</span>
        </div>
      </div>

      <div className="a11ySection">
        <div className="a11yLabel">Synthèse vocale</div>
        <button className="a11yAction" type="button" onClick={readSelection}>
          Lire la sélection
        </button>
        <button className="a11yAction" type="button" onClick={readMainContent}>
          Lire le contenu principal
        </button>
        <p className="a11yHint">
          Sélectionnez du texte sur la page puis utilisez « Lire la sélection ».
        </p>
      </div>
    </div>
  );
}