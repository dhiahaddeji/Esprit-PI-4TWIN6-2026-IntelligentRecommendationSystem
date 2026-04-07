// src/pages/hr/HRSkillsDashboard.jsx
import { useState, useEffect } from "react";
import http from "../../api/http";

const EVAL_LEVELS = [
  { val: 0, label: "Pas de compétence", color: "var(--text-3)", bg: "#f1f5f9" },
  { val: 1, label: "Notions",           color: "#C9952A", bg: "#FEF6E4" },
  { val: 2, label: "Pratique",          color: "#155B6E", bg: "#D6EEF3" },
  { val: 3, label: "Maîtrise",          color: "#1D7A91", bg: "#EEF7FA" },
  { val: 4, label: "Expert",            color: "#145C2B", bg: "#E8F5ED" },
];

const CATEGORIES = [
  { key: "savoir",       label: "Savoir",       icon: "📚", color: "#1D7A91", bg: "#EEF7FA" },
  { key: "savoir_faire", label: "Savoir-faire",  icon: "🛠️", color: "#1D7A91", bg: "#EEF7FA" },
  { key: "savoir_etre",  label: "Savoir-être",   icon: "🤝", color: "#1D7A91", bg: "#EEF7FA" },
];

function StatCard({ icon, label, value, sub, color = "#1D7A91" }) {
  return (
    <div style={{
      background: "var(--surface)", borderRadius: "14px", padding: "20px 22px",
      border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(59,111,212,0.07)",
    }}>
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: 800, color, marginBottom: "2px" }}>{value}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{label}</div>
      {sub && <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function ScoreBar({ score, max = 4 }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct >= 75 ? "#145C2B" : pct >= 50 ? "#155B6E" : pct >= 25 ? "#C9952A" : "#8B1A1A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: "var(--bg)", overflow: "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
        {score.toFixed ? score.toFixed(1) : score}
      </span>
    </div>
  );
}

function EmployeeCard({ emp }) {
  const [open, setOpen] = useState(false);
  const initials = (emp.employee_name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)",
      overflow: "hidden", marginBottom: "8px",
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "#EEF7FA"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#1D7A91,#2d58b0)",
          color: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 700, fontSize: "13px",
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-1)" }}>{emp.employee_name || "—"}</div>
          <div style={{ fontSize: "12px", color: "var(--text-2)" }}>
            {emp.competences.length} compétence{emp.competences.length !== 1 ? "s" : ""} validée{emp.competences.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span style={{ color: "var(--text-2)", fontSize: "14px" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
          {CATEGORIES.map(cat => {
            const items = emp.competences.filter(c => c.type === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key} style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: cat.color, marginBottom: "5px" }}>
                  {cat.icon} {cat.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {items.map((c, i) => {
                    const evalVal = c.hierarchie_eval >= 0 ? c.hierarchie_eval : c.auto_eval;
                    const lv = EVAL_LEVELS[evalVal] || EVAL_LEVELS[0];
                    return (
                      <span key={i} style={{
                        padding: "2px 8px", borderRadius: "999px",
                        background: lv.bg, color: lv.color,
                        fontSize: "11.5px", fontWeight: 600,
                        border: `1px solid ${lv.color}30`,
                      }}>{c.intitule} · {lv.label}</span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HRSkillsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [tab, setTab]             = useState("overview");

  useEffect(() => {
    Promise.all([
      http.get("/competences/analytics"),
      http.get("/competences/employees-all"),
    ])
      .then(([a, e]) => {
        setAnalytics(a.data);
        setEmployees(Array.isArray(e.data) ? e.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEmps = employees.filter(emp => {
    const name = (emp.employee_name || "").toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-2)" }}>Chargement…</div>;

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "var(--text-1)" }}>
          📊 Tableau de bord — Compétences
        </h1>
        <p style={{ margin: 0, color: "var(--text-2)", fontSize: "14px" }}>
          Visualisation globale des compétences et fiches de validation
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {[
          { val: "overview",  label: "📊 Vue d'ensemble" },
          { val: "employees", label: "👥 Employés" },
        ].map(t => (
          <button key={t.val} onClick={() => setTab(t.val)} style={{
            padding: "8px 18px", borderRadius: "10px", cursor: "pointer",
            fontWeight: 700, fontSize: "13.5px", border: "none",
            background: tab === t.val ? "#1D7A91" : "#f1f5f9",
            color: tab === t.val ? "#fff" : "#638899",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && analytics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            <StatCard icon="📋" label="Fiches total"       value={analytics.totalFiches} color="#1D7A91" />
            <StatCard icon="✅" label="Fiches validées"    value={analytics.validated}
              sub={`${analytics.totalFiches > 0 ? Math.round(analytics.validated / analytics.totalFiches * 100) : 0}% de couverture`}
              color="#145C2B" />
            <StatCard icon="⏳" label="En attente"         value={analytics.pending} color="#C9952A" />
            <StatCard icon="⭐" label="Score moyen"        value={analytics.avgScore}
              sub="sur 4" color="#1D7A91" />
          </div>

          {/* Distribution par type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div style={{
              background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)",
              padding: "20px 24px", boxShadow: "0 4px 16px rgba(59,111,212,0.07)",
            }}>
              <h2 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
                📂 Répartition par type
              </h2>
              {analytics.byType && Object.entries(analytics.byType).map(([type, count]) => {
                const cat = CATEGORIES.find(c => c.key === type);
                const total = Object.values(analytics.byType).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <span style={{ minWidth: 100, fontSize: "13px", fontWeight: 600, color: cat?.color || "#638899" }}>
                      {cat?.icon} {cat?.label || type}
                    </span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: cat?.color || "#1D7A91", borderRadius: 4,
                      }} />
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-2)", minWidth: 50, textAlign: "right" }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Top skills */}
            <div style={{
              background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)",
              padding: "20px 24px", boxShadow: "0 4px 16px rgba(59,111,212,0.07)",
            }}>
              <h2 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700, color: "var(--text-1)" }}>
                🏆 Top compétences
              </h2>
              {analytics.topSkills.length === 0
                ? <div style={{ color: "#aab4c3", fontSize: "14px" }}>Aucune donnée disponible.</div>
                : analytics.topSkills.map((sk, i) => (
                  <div key={sk.intitule} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "9px" }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: i < 3 ? "#1D7A91" : "#f1f5f9",
                      color: i < 3 ? "#fff" : "#638899",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</div>
                    <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, color: "var(--text-1)" }}>{sk.intitule}</span>
                    <span style={{
                      padding: "1px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
                      background: "#EEF7FA", color: "#1D7A91",
                    }}>{sk.count}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}

      {/* Employees */}
      {tab === "employees" && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <input
              type="text" placeholder="Rechercher un employé…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "9px 14px", maxWidth: "400px",
                border: "1.5px solid var(--border)", borderRadius: "10px",
                background: "var(--surface-2)", color: "var(--text-1)", fontSize: "14px", outline: "none",
              }}
            />
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "12px" }}>
            {filteredEmps.length} employé{filteredEmps.length !== 1 ? "s" : ""} avec compétences validées
          </div>
          {filteredEmps.map((emp, i) => <EmployeeCard key={emp.employee_id || i} emp={emp} />)}
          {filteredEmps.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-2)", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
              Aucun employé avec des compétences validées.
            </div>
          )}
        </>
      )}
    </div>
  );
}
