import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { getStoredToken } from "../../auth/authService";

const API = "http://localhost:3000";

const ACTION_META = {
  USER_LOGIN:              { label: "Connexion",            color: "#2980b9", icon: "🔐" },
  GITHUB_LOGIN:            { label: "Connexion GitHub",     color: "#6f42c1", icon: "🐙" },
  USER_CREATED:            { label: "Compte créé",          color: "#27ae60", icon: "➕" },
  USER_UPDATED:            { label: "Compte modifié",       color: "#f39c12", icon: "✏️" },
  USER_DELETED:            { label: "Compte supprimé",      color: "#e74c3c", icon: "🗑️" },
  PASSWORD_CHANGED:        { label: "Mot de passe changé",  color: "#7f8c8d", icon: "🔑" },
  SKILL_SUBMITTED:         { label: "Compétences soumises", color: "#1abc9c", icon: "📤" },
  SKILL_APPROVED:          { label: "Compétences validées", color: "#27ae60", icon: "✅" },
  SKILL_REJECTED:          { label: "Compétences rejetées", color: "#e74c3c", icon: "❌" },
  ACTIVITY_CREATED:        { label: "Activité créée",       color: "#2980b9", icon: "📅" },
  ACTIVITY_STATUS_CHANGED: { label: "Statut activité",      color: "#8e44ad", icon: "🔄" },
};

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  HR:         "RH",
  MANAGER:    "Manager",
  EMPLOYEE:   "Employé",
};

const LOGIN_ACTIONS = new Set(["USER_LOGIN", "GITHUB_LOGIN"]);

function Badge({ action }) {
  const meta = ACTION_META[action] || { label: action, color: "#7f8c8d", icon: "•" };
  return (
    <span style={{
      background: meta.color + "18",
      color: meta.color,
      border: `1px solid ${meta.color}55`,
      borderRadius: 6,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
      letterSpacing: "0.3px",
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " "
    + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function DetailsCell({ log }) {
  const isLogin = LOGIN_ACTIONS.has(log.action);
  const d = log.details || {};

  if (isLogin) {
    // Show login time and email prominently inline (no need to expand)
    return (
      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
        {d.email && <div><span style={{ color: "#999" }}>Email :</span> {d.email}</div>}
        {d.matricule && <div><span style={{ color: "#999" }}>Matricule :</span> <strong>{d.matricule}</strong></div>}
        {d.loginTime && (
          <div style={{ color: "#27ae60", fontWeight: 600, marginTop: 2 }}>
            🕐 {formatDate(d.loginTime)}
          </div>
        )}
      </div>
    );
  }

  if (!d || Object.keys(d).length === 0) return <span style={{ color: "#bbb" }}>—</span>;

  return (
    <details style={{ cursor: "pointer" }}>
      <summary style={{ fontSize: 12, color: "#888", userSelect: "none", listStyle: "none" }}>
        <span style={{ textDecoration: "underline dotted" }}>Voir détails</span>
      </summary>
      <pre style={{
        margin: "6px 0 0", fontSize: 11, color: "#555",
        background: "#f8f9fc", borderRadius: 5, padding: 8,
        maxHeight: 120, overflow: "auto", whiteSpace: "pre-wrap",
      }}>
        {JSON.stringify(d, null, 2)}
      </pre>
    </details>
  );
}

export default function AdminLogs() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [newIds, setNewIds]     = useState(new Set());  // IDs of live-received entries

  const [filterAction,   setFilterAction]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");

  const socketRef = useRef(null);
  const limit     = 50;

  // ── Fetch from REST ──────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const token  = getStoredToken();
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (filterAction)   params.set("action",   filterAction);
      if (filterDateFrom) params.set("dateFrom",  filterDateFrom);
      if (filterDateTo)   params.set("dateTo",    filterDateTo);

      const res  = await fetch(`${API}/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTotal(data.total || 0);
      // Reset replaces the list; load-more appends OLDER entries at the bottom
      setLogs(prev => reset ? (data.logs || []) : [...prev, ...(data.logs || [])]);
    } catch (e) {
      console.error("Audit logs fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterDateFrom, filterDateTo]);

  // Reset when filters change
  useEffect(() => {
    setPage(1);
    setNewIds(new Set());
    fetchLogs(1, true);
  }, [fetchLogs]);

  // ── WebSocket for real-time entries ─────────────────────────────────────
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    const socket = io(API, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("audit_log", (entry) => {
      const actionOk = !filterAction || entry.action === filterAction;
      if (!actionOk) return;

      setLogs(prev => [entry, ...prev]);
      setTotal(t => t + 1);
      setNewIds(prev => new Set([...prev, entry._id]));

      // Remove highlight after 4s
      if (entry._id) {
        setTimeout(() => {
          setNewIds(prev => {
            const next = new Set(prev);
            next.delete(entry._id);
            return next;
          });
        }, 4000);
      }
    });

    return () => { socket.disconnect(); };
  }, [filterAction]);

  // ── CSV export ───────────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    const token  = getStoredToken();
    const params = new URLSearchParams();
    if (filterAction)   params.set("action",   filterAction);
    if (filterDateFrom) params.set("dateFrom",  filterDateFrom);
    if (filterDateTo)   params.set("dateTo",    filterDateTo);

    const res  = await fetch(`${API}/audit-logs/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLogs(next, false);
  };

  const liveCount = newIds.size;
  const hasMore   = logs.length < total;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: "#1a1a2e" }}>
            📋 Journal d'audit
          </h1>
          <p style={{ margin: "4px 0 0", color: "#777", fontSize: 13 }}>
            {total.toLocaleString("fr-FR")} entrée{total !== 1 ? "s" : ""}
            {liveCount > 0 && (
              <span style={{
                marginLeft: 10, background: "#27ae6018", color: "#27ae60",
                borderRadius: 10, padding: "2px 9px", fontSize: 12, fontWeight: 700,
                border: "1px solid #27ae6040",
              }}>
                ● {liveCount} nouvelles en direct
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          style={{
            background: "#27ae60", color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 7, boxShadow: "0 2px 8px #27ae6033",
          }}
        >
          ⬇ Exporter CSV
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: "#fff", border: "1px solid #e8e8f0", borderRadius: 10,
        padding: "14px 18px", marginBottom: 16,
        display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#666", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Type d'action
          </label>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #dde", fontSize: 13, background: "#fafbfc" }}
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_META).map(([key, { label, icon }]) => (
              <option key={key} value={key}>{icon} {label}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#666", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Du
          </label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #dde", fontSize: 13, background: "#fafbfc" }}
          />
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#666", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Au
          </label>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #dde", fontSize: 13, background: "#fafbfc" }}
          />
        </div>

        <button
          onClick={() => { setFilterAction(""); setFilterDateFrom(""); setFilterDateTo(""); }}
          style={{
            padding: "8px 16px", borderRadius: 7, border: "1px solid #dde",
            background: "#f5f5f8", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#555",
          }}
        >
          Réinitialiser
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f4f5fb", borderBottom: "2px solid #e4e5f0" }}>
              <th style={thStyle}>Date / Heure</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Utilisateur</th>
              <th style={thStyle}>Rôle</th>
              <th style={thStyle}>Identifiant / Cible</th>
              <th style={{ ...thStyle, minWidth: 200 }}>Infos / Détails</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#bbb", fontSize: 14 }}>
                  Aucun log trouvé
                </td>
              </tr>
            )}
            {logs.map((log, i) => {
              const isNew = newIds.has(log._id);
              const isLogin = LOGIN_ACTIONS.has(log.action);
              return (
                <tr
                  key={log._id || i}
                  style={{
                    borderBottom: "1px solid #f0f0f8",
                    background: isNew ? "#f0fdf4" : "transparent",
                    transition: "background 1s ease",
                  }}
                >
                  {/* Date / Heure */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12, color: "#444" }}>
                    {formatDate(log.createdAt)}
                  </td>

                  {/* Action badge */}
                  <td style={tdStyle}>
                    <Badge action={log.action} />
                  </td>

                  {/* Utilisateur */}
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#1a1a2e" }}>
                    {log.userName || log.userId || "—"}
                    {isNew && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, background: "#27ae60", color: "#fff",
                        borderRadius: 8, padding: "1px 6px", fontWeight: 700, verticalAlign: "middle",
                      }}>
                        NEW
                      </span>
                    )}
                  </td>

                  {/* Rôle */}
                  <td style={{ ...tdStyle, color: "#666" }}>
                    {ROLE_LABELS[log.userRole] || log.userRole || "—"}
                  </td>

                  {/* Identifiant / Cible */}
                  <td style={{ ...tdStyle, color: "#555", maxWidth: 180 }}>
                    {isLogin ? (
                      /* For logins: show matricule or email as identifier */
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "#2980b9", fontWeight: 600 }}>
                        {log.details?.matricule || log.details?.email || log.targetName || "—"}
                      </span>
                    ) : (
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 180 }}>
                        {log.targetName || log.targetId || "—"}
                      </span>
                    )}
                  </td>

                  {/* Infos / Détails */}
                  <td style={{ ...tdStyle, maxWidth: 260 }}>
                    <DetailsCell log={log} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && (
          <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>
            Chargement...
          </div>
        )}

        {hasMore && !loading && (
          <div style={{ padding: 14, textAlign: "center", borderTop: "1px solid #f0f0f8" }}>
            <button
              onClick={loadMore}
              style={{
                background: "#f5f5f8", border: "1px solid #dde", borderRadius: 8,
                padding: "8px 28px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#555",
              }}
            >
              Charger plus — {total - logs.length} entrée{total - logs.length > 1 ? "s" : ""} restante{total - logs.length > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "11px 16px",
  textAlign: "left",
  fontWeight: 700,
  color: "#444",
  whiteSpace: "nowrap",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const tdStyle = {
  padding: "10px 16px",
  verticalAlign: "top",
};
