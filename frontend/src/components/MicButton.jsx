/**
 * MicButton — reusable speech-to-text button.
 *
 * Props:
 *   onResult(text)  — called with the recognised transcript
 *   lang            — BCP-47 language tag, default "fr-FR"
 *
 * Usage:
 *   <div style={{ position: "relative" }}>
 *     <input style={{ paddingRight: 42 }} ... />
 *     <MicButton onResult={(t) => setValue(t)} />
 *   </div>
 *
 * Requires Chrome / Edge (Web Speech API).
 */
import { useState, useRef } from "react";

export default function MicButton({ onResult, lang = "fr-FR" }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert(
        "La reconnaissance vocale n'est pas supportée par votre navigateur.\n" +
        "Utilisez Chrome ou Edge pour cette fonctionnalité."
      );
      return;
    }

    if (listening) {
      recRef.current?.stop();
      return;
    }

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => setListening(false);

    rec.start();
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Arrêter la dictée" : "Dicter par microphone"}
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        borderRadius: 6,
        lineHeight: 0,
        color: listening ? "#dc2626" : "#94a3b8",
        transition: "color 0.15s",
        zIndex: 1,
      }}
    >
      {listening ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
          style={{ animation: "mic-pulse 1s ease-in-out infinite" }}>
          <style>{`@keyframes mic-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
          <circle cx="12" cy="12" r="10" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="9"  y1="22" x2="15" y2="22" />
        </svg>
      )}
    </button>
  );
}
