// src/pages/manager/ManagerSkillApproval.jsx
import { useState, useEffect } from "react";
import http from "../../api/http";

const CATEGORIES = [
  { key: "savoir",       label: "Savoir",       icon: "📚", color: "#3b6fd4", bg: "#eff6ff" },
  { key: "savoir_faire", label: "Savoir-faire",  icon: "🛠️", color: "#0891b2", bg: "#ecfeff" },
  { key: "savoir_etre",  label: "Savoir-être",   icon: "🤝", color: "#7c3aed", bg: "#f5f3ff" },
];

const LEVEL_COLORS = {
  LOW:    { bg: "#fee2e2", color: "#dc2626", label: "Faible" },
  MEDIUM: { bg: "#fef3c7", color: "#d97706", label: "Moyen" },
  HIGH:   { bg: "#dbeafe", color: "#2563eb", label: "Élevé" },
  EXPERT: { bg: "#d1fae5", color: "#059669", label: "Expert" },
};

const STATUS_STYLE = {
  PENDING:  { bg: "#fef3c7", color: "#92400e", label: "En attente" },
  APPROVED: { bg: "#d1fae5", color: "#065f46", label: "Approuvé" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "Rejeté" },
};

function RequestCard({ req, onAction }) {
  const [note, setNote]       = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(req.status === "PENDING");
  const ss = STATUS_STYLE[req.status] || STATUS_STYLE.PENDING;

  const act = async (action) => {
    setLoading(true);
    await onAction(req._id, action, note);
    setLoading(false);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: "14px",
      border: `1px solid ${req.status === "PENDING" ? "#fcd34d" : "#dde3f0"}`,
      padding: "20px", marginBottom: "16px",
      boxShadow: req.status === "PENDING" ? "0 4px 20px rgba(252,211,77,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "16px", color: "#1a2340" }}>
            👤 {req.employeeName}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7a99", marginTop: "2px" }}>
            {req.createdAt ? new Date(req.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            padding: "4px 12px", borderRadius: "999px", fontSize: "12px",
            fontWeight: 700, background: ss.bg, color: ss.color,
          }}>{ss.label}</span>
          <button onClick={() => setExpanded(e => !e)} style={{
            background: "#f1f5f9", border: "none", borderRadius: "8px",
            padding: "4px 10px", cursor: "pointer", fontSize: "13px", color: "#64748b",
          }}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{
                background: cat.bg, borderRadius: "10px", padding: "12px",
                border: `1px solid ${cat.color}20`,
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: cat.color, marginBottom: "8px" }}>
                  {cat.icon} {cat.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {(req[cat.key] || []).length === 0
                    ? <span style={{ fontSize: "12px", color: "#aab4c3" }}>—</span>
                    : req[cat.key].map((sk, i) => {
                      const item = typeof sk === "string" ? { name: sk, level: "MEDIUM" } : sk;
                      const lc = LEVEL_COLORS[item.level] || LEVEL_COLORS.MEDIUM;
                      return (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "2px 8px", borderRadius: "999px",
                          background: "#fff", color: cat.color,
                          fontSize: "11.5px", fontWeight: 600,
                          border: `1px solid ${cat.color}30`,
                        }}>
                          {item.name}
                          <span style={{
                            fontSize: "10px", fontWeight: 700,
                            color: lc.color, background: lc.bg,
                            padding: "0px 4px", borderRadius: "4px",
                          }}>{lc.label}</span>
                        </span>
                      );
                    })
                  }
                </div>
              </div>
            ))}
          </div>

          {req.status === "PENDING" && (
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
              <input
                type="text"
                placeholder="Note optionnelle (ex: compétences validées en entretien)…"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{
                  width: "100%", padding: "9px 14px", marginBottom: "12px",
                  border: "1.5px solid #dde3f0", borderRadius: "9px",
                  background: "#f5f7ff", color: "#1a2340", fontSize: "13.5px",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => act("approve")}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "9px",
                    background: "linear-gradient(135deg,#10b981,#059669)",
                    color: "#fff", border: "none", fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer", fontSize: "14px",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  ✅ Approuver
                </button>
                <button
                  onClick={() => act("reject")}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "9px",
                    background: "#fee2e2", color: "#dc2626",
                    border: "1px solid #fecaca", fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer", fontSize: "14px",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  ❌ Rejeter
                </button>
              </div>
            </div>
          )}

          {req.status !== "PENDING" && req.reviewNote && (
            <div style={{
              borderTop: "1px solid #f1f5f9", paddingTop: "12px",
              fontSize: "13px", color: "#6b7a99",
            }}>
              <strong>Note :</strong> {req.reviewNote}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManagerSkillApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("PENDING");
  const [msg, setMsg]           = useState(null);

  const load = () => {
    setLoading(true);
    http.get("/skills/all")
      .then(res => setRequests(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMsg({ type: "error", text: "Impossible de charger les demandes." }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action, note) => {
    try {
      await http.patch(`/skills/${id}/${action}`, { note });
      setMsg({ type: "success", text: action === "approve" ? "Compétences approuvées ✅" : "Demande rejetée" });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erreur" });
    }
  };

  const filtered = requests.filter(r => filter === "ALL" || r.status === filter);
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "#1a2340" }}>
          🎯 Validation des compétences
        </h1>
        <p style={{ margin: 0, color: "#6b7a99", fontSize: "14px" }}>
          {pendingCount} demande{pendingCount !== 1 ? "s" : ""} en attente de validation
        </p>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
          background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
          color: msg.type === "success" ? "#065f46" : "#991b1b",
          fontWeight: 600, fontSize: "14px",
        }}>
          {msg.text}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { val: "PENDING",  label: `En attente (${pendingCount})` },
          { val: "APPROVED", label: "Approuvées" },
          { val: "REJECTED", label: "Rejetées" },
          { val: "ALL",      label: "Toutes" },
        ].map(tab => (
          <button key={tab.val} onClick={() => setFilter(tab.val)} style={{
            padding: "7px 16px", borderRadius: "9px", cursor: "pointer",
            fontWeight: 600, fontSize: "13px",
            background: filter === tab.val ? "#3b6fd4" : "#f1f5f9",
            color: filter === tab.val ? "#fff" : "#64748b",
            border: "none",
          }}>{tab.label}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7a99" }}>Chargement…</div>}

      {!loading && filtered.length === 0 && (
        <div style={{
          padding: "60px", background: "#fff", borderRadius: "16px",
          border: "1px solid #dde3f0", textAlign: "center", color: "#6b7a99",
        }}>
          Aucune demande dans cette catégorie.
        </div>
      )}

      {!loading && filtered.map(req => (
        <RequestCard key={req._id} req={req} onAction={handleAction} />
      ))}
    </div>
  );
}
