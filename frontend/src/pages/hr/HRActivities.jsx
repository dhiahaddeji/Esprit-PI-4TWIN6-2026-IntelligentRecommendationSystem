import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchActivitiesPage } from "../../services/activityService";
import { getManagers } from "../../services/workflowService";

const TYPE_ICON = {
  formation: "📚", certification: "🏆", projet: "🛠️", mission: "🎯", audit: "🔍",
};

const STATUS_CFG = {
  DRAFT:             { label: "Brouillon",           bg: "#F1F5F9", color: "#64748B" },
  AI_SUGGESTED:      { label: "IA exécutée",         bg: "#FEF6E4", color: "#7A4A00" },
  HR_VALIDATED:      { label: "Validée RH",          bg: "#F0FDF4", color: "#145C2B" },
  SENT_TO_MANAGER:   { label: "Envoyée au manager",  bg: "#EEF7FA", color: "#155B6E" },
  HR_REGEN_NEEDED:   { label: "Regénération requise",bg: "#FFF3CD", color: "#856404" },
  MANAGER_CONFIRMED: { label: "Confirmée",           bg: "#F0FDF4", color: "#145C2B" },
  MANAGER_REFUSED:   { label: "Refusée",             bg: "#FBE9E9", color: "#8B1A1A" },
  NOTIFIED:          { label: "Employés notifiés",   bg: "#F0FDF4", color: "#145C2B" },
};

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
}

export default function HRActivities() {
  const [activities, setActivities] = useState([]);
 
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [managers, setManagers] = useState([]);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    (async () => {
      try {
        setError("");

        const [res, mgrs] = await Promise.all([fetchActivitiesPage({ page, limit }), getManagers()]);
        setActivities(res.data || []);
        setTotal(res.total || 0);
        setManagers(Array.isArray(mgrs) ? mgrs : []);
      } catch (e) {
        setError(e?.message || "Erreur de chargement");
      }
    })();
  }, [page, limit]);

  const managersById = useMemo(() => {
    const map = new Map();
    managers.forEach(u => map.set(String(u._id || u.id), u));
    return map;
  }, [managers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const filtered = useMemo(() => {
    return activities.filter(a => {
      const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [activities, search, filterStatus]);

  const statusKeys = ["ALL", ...Object.keys(STATUS_CFG)];

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "var(--text-1)" }}>Activités</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 13 }}>
            {activities.length} activité{activities.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link to="/hr/activities/new" style={{
          background: "#0B2D38", color: "#fff",
          padding: "10px 18px", borderRadius: 12,
          textDecoration: "none", fontWeight: 800, fontSize: 14,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          + Créer une activité
        </Link>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "#FBE9E9", border: "1px solid #F28080", color: "#8B1A1A" }}>
          {error}
        </div>
      )}

      {/* ── Search + filter ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Rechercher une activité…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: "9px 14px", borderRadius: 10,
            border: "1.5px solid #E2E8F0", background: "var(--surface)",
            fontSize: 13, outline: "none", color: "var(--text-1)",
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: "9px 12px", borderRadius: 10,
            border: "1.5px solid #E2E8F0", background: "var(--surface)",
            fontSize: 13, color: "var(--text-1)", outline: "none", cursor: "pointer",
          }}
        >
          <option value="ALL">Tous les statuts</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ── List ── */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", background: "var(--surface)", borderRadius: 16, border: "1px solid #E2E8F0", color: "#94A3B8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700 }}>Aucune activité trouvée</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {search || filterStatus !== "ALL" ? "Modifiez vos filtres" : "Créez votre première activité"}
            </div>
          </div>
        ) : (
          filtered.map(a => {
            const id      = a._id || a.id;
            const manager = managersById.get(String(a.managerId));
            const mgrName = manager?.name || "Manager inconnu";
            const st      = STATUS_CFG[a.status] || { label: a.status, bg: "#F1F5F9", color: "#64748B" };
            const icon    = TYPE_ICON[a.type] || "📋";

            return (
              <div key={String(id)} style={{
                background: "var(--surface)",
                border: "1px solid #E2E8F0",
                borderRadius: 16,
                padding: "16px 18px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
                transition: "box-shadow 0.15s",
              }}>
                <div style={{ minWidth: 0 }}>

                  {/* Title row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                    <span style={{
                      fontWeight: 900, fontSize: 16, color: "var(--text-1)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.title}
                    </span>
                    <span style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 700,
                      padding: "3px 9px", borderRadius: 999,
                      background: st.bg, color: st.color,
                    }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>

                    {/* Manager avatar + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "linear-gradient(135deg,#0B2D38,#1D7A91)",
                        color: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>
                        {initials(mgrName)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{mgrName}</span>
                    </div>

                    {/* Divider */}
                    {(a.date || a.location || a.seats) && (
                      <span style={{ color: "#CBD5E1", fontSize: 16 }}>|</span>
                    )}

                    {a.date && (
                      <span style={{ fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 4 }}>
                        📅 {a.date}
                      </span>
                    )}
                    {a.location && (
                      <span style={{ fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 4 }}>
                        📍 {a.location}
                      </span>
                    )}
                    {a.seats > 0 && (
                      <span style={{ fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 4 }}>
                        👥 {a.seats} place{a.seats !== 1 ? "s" : ""}
                      </span>
                    )}
                    {a.prioritization && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: "#EEF7FA", color: "#1D7A91",
                      }}>
                        {a.prioritization}
                      </span>
                    )}
                  </div>
                </div>

                <Link to={`/hr/activities/${id}`} style={{
                  textDecoration: "none", fontWeight: 800, fontSize: 13,
                  color: "#0B2D38", padding: "9px 14px", borderRadius: 10,
                  border: "1.5px solid #E2E8F0", background: "var(--surface)",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  Workflow →
                </Link>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          ← Précédent
        </button>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={!canNext}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
