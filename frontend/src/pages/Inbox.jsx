// src/pages/Inbox.jsx
// Shared inbox for ALL roles: HR, Manager, Employee, SuperAdmin
import { useEffect, useRef, useState, useCallback } from "react";
import http from "../api/http";
import { getStoredUser } from "../auth/authService";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  HR:         { bg: "#dbeafe", color: "#1e40af", label: "RH" },
  MANAGER:    { bg: "#d1fae5", color: "#065f46", label: "Manager" },
  EMPLOYEE:   { bg: "#f3f4f6", color: "#374151", label: "Employé" },
  SUPERADMIN: { bg: "#ede9fe", color: "#5b21b6", label: "Admin" },
};

const CONV_ICONS = { dm: "💬", group: "👥", announcement: "📢" };
const CONV_LABELS = { dm: "Message direct", group: "Groupe", announcement: "Annonce" };

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d   = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Avatar({ name, size = 36, role }) {
  const meta = ROLE_COLORS[role] || { bg: "#e2e8f0", color: "var(--text-2)" };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: meta.bg, color: meta.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36,
    }}>{initials(name)}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Conversation Modal
// ─────────────────────────────────────────────────────────────────────────────

function NewConvModal({ me, users, onClose, onCreate }) {
  const [type,     setType]     = useState("dm");
  const [name,     setName]     = useState("");
  const [selected, setSelected] = useState([]);
  const [search,   setSearch]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const canAnnounce = ["HR", "MANAGER", "SUPERADMIN"].includes(me.role);

  const filtered = users.filter(u =>
    u._id !== me.id &&
    ((u.name || "").toLowerCase().includes(search.toLowerCase()) ||
     (u.email || "").toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (userId) => {
    if (type === "dm") {
      setSelected([userId]);
    } else {
      setSelected(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleCreate = async () => {
    if (type === "dm" && selected.length !== 1) { setError("Choisissez 1 destinataire."); return; }
    if (type !== "dm" && !name.trim()) { setError("Donnez un nom au groupe."); return; }
    if (selected.length === 0) { setError("Ajoutez au moins un participant."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await http.post("/messaging/conversations", {
        type, name: name.trim(), participants: selected,
      });
      onCreate(res.data);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 20, padding: "28px 32px",
        width: 480, maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>
          ✉️ Nouvelle conversation
        </h2>

        {/* Type selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { v: "dm",           label: "💬 Direct" },
            { v: "group",        label: "👥 Groupe" },
            ...(canAnnounce ? [{ v: "announcement", label: "📢 Annonce" }] : []),
          ].map(t => (
            <button key={t.v} onClick={() => { setType(t.v); setSelected([]); }} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, border: "none",
              background: type === t.v ? "#0b2b4b" : "#f1f5f9",
              color: type === t.v ? "#fff" : "#64748b",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Description box */}
        {type === "announcement" && (
          <div style={{
            marginBottom: 12, padding: "10px 14px", borderRadius: 10,
            background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12.5, color: "#92400e",
          }}>
            📢 <strong>Mode Annonce</strong> — les destinataires <strong>ne pourront pas répondre</strong>. Idéal pour informer vos équipes.
          </div>
        )}

        {/* Group / Announcement name */}
        {type !== "dm" && (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={type === "group" ? "Nom du groupe…" : "Titre de l'annonce…"}
            style={{
              marginBottom: 12, padding: "9px 13px", borderRadius: 9,
              border: "1.5px solid var(--input-border)", fontSize: 13.5,
              outline: "none", color: "var(--text-1)", background: "var(--input-bg)",
            }}
          />
        )}

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur…"
          style={{
            marginBottom: 8, padding: "8px 12px", borderRadius: 9,
            border: "1.5px solid var(--input-border)", fontSize: 13,
            outline: "none", color: "var(--text-1)", background: "var(--surface-2)",
          }}
        />

        {/* Users list */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 12, maxHeight: 240 }}>
          {filtered.map(u => {
            const isSelected = selected.includes(u._id);
            const meta       = ROLE_COLORS[u.role] || ROLE_COLORS.EMPLOYEE;
            return (
              <div
                key={u._id}
                onClick={() => toggle(u._id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4,
                  background: isSelected ? "#eff6ff" : "#fff",
                  border: `1.5px solid ${isSelected ? "#3b6fd4" : "#f1f5f9"}`,
                  transition: "all 0.12s",
                }}
              >
                <Avatar name={u.name} size={34} role={u.role} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{u.email}</div>
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 999, background: meta.bg, color: meta.color,
                }}>{meta.label}</span>
                {isSelected && <span style={{ color: "#3b6fd4", fontSize: 16, fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-3)", padding: 20, fontSize: 13 }}>
              Aucun utilisateur trouvé
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "#fffbfa", border: "1px solid #fecdca", color: "#b42318", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCreate} disabled={saving} style={{
            flex: 2, padding: "10px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
            color: "#fff", fontWeight: 800, fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Création…" : "Créer"}</button>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--surface-2)",
            color: "var(--text-2)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation list item
// ─────────────────────────────────────────────────────────────────────────────

function ConvItem({ conv, isActive, me, onClick }) {
  const displayName = conv.name ||
    (conv.type === "dm"
      ? "Message direct"
      : conv.type === "group" ? "Groupe" : "Annonce");
  const icon  = CONV_ICONS[conv.type] || "💬";
  const unread = conv.unread ?? 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        padding: "12px 16px", cursor: "pointer", borderRadius: 12,
        background: isActive ? "#eff6ff" : "transparent",
        border: isActive ? "1px solid #bfdbfe" : "1px solid transparent",
        marginBottom: 4, transition: "all 0.12s",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
        background: conv.type === "announcement"
          ? "#fffbeb"
          : conv.type === "group"
          ? "#f0fdf4"
          : "#f0f4ff",
        border: `2px solid ${conv.type === "announcement" ? "#fde68a" : conv.type === "group" ? "#bbf7d0" : "#c7d2fe"}`,
      }}>{icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontWeight: unread > 0 ? 800 : 600, fontSize: 14,
            color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{displayName}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, marginLeft: 6 }}>
            {timeAgo(conv.lastMessageAt)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <span style={{
            fontSize: 12, color: "var(--text-3)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontWeight: unread > 0 ? 600 : 400,
          }}>
            {conv.lastMessagePreview || "Pas encore de message"}
          </span>
          {unread > 0 && (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 999,
              background: "#3b6fd4", color: "#fff",
              fontSize: 11, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 5px", flexShrink: 0, marginLeft: 6,
            }}>{unread > 99 ? "99+" : unread}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }) {
  const meta = ROLE_COLORS[msg.senderRole] || ROLE_COLORS.EMPLOYEE;
  const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      display: "flex",
      flexDirection: isMe ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8, marginBottom: 12,
    }}>
      {!isMe && (
        <div style={{ flexShrink: 0, marginBottom: 2 }}>
          <Avatar name={msg.senderName} size={30} role={msg.senderRole} />
        </div>
      )}
      <div style={{ maxWidth: "68%" }}>
        {!isMe && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)" }}>{msg.senderName}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
              background: meta.bg, color: meta.color,
            }}>{meta.label}</span>
          </div>
        )}
        <div style={{
          padding: "10px 14px",
          borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
          background: isMe
            ? "linear-gradient(135deg,#0b2b4b,#1e3a5f)"
            : "#fff",
          color: isMe ? "#fff" : "#1a2340",
          fontSize: 14, lineHeight: 1.55,
          boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          border: isMe ? "none" : "1px solid #e8ecf4",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, textAlign: isMe ? "right" : "left" }}>
          {time}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Announcement card (replaces MessageBubble for announcements)
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementCard({ msg, isFirst }) {
  const meta = ROLE_COLORS[msg.senderRole] || ROLE_COLORS.EMPLOYEE;
  const date = new Date(msg.createdAt);
  const dateStr = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Sender banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px",
        background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
        borderBottom: "1px solid #fde68a",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: meta.bg, color: meta.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 16,
          border: `2px solid ${meta.color}30`,
        }}>{initials(msg.senderName)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)" }}>
              {msg.senderName}
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "2px 8px",
              borderRadius: 999, background: meta.bg, color: meta.color,
              border: `1px solid ${meta.color}30`,
            }}>{meta.label}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 2 }}>
            📅 {dateStr} à {timeStr}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, padding: "4px 10px",
          borderRadius: 999, background: "#92400e", color: "#fff",
          letterSpacing: "0.5px",
        }}>ANNONCE</div>
      </div>

      {/* Content */}
      <div style={{
        padding: "18px 20px",
        fontSize: 14.5, lineHeight: 1.7, color: "#1e293b",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Announcement view (dedicated interface for type=announcement)
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementView({ conv, me, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const pollRef = useRef(null);

  const myId     = me?.id || me?.userId;
  const canWrite = (conv.allowedSenders || []).includes(myId);

  const loadMessages = useCallback(async () => {
    try {
      const res = await http.get(`/messaging/conversations/${conv._id}/messages`);
      setMessages(res.data.messages || []);
    } finally {
      setLoading(false);
    }
  }, [conv._id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
    http.post(`/messaging/conversations/${conv._id}/read`).catch(() => {});
  }, [conv._id]);

  useEffect(() => {
    pollRef.current = setInterval(loadMessages, 6000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  const publish = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await http.post(`/messaging/conversations/${conv._id}/messages`, { content: text });
      await loadMessages();
      onNewMessage();
    } finally {
      setSending(false);
    }
  };

  const title         = conv.name || "Annonce";
  const recipientCount = (conv.participants?.length || 1) - 1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#f4f6fb" }}>

      {/* ── Top banner ── */}
      <div style={{
        padding: "20px 28px",
        background: "linear-gradient(135deg,#78350f,#b45309)",
        color: "#fff", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, flexShrink: 0,
          }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>{title}</div>
            <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 3 }}>
              Canal d'annonces officiel · {recipientCount} destinataire{recipientCount !== 1 ? "s" : ""}
            </div>
          </div>
          {canWrite ? (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "5px 12px",
              borderRadius: 999, background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)", letterSpacing: "0.5px",
            }}>✏️ Éditeur</span>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "5px 12px",
              borderRadius: 999, background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.2)", letterSpacing: "0.5px",
            }}>👁️ Lecture seule</span>
          )}
        </div>
      </div>

      {/* ── Publisher form (editors only) ── */}
      {canWrite && (
        <div style={{
          margin: "16px 24px 0",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          flexShrink: 0,
        }}>
          <div style={{
            padding: "11px 16px",
            background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
            borderBottom: "1px solid #fde68a",
            fontSize: 12.5, fontWeight: 700, color: "#92400e",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>✍️</span> Publier une nouvelle annonce
          </div>
          <div style={{ padding: "12px 16px" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Rédigez votre annonce ici… Elle sera visible par tous les destinataires."
              disabled={sending}
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1.5px solid var(--border)", fontSize: 14, resize: "vertical",
                outline: "none", color: "var(--text-1)", background: "var(--input-bg)",
                lineHeight: 1.6, boxSizing: "border-box", minHeight: 80,
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={publish}
                disabled={sending || !input.trim()}
                style={{
                  padding: "9px 20px", borderRadius: 10, border: "none",
                  background: sending || !input.trim()
                    ? "#cbd5e1"
                    : "linear-gradient(135deg,#b45309,#78350f)",
                  color: "#fff", fontWeight: 700, fontSize: 13.5,
                  cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                }}
              >
                {sending ? "Publication…" : "📢 Publier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Announcements list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
        {loading ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: "60px 20px",
            color: "var(--text-3)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>Chargement des annonces…</div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "60px 20px", textAlign: "center",
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", marginBottom: 20,
              background: "linear-gradient(135deg,#fef3c7,#fde68a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 38, boxShadow: "0 4px 20px rgba(180,83,9,0.15)",
            }}>📭</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text-1)", marginBottom: 8 }}>
              Aucune annonce publiée
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-2)", maxWidth: 300, lineHeight: 1.6 }}>
              {canWrite
                ? "Utilisez le formulaire ci-dessus pour rédiger et publier votre première annonce."
                : "Les annonces apparaîtront ici dès qu'un responsable en publiera une."}
            </div>
            {!canWrite && (
              <div style={{
                marginTop: 24, padding: "12px 20px", borderRadius: 12,
                background: "#fffbeb", border: "1px solid #fde68a",
                fontSize: 12.5, color: "#92400e", fontWeight: 600,
              }}>
                🔔 Vous serez notifié lorsqu'une annonce sera publiée
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Pin / latest badge */}
            <div style={{
              fontSize: 12, fontWeight: 600, color: "var(--text-3)",
              marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ flex: 1, height: 1, background: "#e8ecf4" }} />
              {messages.length} annonce{messages.length !== 1 ? "s" : ""}
              <div style={{ flex: 1, height: 1, background: "#e8ecf4" }} />
            </div>
            {[...messages].reverse().map((msg, i) => (
              <AnnouncementCard key={msg._id} msg={msg} isFirst={i === 0} />
            ))}
          </>
        )}
      </div>

      {/* ── Read-only footer for recipients ── */}
      {!canWrite && (
        <div style={{
          padding: "11px 24px",
          background: "#fffbeb",
          borderTop: "1px solid #fde68a",
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12.5, color: "#92400e", fontWeight: 600,
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          Ce canal est réservé aux annonces officielles — les réponses ne sont pas autorisées.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message thread router — dispatches to ChatThread or AnnouncementView
// ─────────────────────────────────────────────────────────────────────────────

function Thread({ conv, me, onNewMessage }) {
  if (conv.type === "announcement") {
    return <AnnouncementView conv={conv} me={me} onNewMessage={onNewMessage} />;
  }
  return <ChatThread conv={conv} me={me} onNewMessage={onNewMessage} />;
}

function ChatThread({ conv, me, onNewMessage }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await http.get(`/messaging/conversations/${conv._id}/messages`);
      setMessages(res.data.messages || []);
    } finally {
      setLoading(false);
    }
  }, [conv._id]);

  // Mark as read + load messages when conversation changes
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
    http.post(`/messaging/conversations/${conv._id}/read`).catch(() => {});
  }, [conv._id]);

  // Poll for new messages every 4s
  useEffect(() => {
    pollRef.current = setInterval(loadMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await http.post(`/messaging/conversations/${conv._id}/messages`, { content: text });
      await loadMessages();
      onNewMessage();
    } finally {
      setSending(false);
    }
  };

  const convName    = conv.name || CONV_LABELS[conv.type] || "Conversation";
  const membersText = `${conv.participants?.length || 0} participant${(conv.participants?.length || 0) !== 1 ? "s" : ""}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Thread header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid var(--border)",
        background: "var(--surface)", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 22 }}>{CONV_ICONS[conv.type]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1)" }}>{convName}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{membersText}</div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px 20px 8px",
        background: "var(--surface-2)",
      }}>
        {loading && (
          <div style={{ textAlign: "center", color: "var(--text-3)", padding: 40 }}>Chargement…</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", color: "var(--text-3)", textAlign: "center", padding: 40,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", marginBottom: 14,
              background: "#f0f4ff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              {conv.type === "group" ? "👥" : "💬"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-1)", marginBottom: 6 }}>
              {conv.type === "group" ? "Groupe créé" : "Nouvelle conversation"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Envoyez le premier message pour lancer la discussion.
            </div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg._id}
            msg={msg}
            isMe={msg.senderId === (me.id || me.userId)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px", background: "var(--surface)",
        borderTop: "1px solid var(--border)", flexShrink: 0,
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Écrire un message… (Entrée pour envoyer)"
          disabled={sending}
          rows={1}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 12,
            border: "1.5px solid var(--input-border)", fontSize: 14, resize: "none",
            outline: "none", color: "var(--text-1)", background: "var(--input-bg)",
            lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            width: 42, height: 42, borderRadius: "50%", border: "none",
            background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
            color: "#fff", fontSize: 18, display: "flex",
            alignItems: "center", justifyContent: "center",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            opacity: sending || !input.trim() ? 0.5 : 1, flexShrink: 0,
          }}
        >↑</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Inbox page
// ─────────────────────────────────────────────────────────────────────────────

export default function Inbox() {
  const me = getStoredUser();

  const [conversations,  setConversations]  = useState([]);
  const [activeConv,     setActiveConv]     = useState(null);
  const [users,          setUsers]          = useState([]);
  const [showNew,        setShowNew]        = useState(false);
  const [filter,         setFilter]         = useState("all"); // all | dm | group | announcement
  const [search,         setSearch]         = useState("");
  const [loadingConvs,   setLoadingConvs]   = useState(true);
  const pollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await http.get("/messaging/conversations");
      setConversations(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    http.get("/messaging/users").then(r => setUsers(Array.isArray(r.data) ? r.data : []));
  }, []);

  // Poll conversations every 5s for unread counts / new convs
  useEffect(() => {
    pollRef.current = setInterval(loadConversations, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadConversations]);

  const filtered = conversations.filter(c => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(c.name || "").toLowerCase().includes(q) &&
          !(c.lastMessagePreview || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalUnread = conversations.reduce((s, c) => s + (c.unread ?? 0), 0);

  const handleConvCreated = (newConv) => {
    setConversations(prev => [newConv, ...prev]);
    setActiveConv(newConv);
  };

  const canAnnounce = ["HR", "MANAGER", "SUPERADMIN"].includes(me?.role);

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 60px)",
      background: "var(--bg)", overflow: "hidden",
    }}>

      {/* ── LEFT: Sidebar ─────────────────────────────────────────── */}
      <div style={{
        width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "var(--surface)", borderRight: "1px solid var(--border)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>
                Messagerie
                {totalUnread > 0 && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 800,
                    padding: "2px 7px", borderRadius: 999,
                    background: "#ef4444", color: "#fff",
                  }}>{totalUnread}</span>
                )}
              </h1>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                {ROLE_COLORS[me?.role]?.label || me?.role}
              </div>
            </div>
            <button
              onClick={() => setShowNew(true)}
              title="Nouvelle conversation"
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
                color: "#fff", fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >+</button>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 10,
              border: "1.5px solid var(--border)", fontSize: 13,
              outline: "none", color: "var(--text-1)", background: "var(--surface-2)",
              boxSizing: "border-box",
            }}
          />

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
            {[
              { val: "all",          label: "Tout" },
              { val: "dm",           label: "💬 DM" },
              { val: "group",        label: "👥 Groupes" },
              ...(canAnnounce ? [{ val: "announcement", label: "📢 Annonces" }] : []),
            ].map(t => (
              <button key={t.val} onClick={() => setFilter(t.val)} style={{
                flex: 1, padding: "5px 4px", borderRadius: 8, border: "none",
                background: filter === t.val ? "#0b2b4b" : "#f1f5f9",
                color: filter === t.val ? "#fff" : "#64748b",
                fontSize: 11.5, fontWeight: 600, cursor: "pointer",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {loadingConvs ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Aucune conversation</div>
              <div style={{ fontSize: 12 }}>Créez une nouvelle conversation avec le bouton +</div>
            </div>
          ) : (
            filtered.map(c => (
              <ConvItem
                key={c._id}
                conv={c}
                me={me}
                isActive={activeConv?._id === c._id}
                onClick={() => setActiveConv(c)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Thread ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {activeConv ? (
          <Thread
            key={activeConv._id}
            conv={activeConv}
            me={me}
            onNewMessage={loadConversations}
          />
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "var(--surface-2)", color: "var(--text-3)",
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text-1)", marginBottom: 8 }}>
              Bienvenue dans la messagerie
            </div>
            <div style={{ fontSize: 14, marginBottom: 24, textAlign: "center", maxWidth: 340 }}>
              Sélectionnez une conversation ou créez-en une nouvelle pour commencer.
            </div>
            <button
              onClick={() => setShowNew(true)}
              style={{
                padding: "11px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >+ Nouvelle conversation</button>

            {/* Quick tips */}
            <div style={{
              marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
            }}>
              {[
                { icon: "💬", title: "Messages directs", desc: "Conversation privée 1-à-1" },
                { icon: "👥", title: "Groupes", desc: "Discussez à plusieurs en temps réel" },
                ...(canAnnounce ? [{ icon: "📢", title: "Annonces", desc: "Informez sans permettre de réponse" }] : []),
              ].map(tip => (
                <div key={tip.title} style={{
                  padding: "14px 18px", background: "var(--surface)", borderRadius: 14,
                  border: "1px solid var(--border)", textAlign: "center", width: 150,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{tip.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)", marginBottom: 4 }}>{tip.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{tip.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── New Conversation Modal ─────────────────────────────────── */}
      {showNew && (
        <NewConvModal
          me={me}
          users={users}
          onClose={() => setShowNew(false)}
          onCreate={handleConvCreated}
        />
      )}
    </div>
  );
}
