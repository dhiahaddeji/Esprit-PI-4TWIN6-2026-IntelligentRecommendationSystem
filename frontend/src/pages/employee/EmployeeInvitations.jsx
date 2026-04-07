import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getStoredUser } from "../../auth/authService";
import { fetchMyInvitations } from "../../services/invitationsApi";
import { fetchActivityById } from "../../services/activitiesApi";

/* ─── Status config ─────────────────────────────────────────── */
const STATUS = {
  PENDING:  { label: "En attente",  bg: "#EEF7FA", border: "#A8D8E3", color: "#0B2D38", dot: "#1D7A91", icon: "🕐" },
  ACCEPTED: { label: "Acceptée",    bg: "#F0FDF4", border: "#86EFAC", color: "#145C2B", dot: "#22C55E", icon: "✅" },
  DECLINED: { label: "Refusée",     bg: "#FEF2F2", border: "#FCA5A5", color: "#8B1A1A", dot: "#EF4444", icon: "❌" },
};

const TYPE_ICONS = {
  formation: "📚", certification: "🏆", projet: "🛠️",
  mission: "🎯", audit: "🔍",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EmployeeInvitations() {
  const user = getStoredUser();
  const [invitations,   setInvitations]   = useState([]);
  const [activitiesMap, setActivitiesMap] = useState({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [filter,        setFilter]        = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        setError("");
        if (!user || String(user.role).toUpperCase() !== "EMPLOYEE") {
          setInvitations([]);
          setLoading(false);
          return;
        }
        const invs = await fetchMyInvitations();
        setInvitations(invs || []);

        const ids = [...new Set((invs || []).map(i => i.activityId))].filter(Boolean);
        const results = await Promise.all(
          ids.map(async id => {
            try { return [id, await fetchActivityById(id)]; }
            catch { return [id, null]; }
          })
        );
        setActivitiesMap(Object.fromEntries(results));
      } catch (e) {
        setError(e?.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.role]);

  if (!user || String(user.role).toUpperCase() !== "EMPLOYEE") {
    return (
      <div style={S.page}>
        <EmptyState icon="🔒" title="Accès restreint" desc="Cette page est réservée aux employés." />
      </div>
    );
  }

  const counts = { ALL: invitations.length, PENDING: 0, ACCEPTED: 0, DECLINED: 0 };
  invitations.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });

  const visible = filter === "ALL" ? invitations : invitations.filter(i => i.status === filter);

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🔔 Mes Invitations</h1>
          <p style={S.subtitle}>
            {invitations.length} invitation{invitations.length !== 1 ? "s" : ""} reçue{invitations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={S.statsRow}>
          {Object.entries(STATUS).map(([key, cfg]) => (
            <div key={key} style={{ ...S.statChip, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span style={{ ...S.statDot, background: cfg.dot }} />
              <span style={{ color: cfg.color, fontWeight: 600, fontSize: 12 }}>{counts[key]} {cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={S.errorBanner}>⚠️ {error}</div>
      )}

      {/* ── Filter tabs ── */}
      {!loading && invitations.length > 0 && (
        <div style={S.tabs}>
          {["ALL", "PENDING", "ACCEPTED", "DECLINED"].map(key => (
            <button
              key={key}
              style={{ ...S.tab, ...(filter === key ? S.tabActive : {}) }}
              onClick={() => setFilter(key)}
            >
              {key === "ALL" ? "Toutes" : STATUS[key]?.label}
              <span style={{
                ...S.tabBadge,
                background: filter === key ? "#fff" : "var(--c-teal-100, #D6EEF3)",
                color: filter === key ? "var(--c-teal-800, #0B2D38)" : "var(--c-teal-600, #155B6E)",
              }}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={S.loadingWrap}>
          <div style={S.spinner} />
          <p style={{ color: "var(--text-2)", marginTop: 12, fontSize: 14 }}>Chargement des invitations…</p>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === "ALL" ? "📭" : STATUS[filter]?.icon}
          title={filter === "ALL" ? "Aucune invitation" : `Aucune invitation ${STATUS[filter]?.label?.toLowerCase()}`}
          desc="Vous n'avez aucune invitation pour le moment. Revenez plus tard !"
        />
      ) : (
        <div style={S.grid}>
          {visible.map(inv => {
            const act = activitiesMap[inv.activityId];
            const st  = STATUS[inv.status] || STATUS.PENDING;
            const typeIcon = TYPE_ICONS[act?.type] || "📋";
            return (
              <div key={inv._id || inv.id} style={S.card}>

                {/* Left accent bar */}
                <div style={{ ...S.cardAccent, background: st.dot }} />

                <div style={S.cardBody}>
                  {/* Top row */}
                  <div style={S.cardTop}>
                    <div style={{ ...S.typeIcon, background: st.bg }}>
                      {typeIcon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.actTitle}>{act?.title || "Activité"}</div>
                      <div style={S.actMeta}>
                        {act?.type && <span style={S.metaTag}>{act.type}</span>}
                        {act?.location && <span>📍 {act.location}</span>}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span style={{ ...S.statusBadge, background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
                      {st.icon} {st.label}
                    </span>
                  </div>

                  {/* Date row */}
                  <div style={S.dateRow}>
                    <span style={S.dateChip}>
                      📅 {formatDate(act?.startDate || act?.date)}
                      {act?.endDate && act.endDate !== act?.startDate && ` → ${formatDate(act.endDate)}`}
                    </span>
                    {inv.createdAt && (
                      <span style={S.receivedChip}>
                        Reçue le {formatDate(inv.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {act?.description && (
                    <p style={S.desc}>{act.description}</p>
                  )}

                  {/* Footer */}
                  <div style={S.cardFooter}>
                    <Link to={`/employee/invitations/${inv._id || inv.id}`} style={S.viewBtn}>
                      Voir les détails →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={S.emptyWrap}>
      <div style={S.emptyIcon}>{icon}</div>
      <h3 style={S.emptyTitle}>{title}</h3>
      <p style={S.emptyDesc}>{desc}</p>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const S = {
  page: { padding: "28px 32px", maxWidth: 900, margin: "0 auto" },

  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexWrap: "wrap", gap: 16, marginBottom: 24,
  },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-1, #111)" },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: "var(--text-2, #666)" },

  statsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  statChip: {
    display: "flex", alignItems: "center", gap: 6,
    borderRadius: 20, padding: "5px 12px",
  },
  statDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },

  errorBanner: {
    background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#8B1A1A",
    borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13,
  },

  tabs: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  tab: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 14px", borderRadius: 20,
    border: "1.5px solid var(--border, #ddd)",
    background: "var(--surface, #fff)", color: "var(--text-2, #666)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--c-teal-800, #0B2D38)",
    border: "1.5px solid var(--c-teal-800, #0B2D38)",
    color: "#fff",
  },
  tabBadge: {
    fontSize: 11, fontWeight: 700, borderRadius: 10,
    padding: "1px 6px", minWidth: 18, textAlign: "center",
  },

  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0" },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid var(--border, #ddd)",
    borderTopColor: "var(--c-teal-600, #155B6E)",
    animation: "spin 0.7s linear infinite",
  },

  grid: { display: "flex", flexDirection: "column", gap: 14 },

  card: {
    display: "flex", background: "var(--surface, #fff)",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: 16, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.15s, transform 0.15s",
  },
  cardAccent: { width: 5, flexShrink: 0 },
  cardBody: { flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 },

  cardTop: { display: "flex", alignItems: "flex-start", gap: 12 },
  typeIcon: {
    width: 44, height: 44, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
  },
  actTitle: { fontSize: 15, fontWeight: 700, color: "var(--text-1, #111)", marginBottom: 4 },
  actMeta: { display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--text-2, #666)", flexWrap: "wrap" },
  metaTag: {
    background: "var(--c-teal-50, #EEF7FA)", color: "var(--c-teal-700, #0F3D4D)",
    borderRadius: 6, padding: "1px 8px", fontWeight: 600, fontSize: 11,
    border: "1px solid var(--c-teal-100, #D6EEF3)",
  },

  statusBadge: {
    flexShrink: 0, padding: "4px 12px", borderRadius: 20,
    fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
  },

  dateRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  dateChip: {
    fontSize: 12, color: "var(--text-2, #666)",
    background: "var(--surface-2, #f8f8f8)",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: 8, padding: "3px 10px",
  },
  receivedChip: { fontSize: 11, color: "var(--text-3, #aaa)", fontStyle: "italic" },

  desc: {
    fontSize: 13, color: "var(--text-2, #666)",
    lineHeight: 1.55, margin: 0,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  },

  cardFooter: { display: "flex", justifyContent: "flex-end", paddingTop: 4 },
  viewBtn: {
    textDecoration: "none", fontWeight: 700, fontSize: 13,
    color: "var(--c-teal-700, #0F3D4D)",
    background: "var(--c-teal-50, #EEF7FA)",
    border: "1.5px solid var(--c-teal-200, #A8D8E3)",
    padding: "7px 16px", borderRadius: 10,
    transition: "background 0.15s",
  },

  emptyWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 20px", gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-1, #111)" },
  emptyDesc: { margin: 0, fontSize: 13, color: "var(--text-2, #888)", textAlign: "center", maxWidth: 320, lineHeight: 1.6 },
};

/* CSS keyframe for spinner — injected once */
if (typeof document !== "undefined" && !document.getElementById("inv-spin-style")) {
  const s = document.createElement("style");
  s.id = "inv-spin-style";
  s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}
