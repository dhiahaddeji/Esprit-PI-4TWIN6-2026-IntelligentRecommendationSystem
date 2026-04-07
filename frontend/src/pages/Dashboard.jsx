// src/pages/Dashboard.jsx  — dashboards réels par rôle
import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import http from "../api/http";
import { getStoredUser } from "../auth/authService";

// ─── Palettes ────────────────────────────────────────────────────────────────

const ROLE_META = {
  SUPERADMIN: { label: "Super Admin",     color: "#1D7A91", bg: "#EEF7FA" },
  HR:         { label: "Responsable RH",  color: "#155B6E", bg: "#D6EEF3" },
  MANAGER:    { label: "Manager",         color: "#C9952A", bg: "#FBF0DC" },
  EMPLOYEE:   { label: "Employé",         color: "#145C2B", bg: "#E8F5ED" },
};

const STATUS_META = {
  DRAFT:            { label: "Brouillon",       color: "var(--text-3)", bg: "#f1f5f9" },
  AI_SUGGESTED:     { label: "Analyse IA",      color: "#1D7A91", bg: "#EEF7FA" },
  HR_VALIDATED:     { label: "Validé RH",       color: "#155B6E", bg: "#EEF7FA" },
  SENT_TO_MANAGER:  { label: "Soumis Manager",  color: "#C9952A", bg: "#FEF6E4" },
  MANAGER_CONFIRMED:{ label: "Confirmé",        color: "#145C2B", bg: "#E8F5ED" },
  NOTIFIED:         { label: "Clôturé",         color: "var(--text-2)", bg: "#EEF7FA" },
};

const TYPE_META = {
  formation:     { label: "Formation",      color: "#1D7A91" },
  certification: { label: "Certification",  color: "#C9952A" },
  projet:        { label: "Projet",         color: "#145C2B" },
  mission:       { label: "Mission",        color: "#7A4A00" },
  audit:         { label: "Audit",          color: "#8B1A1A" },
};

const PIE_COLORS = ["#1D7A91", "#C9952A", "#145C2B", "#7A4A00", "#8B1A1A", "#155B6E"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800)return `${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || "—";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, value, label, sub, color = "var(--text-1)", loading }) {
  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16, padding: "20px 22px",
      border: "1px solid var(--border)", boxShadow: "var(--shadow)",
      display: "flex", flexDirection: "column", gap: 8,
      transition: "background 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        {loading && <span style={{ fontSize: 11, color: "var(--text-3)" }}>…</span>}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>
        {loading ? <Skeleton w={60} h={32} /> : value}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-2)" }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, icon, children, action }) {
  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16,
      border: "1px solid var(--border)", boxShadow: "var(--shadow)",
      overflow: "hidden", transition: "background 0.2s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid var(--border-2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text-1)" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function Skeleton({ w = "100%", h = 16, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "var(--surface-2)",
      backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
    }} />
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: "var(--text-2)", bg: "#EEF7FA" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
      background: m.bg, color: m.color,
    }}>{m.label}</span>
  );
}

function EmptyState({ icon = "📭", text }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-3)" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{text}</div>
    </div>
  );
}

// ─── SUPERADMIN Dashboard ────────────────────────────────────────────────────

function SuperAdminDash() {
  const [users,      setUsers]      = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const dataReady = !loading && (users.length > 0 || activities.length > 0);

  useEffect(() => {
    Promise.all([
      http.get("/admin/users"),
      http.get("/activities"),
    ]).then(([u, a]) => {
      setUsers(Array.isArray(u.data) ? u.data : []);
      setActivities(Array.isArray(a.data) ? a.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const byRole    = countBy(users, "role");
  const byStatus  = countBy(activities, "status");

  const roleChart = Object.entries(byRole).map(([name, value]) => ({
    name: ROLE_META[name]?.label || name, value,
    color: ROLE_META[name]?.color || "#638899",
  }));

  const statusChart = Object.entries(byStatus).map(([k, v]) => ({
    name: STATUS_META[k]?.label || k, value: v,
  }));

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const recentActivities = [...activities].slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KpiCard icon="👥" value={users.length}                         label="Total comptes"    loading={loading} color="#0B2D38" />
        <KpiCard icon="👤" value={byRole.EMPLOYEE || 0}                  label="Employés"         loading={loading} color="#145C2B" />
        <KpiCard icon="🏆" value={byRole.MANAGER  || 0}                  label="Managers"         loading={loading} color="#1D7A91" />
        <KpiCard icon="🧑‍💼" value={byRole.HR       || 0}                 label="Responsables RH"  loading={loading} color="#155B6E" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        <KpiCard icon="📅" value={activities.length}                     label="Total activités"  loading={loading} color="#1D7A91" />
        <KpiCard icon="📋" value={byStatus.NOTIFIED || 0}               label="Activités clôturées" loading={loading} color="#456070"
          sub={`${activities.length - (byStatus.NOTIFIED || 0)} en cours`} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Répartition des comptes par rôle" icon="🎭">
          {loading ? <Skeleton h={240} r={12} /> : roleChart.length === 0 ? <EmptyState text="Aucun compte" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={roleChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {roleChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} comptes`, n]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Activités par statut" icon="📊">
          {loading ? <Skeleton h={240} r={12} /> : statusChart.length === 0 ? <EmptyState text="Aucune activité" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusChart} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#1D7A91" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Recent tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Derniers comptes créés" icon="👤">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={40} />)}
            </div>
          ) : recentUsers.length === 0 ? <EmptyState text="Aucun compte" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentUsers.map(u => {
                const m = ROLE_META[u.role] || ROLE_META.EMPLOYEE;
                return (
                  <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-2)" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: m.bg, color: m.color, fontWeight: 700, fontSize: 13,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{(u.name || "?")[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{u.email}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: m.bg, color: m.color }}>{m.label}</span>
                      <span style={{ fontSize: 10.5, color: "#9BBCC7" }}>{timeAgo(u.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Dernières activités" icon="📅">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={40} />)}
            </div>
          ) : recentActivities.length === 0 ? <EmptyState text="Aucune activité" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentActivities.map(a => {
                const tm = TYPE_META[a.type] || { label: a.type, color: "var(--text-2)" };
                return (
                  <div key={a._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-2)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: `${tm.color}18`, color: tm.color }}>{tm.label}</span>
                        <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>{timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <AiInsightsWidget role="SUPERADMIN" ready={dataReady} payload={{
        totalUsers: users.length,
        usersByRole: countBy(users, "role"),
        totalActivities: activities.length,
      }} />
    </div>
  );
}

// ─── HR Dashboard ─────────────────────────────────────────────────────────────

function HRDash() {
  const [users,      setUsers]      = useState([]);
  const [activities, setActivities] = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [pending,    setPending]    = useState([]);
  const [departments,setDepartments]= useState([]);
  const [loading,    setLoading]    = useState(true);
  const dataReady = !loading;

  useEffect(() => {
    Promise.all([
      http.get("/admin/users"),
      http.get("/activities"),
      http.get("/skills/analytics"),
      http.get("/skills/pending"),
      http.get("/departments"),
    ]).then(([u, a, sk, p, d]) => {
      setUsers(Array.isArray(u.data) ? u.data : []);
      setActivities(Array.isArray(a.data) ? a.data : []);
      setAnalytics(sk.data || null);
      setPending(Array.isArray(p.data) ? p.data : []);
      setDepartments(Array.isArray(d.data) ? d.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const employees    = users.filter(u => u.role === "EMPLOYEE");
  const openActs     = activities.filter(a => a.status !== "NOTIFIED");
  const byStatus     = countBy(activities, "status");
  const byType       = countBy(activities, "type");
  const recentActs   = [...activities].slice(0, 6);

  const statusChart  = Object.entries(byStatus).map(([k, v]) => ({
    name: STATUS_META[k]?.label || k, value: v,
  }));

  const typeChart = Object.entries(byType).map(([k, v], i) => ({
    name: TYPE_META[k]?.label || k, value: v, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const deptChart = (analytics?.byDepartment || [])
    .filter(d => d.avgScore > 0)
    .map(d => ({ name: d.department === "Non assigné" ? "Non assigné" : d.department, value: d.avgScore }))
    .slice(0, 8);

  const topSkills = (analytics?.topSkills || []).slice(0, 8).map(s => ({
    name: s.name.length > 16 ? s.name.slice(0, 14) + "…" : s.name,
    value: s.count,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KpiCard icon="👥" value={employees.length}           label="Employés"              loading={loading} color="#145C2B"
          sub={`${analytics?.coveragePercent ?? "—"}% avec compétences`} />
        <KpiCard icon="📅" value={openActs.length}            label="Activités en cours"    loading={loading} color="#1D7A91"
          sub={`${activities.length} total`} />
        <KpiCard icon="⏳" value={pending.length}             label="Demandes compétences"  loading={loading} color="#C9952A"
          sub="en attente de validation" />
        <KpiCard icon="🏢" value={departments.length}         label="Départements"          loading={loading} color="#1D7A91"
          sub={`score moyen ${analytics?.avgGlobalScore ?? "—"}`} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        <Panel title="Activités par statut" icon="📊">
          {loading ? <Skeleton h={240} r={12} /> : statusChart.length === 0 ? <EmptyState text="Aucune activité" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusChart} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#155B6E" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Types d'activités" icon="🎯">
          {loading ? <Skeleton h={240} r={12} /> : typeChart.length === 0 ? <EmptyState text="Aucune activité" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={typeChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {typeChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}`, n]} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel title="Score moyen par département" icon="🏢">
          {loading ? <Skeleton h={220} r={12} /> : deptChart.length === 0 ? (
            <EmptyState icon="🏢" text="Assignez des employés à des départements pour voir leurs scores" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptChart} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={v => [`${v}/100`]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#145C2B" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Top 8 compétences" icon="🧠">
          {loading ? <Skeleton h={220} r={12} /> : topSkills.length === 0 ? (
            <EmptyState icon="🧠" text="Ajoutez des compétences à vos employés pour voir les statistiques" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topSkills} layout="vertical" margin={{ top: 4, right: 40, left: 80, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => [`${v} employés`]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#1D7A91" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Recent activities */}
      <Panel title="Activités récentes" icon="📋">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <Skeleton key={i} h={44} />)}
          </div>
        ) : recentActs.length === 0 ? <EmptyState text="Aucune activité créée pour l'instant" /> : (
          <div>
            {recentActs.map(a => {
              const tm = TYPE_META[a.type] || { label: a.type, color: "var(--text-2)" };
              return (
                <div key={a._id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${tm.color}15`, color: tm.color,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>
                    {a.type === "formation" ? "📚" : a.type === "certification" ? "🎖️" : a.type === "projet" ? "🚀" : a.type === "mission" ? "🎯" : "🔍"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                      {a.seats} place{a.seats !== 1 ? "s" : ""} · {a.participants?.length || 0} participant{(a.participants?.length || 0) !== 1 ? "s" : ""} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <AiInsightsWidget role="HR" ready={dataReady} payload={{
        totalEmployees: users.filter(u => u.role === "EMPLOYEE").length,
        validatedFiches: analytics?.totalValidated || 0,
        pendingFiches: pending.length,
        activities,
      }} />
    </div>
  );
}

// ─── MANAGER Dashboard ────────────────────────────────────────────────────────

function ManagerDash({ me }) {
  const myId = me?.id || me?.userId;
  const [activities, setActivities] = useState([]);
  const [pending,    setPending]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const dataReady = !loading;

  useEffect(() => {
    Promise.all([
      http.get("/activities"),
      http.get("/skills/pending"),
    ]).then(([a, p]) => {
      const all = Array.isArray(a.data) ? a.data : [];
      setActivities(all.filter(act => act.managerId === myId));
      setPending(Array.isArray(p.data) ? p.data : []);
    }).finally(() => setLoading(false));
  }, [myId]);

  const byStatus      = countBy(activities, "status");
  const awaitingMe    = activities.filter(a => a.status === "SENT_TO_MANAGER");
  const confirmed     = activities.filter(a => ["MANAGER_CONFIRMED", "NOTIFIED"].includes(a.status));

  const statusChart = Object.entries(byStatus).map(([k, v], i) => ({
    name: STATUS_META[k]?.label || k, value: v, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KpiCard icon="📅" value={activities.length}  label="Mes activités"         loading={loading} color="#1D7A91" />
        <KpiCard icon="⏰" value={awaitingMe.length}  label="En attente de mon avis" loading={loading} color="#C9952A"
          sub={awaitingMe.length > 0 ? "Action requise" : "Tout est traité ✓"} />
        <KpiCard icon="✅" value={confirmed.length}   label="Confirmées"             loading={loading} color="#145C2B" />
        <KpiCard icon="🎯" value={pending.length}     label="Compétences à valider"  loading={loading} color="#1D7A91"
          sub="demandes en attente" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 20 }}>
        <Panel title="Mes activités par statut" icon="🎭">
          {loading ? <Skeleton h={240} r={12} /> : statusChart.length === 0 ? <EmptyState text="Aucune activité assignée" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {statusChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Activités nécessitant mon action" icon="⚡"
          action={awaitingMe.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: "#FEF6E4", color: "#C9952A", border: "1px solid #FEF6E4" }}>
              {awaitingMe.length} en attente
            </span>
          )}
        >
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={44} />)}
            </div>
          ) : awaitingMe.length === 0 ? (
            <EmptyState icon="✅" text="Aucune activité en attente de votre validation" />
          ) : (
            awaitingMe.map(a => (
              <div key={a._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border-2)" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C9952A", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)" }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                    {a.seats} place{a.seats !== 1 ? "s" : ""} · {a.participants?.length || 0} candidats · {timeAgo(a.createdAt)}
                  </div>
                </div>
                <a href={`/manager/activities/${a._id}`} style={{ fontSize: 12, fontWeight: 700, color: "#155B6E", textDecoration: "none", whiteSpace: "nowrap" }}>
                  Examiner →
                </a>
              </div>
            ))
          )}
        </Panel>
      </div>

      {/* All my activities */}
      <Panel title="Toutes mes activités" icon="📋">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <Skeleton key={i} h={44} />)}
          </div>
        ) : activities.length === 0 ? <EmptyState text="Aucune activité ne vous a encore été assignée" /> : (
          activities.map(a => {
            const tm = TYPE_META[a.type] || { label: a.type, color: "var(--text-2)" };
            return (
              <div key={a._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border-2)" }}>
                <span style={{ fontSize: 18 }}>
                  {a.type === "formation" ? "📚" : a.type === "certification" ? "🎖️" : a.type === "projet" ? "🚀" : a.type === "mission" ? "🎯" : "🔍"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: tm.color }}>{tm.label}</span> · {a.seats} places · {timeAgo(a.createdAt)}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            );
          })
        )}
      </Panel>

      <AiInsightsWidget role="MANAGER" ready={dataReady} payload={{
        pendingFiches: pending.length,
        teamSize: activities.length,
        activities,
      }} />
    </div>
  );
}

// ─── EMPLOYEE Dashboard ───────────────────────────────────────────────────────

function EmployeeDash() {
  const [invitations,    setInvitations]    = useState([]);
  const [participations, setParticipations] = useState([]);
  const [skills,         setSkills]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const dataReady = !loading;

  useEffect(() => {
    Promise.all([
      http.get("/invitations/me"),
      http.get("/participations/me"),
      http.get("/skills/mine"),
    ]).then(([inv, part, sk]) => {
      setInvitations(Array.isArray(inv.data) ? inv.data : []);
      setParticipations(Array.isArray(part.data) ? part.data : []);
      setSkills(sk.data || null);
    }).finally(() => setLoading(false));
  }, []);

  const pending     = invitations.filter(i => i.status === "PENDING");
  const approved    = skills?.approved || {};
  const totalSkills = (approved.savoir?.length || 0) + (approved.savoir_faire?.length || 0) + (approved.savoir_etre?.length || 0);

  const skillTypeChart = [
    { name: "Savoir",       value: approved.savoir?.length       || 0, color: "#1D7A91" },
    { name: "Savoir-faire", value: approved.savoir_faire?.length || 0, color: "#1D7A91" },
    { name: "Savoir-être",  value: approved.savoir_etre?.length  || 0, color: "#145C2B" },
  ].filter(s => s.value > 0);

  const LEVEL_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3, EXPERT: 4 };
  const LEVEL_COLORS = { LOW: "#638899", MEDIUM: "#1D7A91", HIGH: "#145C2B", EXPERT: "#1D7A91" };
  const LEVEL_LABELS = { LOW: "Débutant", MEDIUM: "Intermédiaire", HIGH: "Avancé", EXPERT: "Expert" };

  const allSkills = [
    ...(approved.savoir       || []).map(s => ({ ...s, cat: "Savoir" })),
    ...(approved.savoir_faire || []).map(s => ({ ...s, cat: "Savoir-faire" })),
    ...(approved.savoir_etre  || []).map(s => ({ ...s, cat: "Savoir-être" })),
  ].sort((a, b) => (LEVEL_ORDER[b.level] || 0) - (LEVEL_ORDER[a.level] || 0));

  const score = approved.globalScore || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KpiCard icon="🔔" value={invitations.length}    label="Mes invitations"   loading={loading} color="#C9952A"
          sub={`${pending.length} en attente`} />
        <KpiCard icon="✅" value={participations.length} label="Mes participations" loading={loading} color="#145C2B" />
        <KpiCard icon="🧠" value={totalSkills}            label="Mes compétences"   loading={loading} color="#1D7A91"
          sub={skills?.pending ? "1 demande en attente" : "à jour"} />
        <KpiCard icon="📈" value={`${score}/100`}         label="Mon score global"  loading={loading}
          color={score >= 70 ? "#145C2B" : score >= 40 ? "#C9952A" : "#8B1A1A"}
          sub={score >= 70 ? "Très bon niveau" : score >= 40 ? "Niveau correct" : "À améliorer"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 20 }}>
        {/* Score gauge */}
        <Panel title="Mon score global" icon="📈">
          {loading ? <Skeleton h={200} r={12} /> : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
              <div style={{ position: "relative", width: 150, height: 150 }}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={[{ value: score }, { value: 100 - score }]}
                      dataKey="value" startAngle={90} endAngle={-270}
                      innerRadius={52} outerRadius={70}
                    >
                      <Cell fill={score >= 70 ? "#145C2B" : score >= 40 ? "#C9952A" : "#8B1A1A"} />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text-1)" }}>{score}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>/ 100</div>
                </div>
              </div>
              {skillTypeChart.length > 0 ? (
                <div style={{ width: "100%" }}>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie data={skillTypeChart} dataKey="value" nameKey="name" innerRadius={28} outerRadius={44} paddingAngle={3}>
                        {skillTypeChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--text-3)", textAlign: "center" }}>
                  Ajoutez des compétences via<br />votre espace compétences
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Skills list */}
        <Panel title="Mes compétences approuvées" icon="🧠">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={36} />)}
            </div>
          ) : allSkills.length === 0 ? (
            <EmptyState icon="🧠" text="Aucune compétence approuvée — soumettez une demande de mise à jour" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {allSkills.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 10, background: "var(--surface-2)",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.cat}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 9px",
                    borderRadius: 999, background: `${LEVEL_COLORS[s.level]}18`,
                    color: LEVEL_COLORS[s.level] || "#638899",
                  }}>{LEVEL_LABELS[s.level] || s.level}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Invitations */}
      <Panel title="Mes invitations récentes" icon="🔔">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2].map(i => <Skeleton key={i} h={44} />)}
          </div>
        ) : invitations.length === 0 ? <EmptyState text="Aucune invitation reçue pour l'instant" /> : (
          invitations.slice(0, 5).map(inv => {
            const statusColor = inv.status === "ACCEPTED" ? "#145C2B" : inv.status === "DECLINED" ? "#8B1A1A" : "#C9952A";
            const statusLabel = inv.status === "ACCEPTED" ? "Acceptée" : inv.status === "DECLINED" ? "Refusée" : "En attente";
            return (
              <div key={inv._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border-2)" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${statusColor}15`, color: statusColor,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>🔔</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)" }}>{inv.activityTitle || "Activité"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{timeAgo(inv.createdAt)}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: `${statusColor}15`, color: statusColor }}>
                  {statusLabel}
                </span>
              </div>
            );
          })
        )}
      </Panel>

      <AiInsightsWidget role="EMPLOYEE" ready={dataReady} payload={{
        competences: skills?.approved ? [
          ...(skills.approved.savoir || []),
          ...(skills.approved.savoir_faire || []),
          ...(skills.approved.savoir_etre || []),
        ] : [],
        ficheEtat: skills?.pending ? "submitted" : "draft",
        invitations,
      }} />
    </div>
  );
}

// ─── AI Insights Widget (powered by Claude) ──────────────────────────────────

function AiInsightsWidget({ role, payload, ready }) {
  const [insight, setInsight] = useState(null);
  const [tips,    setTips]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (!ready || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    http.post("/ai/dashboard-insights", { data: payload })
      .then(r => { setInsight(r.data.insight); setTips(r.data.tips || []); })
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, [ready, payload]);

  const ROLE_GRADIENT = {
    SUPERADMIN: "linear-gradient(135deg,#0b1e3d 0%,#1a3a6b 100%)",
    HR:         "linear-gradient(135deg,#1e3a8a 0%,#155B6E 100%)",
    MANAGER:    "linear-gradient(135deg,#0c4a6e 0%,#1D7A91 100%)",
    EMPLOYEE:   "linear-gradient(135deg,#064e3b 0%,#145C2B 100%)",
  };

  return (
    <div style={{
      background: ROLE_GRADIENT[role] || "linear-gradient(135deg,#0B2D38,#155B6E)",
      borderRadius: 16, padding: "20px 24px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      color: "#fff", position: "relative", overflow: "hidden",
    }}>
      {/* Decorative blob */}
      <div style={{
        position: "absolute", top: -30, right: -30, width: 120, height: 120,
        borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -20, right: 60, width: 70, height: 70,
        borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>Assistant IA · GPT-4o</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>Analyse personnalisée en temps réel</div>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
          color: "#fff", cursor: "pointer", padding: "4px 10px", fontSize: 12, fontWeight: 600,
        }}>{open ? "Réduire" : "Afficher"}</button>
      </div>

      {open && (
        loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.8 }}>
            <div style={{
              width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)",
              borderTopColor: "#fff", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 13 }}>Claude analyse vos données…</span>
          </div>
        ) : insight ? (
          <>
            <p style={{ margin: "0 0 16px 0", fontSize: 14, lineHeight: 1.6, opacity: 0.95 }}>
              {insight}
            </p>
            {tips.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tips.map((tip, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: "rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 14px",
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                      {["💡", "🎯", "🚀"][i] || "✅"}
                    </span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.92 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const me   = getStoredUser();
  const role = me?.role;
  const meta = ROLE_META[role] || { label: role, color: "var(--text-1)", bg: "#EEF7FA" };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 28,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "var(--text-1)" }}>
              {greet()}, {me?.name?.split(" ")[0] || "—"} 👋
            </h1>
            <p style={{ margin: "5px 0 0", color: "var(--text-2)", fontSize: 14 }}>
              Vue d'ensemble en temps réel · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 18px", borderRadius: 12,
            background: meta.bg, border: `1px solid ${meta.color}30`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: meta.color, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 15,
            }}>
              {(me?.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-1)" }}>{me?.name}</div>
              <div style={{ fontSize: 11.5, color: meta.color, fontWeight: 600 }}>{meta.label}</div>
            </div>
          </div>
        </div>

        {/* Role-specific content */}
        {role === "SUPERADMIN" && <SuperAdminDash />}
        {role === "HR"         && <HRDash />}
        {role === "MANAGER"    && <ManagerDash me={me} />}
        {role === "EMPLOYEE"   && <EmployeeDash />}
      </div>
    </>
  );
}
