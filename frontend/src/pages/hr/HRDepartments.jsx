// src/pages/hr/HRDepartments.jsx
import { useEffect, useState } from "react";
import http from "../../api/http";

const DEPT_COLORS = [
  "#0b2b4b", "#0ea5a0", "#f6a700", "#6366f1",
  "#10b981", "#ef4444", "#8b5cf6", "#f59e0b",
];

export default function HRDepartments() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    http.get("/users/employees")
      .then((r) => setEmployees(r.data))
      .catch(() => setError("Impossible de charger les employés."))
      .finally(() => setLoading(false));
  }, []);

  // Grouper par département
  const departments = employees.reduce((acc, emp) => {
    const dept = emp.departement_id || "Non assigné";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  const deptList = Object.entries(departments).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (loading) return <div style={{ padding: 32 }}>Chargement…</div>;
  if (error)   return <div style={{ padding: 32, color: "#dc2626" }}>{error}</div>;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 700 }}>Départements</h1>
      <p style={{ margin: "0 0 24px", color: "#64748b" }}>
        {deptList.length} département{deptList.length > 1 ? "s" : ""} — {employees.length} employé{employees.length > 1 ? "s" : ""}
      </p>

      {deptList.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          Aucun département trouvé.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {deptList.map(([dept, members], idx) => (
          <div key={dept} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,.05)",
          }}>
            {/* Header coloré */}
            <div style={{
              background: DEPT_COLORS[idx % DEPT_COLORS.length],
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                🏢 {dept}
              </span>
              <span style={{
                background: "rgba(255,255,255,.2)",
                color: "#fff",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 600,
              }}>
                {members.length} membre{members.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Liste des membres */}
            <ul style={{ margin: 0, padding: "10px 0", listStyle: "none" }}>
              {members.map((emp) => (
                <li key={emp._id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 18px",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: DEPT_COLORS[idx % DEPT_COLORS.length] + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 13,
                    color: DEPT_COLORS[idx % DEPT_COLORS.length],
                    flexShrink: 0,
                  }}>
                    {(emp.name || emp.firstName || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name || `${emp.firstName} ${emp.lastName}`}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{emp.matricule} • {emp.email}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
