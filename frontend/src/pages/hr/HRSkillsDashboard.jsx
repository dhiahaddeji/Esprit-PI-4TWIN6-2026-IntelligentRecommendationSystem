// src/pages/hr/HRSkillsDashboard.jsx
import { useState, useEffect } from "react";
import http from "../../api/http";

const LEVEL_COLORS = {
  LOW:    { bg: "#fee2e2", color: "#dc2626", label: "Faible" },
  MEDIUM: { bg: "#fef3c7", color: "#d97706", label: "Moyen" },
  HIGH:   { bg: "#dbeafe", color: "#2563eb", label: "Élevé" },
  EXPERT: { bg: "#d1fae5", color: "#059669", label: "Expert" },
};

function StatCard({ icon, label, value, sub, color = "#3b6fd4" }) {
  return (
    <div style={{
      background: "#fff", borderRadius: "14px", padding: "20px 22px",
      border: "1px solid #dde3f0", boxShadow: "0 4px 16px rgba(59,111,212,0.07)",
    }}>
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: 800, color, marginBottom: "2px" }}>{value}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a2340" }}>{label}</div>
      {sub && <div style={{ fontSize: "12px", color: "#6b7a99", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function ScoreBar({ score, max = 100 }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct >= 75 ? "#059669" : pct >= 50 ? "#2563eb" : pct >= 25 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: "#f1f5f9", overflow: "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

function EmployeeSkillCard({ emp }) {
  const [open, setOpen] = useState(false);
  const allSkills = [...(emp.savoir || []), ...(emp.savoir_faire || []), ...(emp.savoir_etre || [])];
  const name = emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.name || "—";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{
      background: "#fff", borderRadius: "12px", border: "1px solid #dde3f0",
      overflow: "hidden", marginBottom: "8px",
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 16px", cursor: "pointer",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
          color: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 700, fontSize: "13px",
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a2340" }}>{name}</div>
          <div style={{ fontSize: "12px", color: "#6b7a99" }}>
            {allSkills.length} compétence{allSkills.length !== 1 ? "s" : ""}
            {emp.departement_id ? ` · ${emp.departement_id}` : ""}
          </div>
        </div>
        <div style={{ minWidth: "120px" }}>
          <ScoreBar score={emp.globalScore || 0} />
        </div>
        <span style={{ color: "#6b7a99", fontSize: "14px", marginLeft: "4px" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && allSkills.length > 0 && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #f1f5f9" }}>
          {[
            { key: "savoir",       label: "Savoir",      icon: "📚", color: "#3b6fd4" },
            { key: "savoir_faire", label: "Savoir-faire", icon: "🛠️", color: "#0891b2" },
            { key: "savoir_etre",  label: "Savoir-être",  icon: "🤝", color: "#7c3aed" },
          ].map(cat => {
            const skills = emp[cat.key] || [];
            if (!skills.length) return null;
            return (
              <div key={cat.key} style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: cat.color, marginBottom: "5px" }}>
                  {cat.icon} {cat.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {skills.map((sk, i) => {
                    const lc = LEVEL_COLORS[sk.level] || LEVEL_COLORS.MEDIUM;
                    return (
                      <span key={i} style={{
                        padding: "2px 8px", borderRadius: "999px",
                        background: lc.bg, color: lc.color,
                        fontSize: "11.5px", fontWeight: 600,
                        border: `1px solid ${lc.color}30`,
                      }}>
                        {sk.name} · {lc.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && allSkills.length === 0 && (
        <div style={{ padding: "10px 16px", color: "#aab4c3", fontSize: "13px", borderTop: "1px solid #f1f5f9" }}>
          Aucune compétence enregistrée.
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
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [tab, setTab]             = useState("overview");

  useEffect(() => {
    Promise.all([
      http.get("/skills/analytics"),
      http.get("/skills/employees-skills"),
    ])
      .then(([a, e]) => {
        setAnalytics(a.data);
        setEmployees(Array.isArray(e.data) ? e.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEmps = employees.filter(emp => {
    const name = (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.name || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const allSkills = [...(emp.savoir || []), ...(emp.savoir_faire || []), ...(emp.savoir_etre || [])];
    const matchLevel = levelFilter === "ALL" || allSkills.some(s => s.level === levelFilter);
    return matchSearch && matchLevel;
  });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7a99" }}>Chargement…</div>;

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "#1a2340" }}>
          📊 Tableau de bord — Compétences
        </h1>
        <p style={{ margin: 0, color: "#6b7a99", fontSize: "14px" }}>
          Visualisation globale des compétences, gaps et progression par département
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {[
          { val: "overview",   label: "📊 Vue d'ensemble" },
          { val: "employees",  label: "👥 Employés" },
          { val: "departments", label: "🏢 Départements" },
        ].map(t => (
          <button key={t.val} onClick={() => setTab(t.val)} style={{
            padding: "8px 18px", borderRadius: "10px", cursor: "pointer",
            fontWeight: 700, fontSize: "13.5px", border: "none",
            background: tab === t.val ? "#3b6fd4" : "#f1f5f9",
            color: tab === t.val ? "#fff" : "#64748b",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {tab === "overview" && analytics && (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            <StatCard icon="👥" label="Employés total" value={analytics.totalEmployees} color="#3b6fd4" />
            <StatCard icon="🎯" label="Avec compétences" value={analytics.withSkills}
              sub={`${analytics.coveragePercent}% de couverture`} color="#059669" />
            <StatCard icon="⭐" label="Score moyen global" value={analytics.avgGlobalScore}
              sub="sur 100" color="#d97706" />
            <StatCard icon="🏆" label="Sans compétences" value={analytics.totalEmployees - analytics.withSkills}
              sub="à compléter" color="#dc2626" />
          </div>

          {/* Top skills */}
          <div style={{
            background: "#fff", borderRadius: "14px", border: "1px solid #dde3f0",
            padding: "20px 24px", boxShadow: "0 4px 16px rgba(59,111,212,0.07)",
          }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700, color: "#1a2340" }}>
              🏆 Top compétences les plus répandues
            </h2>
            {analytics.topSkills.length === 0
              ? <div style={{ color: "#aab4c3", fontSize: "14px" }}>Aucune donnée disponible.</div>
              : analytics.topSkills.map((sk, i) => (
                <div key={sk.name} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: i < 3 ? "#3b6fd4" : "#f1f5f9",
                    color: i < 3 ? "#fff" : "#64748b",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "#1a2340" }}>{sk.name}</div>
                  <div style={{ width: "180px" }}>
                    <div style={{ height: 8, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.round((sk.count / analytics.totalEmployees) * 100)}%`,
                        height: "100%", background: "#3b6fd4", borderRadius: 4,
                      }} />
                    </div>
                  </div>
                  <div style={{ minWidth: 60, fontSize: "13px", color: "#6b7a99", textAlign: "right" }}>
                    {sk.count} / {analytics.totalEmployees}
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {/* ─── Employees ─── */}
      {tab === "employees" && (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            <input
              type="text" placeholder="Rechercher un employé…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                flex: "1 1 200px", padding: "9px 14px",
                border: "1.5px solid #dde3f0", borderRadius: "10px",
                background: "#f5f7ff", color: "#1a2340", fontSize: "14px", outline: "none",
              }}
            />
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{
              padding: "9px 14px", border: "1.5px solid #dde3f0", borderRadius: "10px",
              background: "#f5f7ff", color: "#1a2340", fontSize: "14px", outline: "none", cursor: "pointer",
            }}>
              <option value="ALL">Tous les niveaux</option>
              <option value="LOW">Faible</option>
              <option value="MEDIUM">Moyen</option>
              <option value="HIGH">Élevé</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
          <div style={{ fontSize: "13px", color: "#6b7a99", marginBottom: "12px" }}>
            {filteredEmps.length} employé{filteredEmps.length !== 1 ? "s" : ""}
          </div>
          {filteredEmps.map(emp => <EmployeeSkillCard key={emp._id} emp={emp} />)}
          {filteredEmps.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7a99", background: "#fff", borderRadius: 14, border: "1px solid #dde3f0" }}>
              Aucun employé correspondant.
            </div>
          )}
        </>
      )}

      {/* ─── Departments ─── */}
      {tab === "departments" && analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {analytics.byDepartment.length === 0 && (
            <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "#6b7a99" }}>
              Aucune donnée par département. Assignez des départements aux employés.
            </div>
          )}
          {analytics.byDepartment.map(dept => (
            <div key={dept.department} style={{
              background: "#fff", borderRadius: "14px", border: "1px solid #dde3f0",
              padding: "18px 20px", boxShadow: "0 4px 16px rgba(59,111,212,0.07)",
            }}>
              <div style={{ fontWeight: 800, fontSize: "15px", color: "#1a2340", marginBottom: "4px" }}>
                🏢 {dept.department}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7a99", marginBottom: "14px" }}>
                {dept.employeeCount} employé{dept.employeeCount !== 1 ? "s" : ""}
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#3d4f7c", fontWeight: 600, marginBottom: "5px" }}>
                  Score moyen
                </div>
                <ScoreBar score={dept.avgScore} />
              </div>
              {dept.topSkills.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", color: "#3d4f7c", fontWeight: 600, marginBottom: "6px" }}>
                    Compétences clés
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {dept.topSkills.map(sk => (
                      <span key={sk} style={{
                        padding: "2px 8px", borderRadius: "999px",
                        background: "#eff6ff", color: "#3b6fd4",
                        fontSize: "11.5px", fontWeight: 600,
                        border: "1px solid #bfdbfe",
                      }}>{sk}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
