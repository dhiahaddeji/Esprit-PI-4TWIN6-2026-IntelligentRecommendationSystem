// src/pages/hr/HRChat.jsx
import { useState, useRef, useEffect } from "react";
import http from "../../api/http";

const SUGGESTIONS = [
  "Top 5 employés pour une formation en Intelligence Artificielle",
  "Top 3 employés pour une formation en leadership",
  "Top 5 pour une formation Python et data science",
  "Qui est disponible pour une formation en communication ?",
  "Top 10 employés pour une activité en management",
];

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: "10px",
      marginBottom: "16px",
      alignItems: "flex-start",
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "14px",
        background: isUser ? "linear-gradient(135deg,#3b6fd4,#2d58b0)" : "linear-gradient(135deg,#f47c20,#d96a10)",
        color: "#fff",
      }}>
        {isUser ? "RH" : "IA"}
      </div>

      <div style={{ maxWidth: "70%" }}>
        <div style={{
          padding: "12px 16px",
          borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
          background: isUser ? "linear-gradient(135deg,#3b6fd4,#2d58b0)" : "#fff",
          color: isUser ? "#fff" : "#1a2340",
          fontSize: "14px",
          lineHeight: "1.6",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          border: isUser ? "none" : "1px solid #dde3f0",
          whiteSpace: "pre-wrap",
        }}>
          {formatMessage(msg.content)}
        </div>

        {/* Employee cards if present */}
        {msg.employees && msg.employees.length > 0 && (
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {msg.employees.map((emp, i) => (
              <div key={emp.employee_id || i} style={{
                background: "var(--surface)", borderRadius: "12px", padding: "12px 16px",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 8px rgba(59,111,212,0.07)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "14px" }}>
                    #{i + 1} {emp.name}
                  </div>
                  {emp.score !== undefined && (
                    <span style={{
                      padding: "2px 10px", borderRadius: "999px",
                      background: "#eff6ff", color: "#3b6fd4",
                      fontWeight: 700, fontSize: "12px",
                    }}>
                      Score: {emp.score}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                  {[...(emp.savoir || []), ...(emp.savoir_faire || []), ...(emp.savoir_etre || [])]
                    .slice(0, 5)
                    .map(skill => (
                      <span key={skill} style={{
                        padding: "2px 8px", borderRadius: "999px",
                        background: "var(--surface-2)", color: "#3d4f7c",
                        fontSize: "11.5px", fontWeight: 600,
                        border: "1px solid var(--border)",
                      }}>{skill}</span>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: "11px", color: "#aab4c3", marginTop: "4px", textAlign: isUser ? "right" : "left" }}>
          {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function formatMessage(content) {
  // Convert **bold** to styled spans
  return content.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j}>{part}</strong>
            : part
        )}
        {"\n"}
      </span>
    );
  });
}

export default function HRChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'Assistant RH IA 🤖\n\nJe peux vous aider à identifier les meilleurs employés pour vos formations et activités, en me basant sur leurs compétences enregistrées.\n\nEssayez : \"Top 5 pour une formation en Intelligence Artificielle\"",
      timestamp: Date.now(),
      employees: [],
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMsg, timestamp: Date.now() }]);
    setLoading(true);

    try {
      const res = await http.post("/ai/chat", { message: userMsg });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.reply || "Désolé, je n'ai pas pu générer une réponse.",
        employees: res.data.employees || [],
        timestamp: Date.now(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Erreur de connexion. Vérifiez que le backend est démarré et réessayez.",
        timestamp: Date.now(),
        employees: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "calc(100vh - 70px)",
      display: "flex",
      flexDirection: "column",
      maxWidth: "900px",
      margin: "0 auto",
      padding: "0 24px 24px",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: "1px solid var(--border)", marginBottom: "16px", flexShrink: 0 }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: 800, color: "var(--text-1)" }}>
          🤖 Assistant RH IA
        </h1>
        <p style={{ margin: 0, color: "var(--text-2)", fontSize: "13.5px" }}>
          Recommandations d'employés basées sur leurs compétences (savoir, savoir-faire, savoir-être)
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        paddingRight: "4px",
        scrollbarWidth: "thin",
      }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg,#f47c20,#d96a10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "14px",
            }}>IA</div>
            <div style={{
              padding: "12px 16px", borderRadius: "4px 16px 16px 16px",
              background: "var(--surface)", border: "1px solid var(--border)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              color: "var(--text-2)", fontSize: "14px",
            }}>
              <span style={{ animation: "pulse 1.4s ease-in-out infinite" }}>Analyse en cours…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ flexShrink: 0, marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", marginBottom: "8px" }}>
            Suggestions :
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
                background: "#eff6ff", color: "#3b6fd4", border: "1px solid #bfdbfe",
                fontSize: "12.5px", fontWeight: 600, transition: "background 0.15s",
              }}
                onMouseEnter={e => e.target.style.background = "#dbeafe"}
                onMouseLeave={e => e.target.style.background = "#eff6ff"}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        flexShrink: 0,
        display: "flex",
        gap: "10px",
        padding: "12px",
        background: "var(--surface)",
        borderRadius: "16px",
        border: "1.5px solid var(--border)",
        boxShadow: "0 4px 20px rgba(59,111,212,0.08)",
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ex: Top 5 pour une formation en Intelligence Artificielle…"
          disabled={loading}
          style={{
            flex: 1, border: "none", outline: "none",
            background: "transparent", fontSize: "14px", color: "var(--text-1)",
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            padding: "9px 20px", borderRadius: "10px",
            background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
            color: "#fff", border: "none", fontWeight: 700,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
            fontSize: "14px", flexShrink: 0,
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
