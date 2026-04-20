import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const NotificationsContext = createContext(null);

// ── Icon / color per notification type ───────────────────────────────────────
export const NOTIF_META = {
  skill_submitted:     { icon: "📋", color: "#1D7A91", label: "Compétences" },
  skill_validated:     { icon: "✅", color: "#145C2B", label: "Compétences" },
  skill_rejected:      { icon: "⚠️", color: "#8B1A1A", label: "Compétences" },
  cv_import:           { icon: "📄", color: "#C9952A", label: "CV" },
  new_message:         { icon: "💬", color: "#1D7A91", label: "Message" },
  activity_invitation: { icon: "🎯", color: "#1D7A91", label: "Activité" },
  activity_response:   { icon: "📩", color: "#145C2B", label: "Activité" },
  activity_refused:    { icon: "🚫", color: "#8B1A1A", label: "Refus" },
  list_refused:        { icon: "⚠️", color: "#7A4A00", label: "Regénération" },
};

function getToken() { return localStorage.getItem("access_token"); }
function getHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]               = useState(0);
  const [toasts, setToasts]               = useState([]);
  const socketRef   = useRef(null);
  const lastTokenRef = useRef(null);

  // ── Load notifications from REST ──────────────────────────────────────
  const loadNotifications = () => {
    const token = getToken();
    if (!token) return;               // no token → skip silently
    fetch(`${API}/notifications`, { headers: getHeaders() })
      .then((r) => {
        if (r.status === 401) {
          // Token expired / invalid — purge it so tick() cleans up
          localStorage.removeItem("access_token");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (!data) return;
        setNotifications(data.items || []);
        setUnread(data.unread  || 0);
      })
      .catch(() => {});
  };

  // ── Create a Socket.IO connection ─────────────────────────────────────
  const openSocket = (token) => {
    // Tear down any existing socket first
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(API, {
      auth:                 { token },
      transports:           ["websocket", "polling"],
      reconnection:         true,
      reconnectionAttempts: 15,
      reconnectionDelay:    2000,
    });

    socket.on("connect", () => {
      // Reload notifications when socket reconnects (may have missed some)
      loadNotifications();
    });

    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 40));
      setUnread((u) => u + 1);
      addToast(notif);
    });

    // Silently ignore connection errors — socket will retry automatically
    socket.on("connect_error", () => {});

    socketRef.current = socket;
  };

  // ── Watch for auth changes every 2s and reconnect as needed ──────────
  useEffect(() => {
    const tick = () => {
      const token = getToken();

      // Token appeared (login)
      if (token && token !== lastTokenRef.current) {
        lastTokenRef.current = token;
        loadNotifications();
        openSocket(token);
        return;
      }

      // Token disappeared (logout)
      if (!token && lastTokenRef.current) {
        lastTokenRef.current = null;
        socketRef.current?.removeAllListeners();
        socketRef.current?.disconnect();
        socketRef.current = null;
        setNotifications([]);
        setUnread(0);
        return;
      }

      // Socket died but token still valid → reconnect
      if (token && socketRef.current && !socketRef.current.connected && !socketRef.current.active) {
        openSocket(token);
      }
    };

    tick(); // Run immediately on mount
    const id = setInterval(tick, 2000);
    return () => {
      clearInterval(id);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toast helpers ─────────────────────────────────────────────────────
  const addToast = (notif) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...notif, _toastId: id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t._toastId !== id)), 5000);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t._toastId !== id));

  // ── Mark one read ─────────────────────────────────────────────────────
  const markRead = (notifId) => {
    fetch(`${API}/notifications/${notifId}/read`, { method: "PATCH", headers: getHeaders() }).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n._id === notifId ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  // ── Mark all read ─────────────────────────────────────────────────────
  const markAllRead = () => {
    fetch(`${API}/notifications/read-all`, { method: "PATCH", headers: getHeaders() }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unread, markRead, markAllRead, toasts, dismissToast }}>
      {children}

      {/* ── Toast stack ────────────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div style={toastContainerStyle}>
          {toasts.map((t) => {
            const meta = NOTIF_META[t.type] || { icon: "🔔", color: "#1D7A91" };
            return (
              <div
                key={t._toastId}
                style={{ ...toastStyle, borderLeftColor: meta.color }}
                onClick={() => dismissToast(t._toastId)}
              >
                <span style={{ ...toastIconStyle, background: meta.color + "20", color: meta.color }}>
                  {meta.icon}
                </span>
                <div style={toastBodyStyle}>
                  <div style={toastTitleStyle}>{t.title}</div>
                  <div style={toastMsgStyle}>{t.message}</div>
                </div>
                <button
                  style={toastCloseStyle}
                  onClick={(e) => { e.stopPropagation(); dismissToast(t._toastId); }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationsProvider");
  return ctx;
}

// ── Toast styles ──────────────────────────────────────────────────────────────
const toastContainerStyle = {
  position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
  display: "flex", flexDirection: "column", gap: "10px",
  maxWidth: "360px", width: "100%", pointerEvents: "none",
};
const toastStyle = {
  display: "flex", alignItems: "flex-start", gap: "12px",
  background: "var(--surface, #fff)", border: "1px solid var(--border, #e5e7eb)",
  borderLeft: "4px solid #1D7A91", borderRadius: "12px",
  padding: "14px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
  cursor: "pointer", animation: "toastIn 0.25s ease", pointerEvents: "auto",
};
const toastIconStyle = {
  width: "36px", height: "36px", borderRadius: "10px",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "16px", flexShrink: 0,
};
const toastBodyStyle = { flex: 1, minWidth: 0 };
const toastTitleStyle = { fontSize: "13px", fontWeight: 700, color: "var(--text-1, #111)", marginBottom: "2px" };
const toastMsgStyle   = {
  fontSize: "12px", color: "var(--text-2, #555)", lineHeight: 1.4,
  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
};
const toastCloseStyle = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: "18px", color: "var(--text-3, #999)", padding: "0 2px", lineHeight: 1, flexShrink: 0,
};
