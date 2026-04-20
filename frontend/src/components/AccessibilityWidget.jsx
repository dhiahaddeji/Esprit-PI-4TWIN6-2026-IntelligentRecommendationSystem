/**
 * AccessibilityWidget — Full EqualWeb-style a11y panel (vanilla JS/CSS, no SaaS)
 * Settings persisted in localStorage key "a11y-settings"
 * All CSS scoped to .a11y-* prefix — z-index 999999
 */
import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/accessibility-widget.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = "a11y-settings";

const DEFAULT = {
  profiles: {
    blindness: false, motorSkills: false, colorBlindness: false,
    visuallyImpaired: false, epilepsy: false, adhd: false,
    learning: false, elder: false, dyslexia: false, wcag: false,
  },
  nav: {
    screenReader: false, keyboardNav: false, mousegrid: false,
    smartNav: false, textReader: false, voiceCommands: false,
  },
  colors: {
    mode: null, bgColor: "", headingColor: "", textColor: "",
  },
  content: {
    fontSize: 16, lineHeight: 1.5, wordSpacing: 0, letterSpacing: 0,
    cursor: "default",
    blinksBlocking: false, captions: false, magnifier: false,
    readableFont: false, imageDescriptions: false, highlightLinks: false,
    highlightHeaders: false, highlightElements: false, enlargeButtons: false,
    readableMode: false, textMagnifier: false, pageStructure: false,
    muteMedia: false, pageSummary: false, readFocus: false,
    readingGuide: false, dictionary: false, virtualKeyboard: false,
  },
};

// ─── Persistence hook ─────────────────────────────────────────────────────────
function useA11ySettings() {
  const [settings, setRaw] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved) return {
        profiles: { ...DEFAULT.profiles, ...saved.profiles },
        nav:      { ...DEFAULT.nav,      ...saved.nav      },
        colors:   { ...DEFAULT.colors,   ...saved.colors   },
        content:  { ...DEFAULT.content,  ...saved.content  },
      };
    } catch { /**/ }
    return DEFAULT;
  });

  const set = useCallback((updater) => {
    setRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return [settings, set];
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
function injectStyle(id, css) {
  removeStyle(id);
  const s = document.createElement("style");
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
function removeStyle(id) {
  document.getElementById(id)?.remove();
}
function styleIf(id, active, css) {
  active ? injectStyle(id, css) : removeStyle(id);
}
function injectSkipLink() {
  if (document.getElementById("a11y-skip")) return;
  const a = document.createElement("a");
  a.id = "a11y-skip"; a.href = "#mainContent"; a.textContent = "Skip to main content";
  a.style.cssText = "position:fixed;top:-999px;left:8px;z-index:999999;background:#005FCC;color:#fff;padding:8px 16px;border-radius:0 0 8px 8px;font-weight:700;transition:top 0.2s;text-decoration:none;";
  a.onfocus = () => { a.style.top = "0"; };
  a.onblur  = () => { a.style.top = "-999px"; };
  document.body.prepend(a);
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export default function AccessibilityWidget() {
  const [open, setOpen]         = useState(false);
  const [settings, setSettings] = useA11ySettings();
  const [collapsed, setCollapsed] = useState({ profiles: false, nav: false, colors: false, content: false });
  const [colorTab, setColorTab] = useState("bg");
  const [fontTab,  setFontTab]  = useState("size");
  const [dictTooltip, setDictTooltip] = useState(null);
  const [structureItems, setStructureItems] = useState([]);
  const [summaryText, setSummaryText] = useState("");
  const [readableText, setReadableText] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");

  const panelRef   = useRef(null);
  const guideRef   = useRef(null);
  const magRef     = useRef(null);

  // ── Shortcuts ────────────────────────────────────────────────────────────
  const tp = (k, v) => setSettings(s => ({ ...s, profiles: { ...s.profiles, [k]: v ?? !s.profiles[k] } }));
  const tn = (k)    => setSettings(s => ({ ...s, nav:      { ...s.nav,      [k]: !s.nav[k]      } }));
  const tc = (k)    => setSettings(s => ({ ...s, content:  { ...s.content,  [k]: !s.content[k]  } }));
  const sc = (k, v) => setSettings(s => ({ ...s, content:  { ...s.content,  [k]: v               } }));
  const scol = (patch) => setSettings(s => ({ ...s, colors: { ...s.colors, ...patch } }));

  // ── SECTION 1: Profile effects ────────────────────────────────────────────
  useEffect(() => {
    const p = settings.profiles;

    // Blindness
    if (p.blindness) {
      document.querySelectorAll("img:not([alt])").forEach(el => el.setAttribute("aria-hidden","true"));
      document.querySelectorAll("img[alt='']").forEach(el => el.setAttribute("role","presentation"));
      if (!document.querySelector("[role='main']")) document.querySelector("main")?.setAttribute("role","main");
      injectSkipLink();
    }
    styleIf("a11y-motor", p.motorSkills,
      `button,a,[role="button"],input,select,textarea{min-width:44px!important;min-height:44px!important;}`);

    styleIf("a11y-colorblind", p.colorBlindness,
      `html{filter:url(#a11y-deuteranopia) saturate(0.8)!important;}`);

    if (p.colorBlindness && !document.getElementById("a11y-svgfilter")) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.id = "a11y-svgfilter"; svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
      svg.innerHTML = `<defs><filter id="a11y-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"/></filter></defs>`;
      document.body.appendChild(svg);
    }

    styleIf("a11y-visual-impaired", p.visuallyImpaired,
      `body{font-size:140%!important;}*{letter-spacing:0.03em;}:focus{outline:4px solid #FFD700!important;}`);

    styleIf("a11y-epilepsy", p.epilepsy,
      `*{animation:none!important;transition:none!important;}video,img[src*=".gif"]{display:none!important;}`);

    styleIf("a11y-adhd", p.adhd,
      `*{transition:none!important;}:focus{outline:4px solid #005FCC!important;box-shadow:0 0 0 6px rgba(0,95,204,0.25)!important;}audio,video{display:none!important;}`);

    styleIf("a11y-learning", p.learning,
      `body{font-family:Arial,Helvetica,sans-serif!important;}a{border-bottom:3px solid #FFD700!important;background:rgba(255,215,0,0.15)!important;}`);

    styleIf("a11y-elder", p.elder,
      `body{font-size:150%!important;}button,a,[role="button"]{padding:12px 24px!important;font-size:1.2em!important;}body{filter:contrast(1.4);}`);

    if (p.dyslexia) {
      if (!document.getElementById("a11y-dyslexic-font")) {
        const l = document.createElement("link");
        l.id = "a11y-dyslexic-font"; l.rel = "stylesheet";
        l.href = "https://cdn.jsdelivr.net/npm/open-dyslexic@0.0.1/open-dyslexic-regular.min.css";
        document.head.appendChild(l);
      }
      injectStyle("a11y-dyslexia-css",
        `body,p,span,li,td{font-family:'OpenDyslexic',sans-serif!important;letter-spacing:0.1em!important;word-spacing:0.2em!important;line-height:1.8!important;}`);
    } else {
      removeStyle("a11y-dyslexia-css");
    }

    styleIf("a11y-wcag", p.wcag,
      `*:focus{outline:3px solid #005FCC!important;outline-offset:2px!important;}
       body{background:#fff!important;color:#000!important;}
       a{color:#0000EE!important;}a:visited{color:#551A8B!important;}`);
  }, [settings.profiles]);

  // ── SECTION 2: Navigation effects ────────────────────────────────────────
  useEffect(() => {
    const n = settings.nav;
    // Screen Reader
    if (n.screenReader) {
      injectSkipLink();
      document.querySelectorAll("img:not([alt])").forEach(img => img.setAttribute("alt", img.src.split("/").pop()));
      if (!document.querySelector("[role='navigation']")) document.querySelector("nav")?.setAttribute("role","navigation");
    }
    // Keyboard Nav
    styleIf("a11y-keyboardnav", n.keyboardNav,
      `*:focus{outline:3px solid #005FCC!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(0,95,204,0.18)!important;}`);
    // Smart Nav
    if (n.smartNav) injectSkipLink(); else document.getElementById("a11y-skip")?.remove();
  }, [settings.nav]);

  // Voice Commands
  useEffect(() => {
    if (!settings.nav.voiceCommands) { setVoiceStatus(""); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceStatus("Non supporté"); return; }
    const rec = new SR();
    rec.continuous = true; rec.lang = "fr-FR"; rec.interimResults = false;
    rec.onresult = (e) => {
      const cmd = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      setVoiceStatus(`"${cmd}"`);
      if (cmd.includes("scroll bas")  || cmd.includes("scroll down")) window.scrollBy(0, 300);
      if (cmd.includes("scroll haut") || cmd.includes("scroll up"))   window.scrollBy(0, -300);
      if (cmd.includes("retour")      || cmd.includes("go back"))     history.back();
      if (cmd.startsWith("cliquer ") || cmd.startsWith("click ")) {
        const txt = cmd.replace(/^(cliquer|click)\s+/i, "").trim();
        const els = [...document.querySelectorAll("a,button,[role='button']")];
        els.find(el => el.textContent.trim().toLowerCase().includes(txt))?.click();
      }
    };
    rec.onerror = () => setVoiceStatus("Erreur micro");
    rec.start();
    return () => { try { rec.stop(); } catch { /**/ } };
  }, [settings.nav.voiceCommands]);

  // Text Reader (click to speak)
  useEffect(() => {
    if (!settings.nav.textReader) return;
    const handler = (e) => {
      const text = e.target.innerText?.trim();
      if (!text || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 500));
      u.lang = "fr-FR"; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [settings.nav.textReader]);

  // ── SECTION 3: Color effects ──────────────────────────────────────────────
  useEffect(() => {
    const { mode, bgColor, headingColor, textColor } = settings.colors;
    const filterMap = {
      monochrome:    "grayscale(100%)",
      darkContrast:  "invert(1) hue-rotate(180deg)",
      brightContrast:"contrast(2) brightness(1.1)",
      lowSat:        "saturate(0.3)",
      highSat:       "saturate(3)",
      contrastMode:  "contrast(2)",
    };
    if (mode && filterMap[mode]) {
      injectStyle("a11y-color-mode", `html{filter:${filterMap[mode]}!important;}`);
    } else {
      removeStyle("a11y-color-mode");
    }
    const vars = [];
    if (bgColor)      vars.push(`--a11y-bg:${bgColor}`);
    if (headingColor) vars.push(`--a11y-heading:${headingColor}`);
    if (textColor)    vars.push(`--a11y-text:${textColor}`);
    if (vars.length) {
      injectStyle("a11y-custom-colors",
        `html{${vars.join(";")}}` +
        (bgColor      ? `body,#root,.layout,.layoutMain{background:${bgColor}!important;}` : "") +
        (headingColor ? `h1,h2,h3,h4,h5,h6{color:${headingColor}!important;}` : "") +
        (textColor    ? `body,p,span,li,td,div{color:${textColor}!important;}` : "")
      );
    } else {
      removeStyle("a11y-custom-colors");
    }
  }, [settings.colors]);

  // ── SECTION 4: Content effects ────────────────────────────────────────────
  useEffect(() => {
    const c = settings.content;
    // Typography
    injectStyle("a11y-typography",
      `body{font-size:${c.fontSize}px!important;line-height:${c.lineHeight}!important;` +
      `word-spacing:${c.wordSpacing}px!important;letter-spacing:${c.letterSpacing}px!important;}`);
    // Cursor
    const cursors = {
      "large-white": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='4' cy='4' r='3' fill='white' stroke='black' stroke-width='1.5'/%3E%3Cpath d='M4 4 L4 28 L10 22 L14 32 L18 30 L14 20 L22 20 Z' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E\"), auto",
      "large-black": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='4' cy='4' r='3' fill='black' stroke='white' stroke-width='1.5'/%3E%3Cpath d='M4 4 L4 28 L10 22 L14 32 L18 30 L14 20 L22 20 Z' fill='black' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E\"), auto",
    };
    styleIf("a11y-cursor", c.cursor !== "default" && !!cursors[c.cursor],
      `*{cursor:${cursors[c.cursor] || "auto"}!important;}`);
    // Blinks
    styleIf("a11y-noanim", c.blinksBlocking,
      `*{animation:none!important;transition:none!important;}`);
    // Readable font
    styleIf("a11y-readfont", c.readableFont,
      `body,p,span,li,td,div{font-family:Arial,Helvetica,sans-serif!important;}`);
    // Highlight links
    styleIf("a11y-links", c.highlightLinks,
      `a{border-bottom:3px solid #FFD700!important;background:rgba(255,215,0,0.15)!important;padding-bottom:1px!important;}`);
    // Highlight headers
    styleIf("a11y-headers", c.highlightHeaders,
      `h1,h2,h3,h4,h5,h6{border-left:4px solid #005FCC!important;padding-left:8px!important;}`);
    // Enlarge buttons
    styleIf("a11y-bigbtns", c.enlargeButtons,
      `button,[role="button"],input[type="button"],input[type="submit"]{padding:12px 24px!important;font-size:1.2em!important;}`);
    // Image descriptions
    if (c.imageDescriptions) {
      document.querySelectorAll("img[alt]").forEach(img => {
        if (!img.nextElementSibling?.classList.contains("a11y-imgdesc")) {
          const span = document.createElement("span");
          span.className = "a11y-imgdesc";
          span.style.cssText = "display:block;font-size:11px;color:#666;font-style:italic;margin-top:2px;";
          span.textContent = `[Image: ${img.alt}]`;
          img.insertAdjacentElement("afterend", span);
        }
      });
    } else {
      document.querySelectorAll(".a11y-imgdesc").forEach(el => el.remove());
    }
    // Mute media
    document.querySelectorAll("audio,video").forEach(el => {
      el.muted = c.muteMedia; if (c.muteMedia) el.volume = 0;
    });
    // Captions
    if (c.captions) {
      document.querySelectorAll("video").forEach(v => {
        if (!v.querySelector("track")) {
          const t = document.createElement("track");
          t.kind = "captions"; t.label = "Auto"; t.default = true;
          v.appendChild(t);
          if (!v.dataset.a11yCaptionNotice) {
            v.dataset.a11yCaptionNotice = "1";
            const note = document.createElement("p");
            note.style.cssText = "color:#856404;background:#FFF3CD;padding:6px;border-radius:6px;font-size:12px;";
            note.textContent = "ℹ️ Caption track not found for this video.";
            v.insertAdjacentElement("afterend", note);
          }
        }
      });
    }
  }, [settings.content]);

  // ── Magnifier ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.content.magnifier) { magRef.current?.remove(); magRef.current = null; return; }
    const glass = document.createElement("div");
    glass.className = "a11y-magnifier-glass";
    document.body.appendChild(glass);
    magRef.current = glass;
    let lastEl = null;
    const move = (e) => {
      glass.style.left = (e.clientX - 110) + "px";
      glass.style.top  = (e.clientY - 230) + "px";
      glass.style.display = "flex";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== glass && el !== lastEl) {
        lastEl = el;
        const txt = el.innerText?.trim();
        if (txt) glass.innerHTML = `<div style="transform:scale(2);transform-origin:center;white-space:normal;text-align:center;padding:8px;max-width:90px;font-size:12px;">${txt.slice(0,80)}</div>`;
      }
    };
    document.addEventListener("mousemove", move);
    return () => { document.removeEventListener("mousemove", move); glass.remove(); magRef.current = null; };
  }, [settings.content.magnifier]);

  // ── Text Magnifier (hover bubble) ─────────────────────────────────────────
  useEffect(() => {
    if (!settings.content.textMagnifier) return;
    const bubble = document.createElement("div");
    bubble.className = "a11y-textmag-bubble";
    document.body.appendChild(bubble);
    const move = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const txt = el?.innerText?.trim();
      if (txt && txt.length > 1 && txt.length < 200) {
        bubble.textContent = txt.slice(0, 120);
        bubble.style.display = "block";
        bubble.style.left = Math.min(e.clientX + 12, window.innerWidth - 280) + "px";
        bubble.style.top  = (e.clientY - 60) + "px";
      } else {
        bubble.style.display = "none";
      }
    };
    document.addEventListener("mousemove", move);
    return () => { document.removeEventListener("mousemove", move); bubble.remove(); };
  }, [settings.content.textMagnifier]);

  // ── Highlight interactive elements on hover ────────────────────────────────
  useEffect(() => {
    if (!settings.content.highlightElements) return;
    const over = (e) => {
      const el = e.target.closest("a,button,input,select,textarea,[role='button']");
      if (el) el.style.outline = "2px dashed #E53E3E";
    };
    const out  = (e) => {
      const el = e.target.closest("a,button,input,select,textarea,[role='button']");
      if (el) el.style.outline = "";
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout",  out);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout",  out);
    };
  }, [settings.content.highlightElements]);

  // ── Reading Guide (horizontal line) ───────────────────────────────────────
  useEffect(() => {
    if (!settings.content.readingGuide) { guideRef.current?.remove(); guideRef.current = null; return; }
    const line = document.createElement("div");
    line.className = "a11y-reading-guide";
    document.body.appendChild(line);
    guideRef.current = line;
    const move = (e) => { line.style.top = e.clientY + "px"; };
    document.addEventListener("mousemove", move);
    return () => { document.removeEventListener("mousemove", move); line.remove(); guideRef.current = null; };
  }, [settings.content.readingGuide]);

  // ── Dictionary (double-click word) ────────────────────────────────────────
  useEffect(() => {
    if (!settings.content.dictionary) { setDictTooltip(null); return; }
    const handler = async (e) => {
      const word = window.getSelection()?.toString().trim().replace(/[^a-zA-Z]/g,"");
      if (!word) return;
      try {
        const res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await res.json();
        const def  = data[0]?.meanings?.[0]?.definitions?.[0]?.definition || "No definition found.";
        setDictTooltip({ word, def, x: e.clientX, y: e.clientY });
      } catch { setDictTooltip({ word, def: "Could not fetch definition.", x: e.clientX, y: e.clientY }); }
    };
    document.addEventListener("dblclick", handler);
    return () => document.removeEventListener("dblclick", handler);
  }, [settings.content.dictionary]);

  // ── Read Focus (dim + highlight paragraph) ────────────────────────────────
  useEffect(() => {
    if (!settings.content.readFocus) { removeStyle("a11y-readfocus-overlay"); return; }
    injectStyle("a11y-readfocus-overlay",
      `body::after{content:'';position:fixed;inset:0;background:rgba(0,0,0,0.5);pointer-events:none;z-index:99998;}` +
      `p:hover,li:hover{position:relative;z-index:99999;background:#fffbe6!important;border-radius:4px;}`);
    return () => removeStyle("a11y-readfocus-overlay");
  }, [settings.content.readFocus]);

  // ── Page Structure builder ────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.content.pageStructure) return;
    const items = [];
    document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='main'],[role='navigation'],[role='banner'],[role='contentinfo']").forEach((el, i) => {
      const id = el.id || `a11y-struct-${i}`;
      el.id = id;
      items.push({ tag: el.tagName.toLowerCase(), text: el.innerText?.trim().slice(0,60) || el.getAttribute("role") || "—", id });
    });
    setStructureItems(items);
  }, [settings.content.pageStructure]);

  // ── Page Summary ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.content.pageSummary) { setSummaryText(""); return; }
    const paras = [...document.querySelectorAll("main p, #mainContent p, .layoutContent p")]
      .slice(0, 3).map(p => p.innerText?.trim()).filter(Boolean);
    setSummaryText(paras.join("\n\n") || "No summary available for this page.");
  }, [settings.content.pageSummary]);

  // ── Readable Mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.content.readableMode) { setReadableText(""); return; }
    const main = document.querySelector("main, #mainContent, .layoutContent");
    setReadableText(main?.innerText?.trim().slice(0, 3000) || "No readable content found.");
  }, [settings.content.readableMode]);

  // ── Turn Off all ──────────────────────────────────────────────────────────
  const turnOff = () => {
    localStorage.removeItem(LS_KEY);
    ["a11y-motor","a11y-colorblind","a11y-visual-impaired","a11y-epilepsy","a11y-adhd",
     "a11y-learning","a11y-elder","a11y-dyslexia-css","a11y-wcag","a11y-keyboardnav",
     "a11y-color-mode","a11y-custom-colors","a11y-typography","a11y-cursor","a11y-noanim",
     "a11y-readfont","a11y-links","a11y-headers","a11y-bigbtns","a11y-readfocus-overlay",
    ].forEach(removeStyle);
    document.getElementById("a11y-skip")?.remove();
    document.querySelectorAll(".a11y-imgdesc").forEach(e => e.remove());
    window.location.reload();
  };

  const toggleSection = (k) => setCollapsed(c => ({ ...c, [k]: !c[k] }));

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        className="a11y-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Accessibility settings"
        title="Accessibility settings"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true">
          <circle cx="12" cy="4.5" r="2.2"/>
          <path d="M16.5 9.5H13L11.5 7.5H8.5L7 9.5v1H9l1 6.5h1L12.5 13h2L16 16.5l1.5-.5L16.5 9.5z"/>
          <path d="M11 17.5c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.4 0 .8.1 1.2.2L9 11.5c-.6-.1-1.3-.2-2-.2C3.1 11.3 1 13.2 1 17.5S3.1 23.5 7 23.5c2.7 0 5-1.6 6.1-4H11v-2z"/>
        </svg>
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="a11y-panel" ref={panelRef} role="dialog" aria-label="Accessibility Panel">

          {/* Panel header */}
          <div className="a11y-panel-header">
            <span className="a11y-panel-title">♿ Accessibility</span>
            <button className="a11y-panel-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          {/* ══ SECTION 1: Profiles ══════════════════════════════════════════ */}
          <Section
            label="Accessibility Profiles"
            collapsed={collapsed.profiles}
            onToggle={() => toggleSection("profiles")}
          >
            <div className="a11y-profile-grid">
              {PROFILES.map(({ key, label, icon }) => (
                <ProfileToggle
                  key={key}
                  icon={icon} label={label}
                  active={settings.profiles[key]}
                  onToggle={() => tp(key)}
                />
              ))}
            </div>
          </Section>

          {/* ══ SECTION 2: Navigation ════════════════════════════════════════ */}
          <Section
            label="Navigation Adjustment"
            collapsed={collapsed.nav}
            onToggle={() => toggleSection("nav")}
          >
            {settings.nav.voiceCommands && voiceStatus && (
              <div className="a11y-voice-status">🎙️ {voiceStatus}</div>
            )}
            <div className="a11y-icon-grid">
              {NAV_FEATURES.map(({ key, label, icon }) => (
                <IconCard
                  key={key} icon={icon} label={label}
                  active={settings.nav[key]}
                  onToggle={() => tn(key)}
                />
              ))}
            </div>
          </Section>

          {/* ══ SECTION 3: Colors ════════════════════════════════════════════ */}
          <Section
            label="Color Adjustment"
            collapsed={collapsed.colors}
            onToggle={() => toggleSection("colors")}
          >
            <div className="a11y-icon-grid">
              {COLOR_MODES.map(({ key, label, icon, preview }) => (
                <IconCard
                  key={key} icon={icon} label={label}
                  active={settings.colors.mode === key}
                  preview={preview}
                  onToggle={() => scol({ mode: settings.colors.mode === key ? null : key })}
                />
              ))}
            </div>

            {/* Custom color pickers */}
            <div className="a11y-color-section">
              <div className="a11y-color-tabs">
                {[["bg","Backgrounds"],["heading","Headings"],["text","Contents"]].map(([t,l]) => (
                  <button key={t} className={`a11y-color-tab${colorTab===t?" active":""}`} onClick={() => setColorTab(t)}>{l}</button>
                ))}
              </div>
              <div className="a11y-color-picker-row">
                {colorTab === "bg"      && <ColorPicker label="Background" value={settings.colors.bgColor}      onChange={v => scol({ bgColor: v })} />}
                {colorTab === "heading" && <ColorPicker label="Headings"   value={settings.colors.headingColor} onChange={v => scol({ headingColor: v })} />}
                {colorTab === "text"    && <ColorPicker label="Contents"   value={settings.colors.textColor}    onChange={v => scol({ textColor: v })} />}
              </div>
              <button className="a11y-reset-colors" onClick={() => scol({ bgColor:"", headingColor:"", textColor:"", mode: null })}>
                ↺ Reset colors
              </button>
            </div>
          </Section>

          {/* ══ SECTION 4: Content ═══════════════════════════════════════════ */}
          <Section
            label="Content Adjustment"
            collapsed={collapsed.content}
            onToggle={() => toggleSection("content")}
          >
            {/* Font sliders */}
            <div className="a11y-font-tabs">
              {[["size","Font Size"],["line","Line Spacing"],["word","Word Spacing"],["letter","Letter Spacing"]].map(([t,l]) => (
                <button key={t} className={`a11y-font-tab${fontTab===t?" active":""}`} onClick={() => setFontTab(t)}>{l}</button>
              ))}
            </div>
            {fontTab === "size"   && <Slider label="Font Size"      value={settings.content.fontSize}      min={12} max={32} unit="px" onChange={v => sc("fontSize",v)} />}
            {fontTab === "line"   && <Slider label="Line Spacing"    value={settings.content.lineHeight}    min={1}  max={3}  step={0.1} unit="" onChange={v => sc("lineHeight",v)} />}
            {fontTab === "word"   && <Slider label="Word Spacing"    value={settings.content.wordSpacing}   min={0}  max={20} unit="px" onChange={v => sc("wordSpacing",v)} />}
            {fontTab === "letter" && <Slider label="Letter Spacing"  value={settings.content.letterSpacing} min={0}  max={10} unit="px" onChange={v => sc("letterSpacing",v)} />}

            {/* Cursor */}
            <div className="a11y-cursor-row">
              <span className="a11y-sub-label">Cursor</span>
              {[["default","Default","▶"],["large-white","Large White","▷"],["large-black","Large Black","▶"]].map(([k,l,ic]) => (
                <button key={k}
                  className={`a11y-cursor-btn${settings.content.cursor===k?" active":""}`}
                  onClick={() => sc("cursor", k)}
                  style={k==="large-black"?{color:"#000",background:"#fff"}:{}}
                >{ic} {l}</button>
              ))}
            </div>

            {/* Feature icon grid */}
            <div className="a11y-icon-grid" style={{ marginTop: 12 }}>
              {CONTENT_FEATURES.map(({ key, label, icon }) => (
                <IconCard
                  key={key} icon={icon} label={label}
                  active={settings.content[key]}
                  onToggle={() => tc(key)}
                />
              ))}
            </div>
          </Section>

          {/* ── Footer ── */}
          <div className="a11y-panel-footer">
            <button className="a11y-turnoff-btn" onClick={turnOff}>⊘ Turn Off Accessibility</button>
            <a className="a11y-statement-btn" href="/accessibility-statement" target="_blank" rel="noopener noreferrer">
              📋 Accessibility Statement
            </a>
          </div>
        </div>
      )}

      {/* ── Mousegrid overlay ── */}
      {settings.nav.mousegrid && (
        <MouseGrid onClose={() => tn("mousegrid")} />
      )}

      {/* ── Virtual Keyboard ── */}
      {settings.content.virtualKeyboard && (
        <VirtualKeyboard onClose={() => tc("virtualKeyboard")} />
      )}

      {/* ── Page Structure drawer ── */}
      {settings.content.pageStructure && structureItems.length > 0 && (
        <PageStructureDrawer items={structureItems} onClose={() => tc("pageStructure")} />
      )}

      {/* ── Readable Mode overlay ── */}
      {settings.content.readableMode && readableText && (
        <ReadableModeOverlay text={readableText} onClose={() => tc("readableMode")} />
      )}

      {/* ── Page Summary modal ── */}
      {settings.content.pageSummary && summaryText && (
        <PageSummaryModal text={summaryText} onClose={() => tc("pageSummary")} />
      )}

      {/* ── Dictionary tooltip ── */}
      {dictTooltip && (
        <div className="a11y-dict-tooltip" style={{ left: dictTooltip.x + 10, top: dictTooltip.y - 60 }}>
          <strong>{dictTooltip.word}</strong>
          <p>{dictTooltip.def}</p>
          <button onClick={() => setDictTooltip(null)}>✕</button>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({ label, collapsed, onToggle, children }) {
  return (
    <div className="a11y-section">
      <button className="a11y-section-header" onClick={onToggle} aria-expanded={!collapsed}>
        <span>{label}</span>
        <span className="a11y-section-toggle">{collapsed ? "+" : "−"}</span>
      </button>
      {!collapsed && <div className="a11y-section-body">{children}</div>}
    </div>
  );
}

function ProfileToggle({ icon, label, active, onToggle }) {
  return (
    <button className={`a11y-profile-toggle${active ? " active" : ""}`} onClick={onToggle}>
      <span className="a11y-profile-icon">{icon}</span>
      <span className="a11y-profile-label">{label}</span>
      <span className={`a11y-pill${active ? " on" : ""}`}>{active ? "ON" : "OFF"}</span>
    </button>
  );
}

function IconCard({ icon, label, active, onToggle, preview }) {
  return (
    <button
      className={`a11y-icon-card${active ? " active" : ""}`}
      onClick={onToggle}
      style={preview ? { background: preview } : undefined}
      title={label}
    >
      <span className="a11y-card-icon">{icon}</span>
      <span className="a11y-card-label">{label}</span>
    </button>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange }) {
  return (
    <div className="a11y-slider-wrap">
      <div className="a11y-slider-head">
        <span>{label}</span>
        <span className="a11y-slider-val">{value}{unit}</span>
      </div>
      <div className="a11y-slider-controls">
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}>−</button>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}>+</button>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="a11y-color-pick">
      <label>{label}</label>
      <input type="color" value={value || "#ffffff"} onChange={e => onChange(e.target.value)} />
      {value && <button onClick={() => onChange("")}>✕</button>}
    </div>
  );
}

function MouseGrid({ onClose }) {
  const cells = [1,2,3,4,5,6,7,8,9];
  const click = (i) => {
    const col = (i - 1) % 3;
    const row = Math.floor((i - 1) / 3);
    const x = (window.innerWidth  / 3) * col + window.innerWidth  / 6;
    const y = (window.innerHeight / 3) * row + window.innerHeight / 6;
    const el = document.elementFromPoint(x, y);
    el?.click?.();
    onClose();
  };
  return (
    <div className="a11y-mousegrid" onClick={onClose}>
      {cells.map(i => (
        <button key={i} className="a11y-mousegrid-cell" onClick={e => { e.stopPropagation(); click(i); }}>
          {i}
        </button>
      ))}
      <div className="a11y-mousegrid-hint">Click a cell or press Esc to close</div>
    </div>
  );
}

const QWERTY = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
];
function VirtualKeyboard({ onClose }) {
  const press = (key) => {
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;
      el.value = el.value.slice(0, start) + key + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start + key.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  return (
    <div className="a11y-vkb">
      <div className="a11y-vkb-header">
        <span>Virtual Keyboard</span>
        <button onClick={onClose}>✕</button>
      </div>
      {QWERTY.map((row, ri) => (
        <div key={ri} className="a11y-vkb-row">
          {row.map(k => <button key={k} className="a11y-vkb-key" onClick={() => press(k)}>{k}</button>)}
          {ri === 2 && <>
            <button className="a11y-vkb-key wide" onClick={() => press(" ")}>Space</button>
            <button className="a11y-vkb-key wide" onClick={() => {
              const el = document.activeElement;
              if (el) { el.value = el.value.slice(0,-1); el.dispatchEvent(new Event("input",{bubbles:true})); }
            }}>⌫</button>
          </>}
        </div>
      ))}
      <div className="a11y-vkb-row">
        {["1","2","3","4","5","6","7","8","9","0",".",",","!","?"].map(k =>
          <button key={k} className="a11y-vkb-key" onClick={() => press(k)}>{k}</button>
        )}
      </div>
    </div>
  );
}

function PageStructureDrawer({ items, onClose }) {
  return (
    <div className="a11y-structure-drawer">
      <div className="a11y-structure-header">
        <span>📑 Page Structure</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="a11y-structure-list">
        {items.map(({ tag, text, id }) => (
          <button key={id} className={`a11y-struct-item a11y-struct-${tag}`}
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}>
            <span className="a11y-struct-tag">{tag.toUpperCase()}</span>
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadableModeOverlay({ text, onClose }) {
  return (
    <div className="a11y-readable-overlay">
      <div className="a11y-readable-inner">
        <button className="a11y-readable-close" onClick={onClose}>✕ Close</button>
        <h2>Readable Mode</h2>
        <div className="a11y-readable-text">{text}</div>
      </div>
    </div>
  );
}

function PageSummaryModal({ text, onClose }) {
  return (
    <div className="a11y-modal-overlay" onClick={onClose}>
      <div className="a11y-modal" onClick={e => e.stopPropagation()}>
        <div className="a11y-modal-header">
          <span>📄 Page Summary</span>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="a11y-modal-text">{text}</p>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROFILES = [
  { key: "blindness",       icon: "👁️",  label: "Blindness"          },
  { key: "motorSkills",     icon: "🖐️",  label: "Motor Skills"       },
  { key: "colorBlindness",  icon: "🎨",  label: "Color Blindness"    },
  { key: "visuallyImpaired",icon: "🔍",  label: "Visually Impaired"  },
  { key: "epilepsy",        icon: "⚡",  label: "Epilepsy"            },
  { key: "adhd",            icon: "🧠",  label: "ADHD"               },
  { key: "learning",        icon: "📖",  label: "Learning"           },
  { key: "elder",           icon: "👴",  label: "Elder"              },
  { key: "dyslexia",        icon: "📝",  label: "Dyslexia"           },
  { key: "wcag",            icon: "✅",  label: "WCAG Compliant"     },
];

const NAV_FEATURES = [
  { key: "screenReader",  icon: "📣", label: "Screen Reader" },
  { key: "keyboardNav",   icon: "⌨️", label: "Keyboard Nav"  },
  { key: "mousegrid",     icon: "🔢", label: "Mousegrid"     },
  { key: "smartNav",      icon: "🧭", label: "Smart Nav"     },
  { key: "textReader",    icon: "🔊", label: "Text Reader"   },
  { key: "voiceCommands", icon: "🎙️", label: "Voice Cmds"   },
];

const COLOR_MODES = [
  { key: "monochrome",    icon: "⬛", label: "Monochrome",       preview: "linear-gradient(135deg,#555,#ccc)" },
  { key: "darkContrast",  icon: "🌑", label: "Dark Contrast",    preview: "#000" },
  { key: "brightContrast",icon: "⬜", label: "Bright Contrast",  preview: "#fff" },
  { key: "lowSat",        icon: "🎞️", label: "Low Saturation",   preview: "linear-gradient(135deg,#aaa,#ddd)" },
  { key: "highSat",       icon: "🌈", label: "High Saturation",  preview: "linear-gradient(135deg,#f00,#0f0,#00f)" },
  { key: "contrastMode",  icon: "🔆", label: "Contrast Mode",    preview: "linear-gradient(135deg,#000,#fff)" },
];

const CONTENT_FEATURES = [
  { key: "blinksBlocking",   icon: "🚫", label: "Block Blinks"      },
  { key: "captions",         icon: "💬", label: "Captions"          },
  { key: "magnifier",        icon: "🔎", label: "Magnifier"         },
  { key: "readableFont",     icon: "🔤", label: "Readable Font"     },
  { key: "imageDescriptions",icon: "🖼️", label: "Image Desc"       },
  { key: "highlightLinks",   icon: "🔗", label: "Highlight Links"   },
  { key: "highlightHeaders", icon: "📌", label: "Highlight Headers" },
  { key: "highlightElements",icon: "✳️", label: "Highlight Elems"  },
  { key: "enlargeButtons",   icon: "🔳", label: "Enlarge Buttons"   },
  { key: "readableMode",     icon: "📄", label: "Readable Mode"     },
  { key: "textMagnifier",    icon: "🔡", label: "Text Magnifier"    },
  { key: "pageStructure",    icon: "🗂️", label: "Page Structure"   },
  { key: "muteMedia",        icon: "🔇", label: "Mute Media"        },
  { key: "pageSummary",      icon: "📋", label: "Page Summary"      },
  { key: "readFocus",        icon: "👁", label: "Read Focus"        },
  { key: "readingGuide",     icon: "📏", label: "Reading Guide"     },
  { key: "dictionary",       icon: "📚", label: "Dictionary"        },
  { key: "virtualKeyboard",  icon: "🖥️", label: "Virtual Keyboard" },
];
