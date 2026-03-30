// src/pages/hr/HRDepartments.jsx
import { useEffect, useState } from "react";
import http from "../../api/http";

const DEPT_COLORS = [
  "#0b2b4b", "#0ea5a0", "#6366f1", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6", "#0891b2",
];

// ── Avatar initials ────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 34 }) {
  const letter = (name || "?")[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: color + "22", border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, color,
    }}>{letter}</div>
  );
}

// ── Manager selector inline ────────────────────────────────────────────────────
function ManagerSelector({ deptId, currentManagerId, managers, color, onSaved }) {
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);

  const current = managers.find(m => m._id === currentManagerId);

  const assign = async (managerId) => {
    setSaving(true);
    try {
      await http.patch(`/departments/${deptId}/assign-manager`, { manager_id: managerId || null });
      onSaved();
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${color}44`,
          background: "var(--surface)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--text-1)",
        }}
      >
        {current
          ? <><Avatar name={current.name} color={color} size={22} />{current.name}</>
          : <span style={{ color: "var(--text-3)" }}>— Aucun manager</span>
        }
        <span style={{ color: "var(--text-3)", fontSize: 10 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 220, overflow: "hidden",
        }}>
          <div
            onClick={() => assign(null)}
            style={{
              padding: "9px 14px", cursor: "pointer", fontSize: 12.5,
              color: "var(--text-3)", borderBottom: "1px solid var(--border)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
          >✕ Retirer le manager</div>
          {managers.map(m => (
            <div
              key={m._id}
              onClick={() => assign(m._id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", cursor: "pointer", fontSize: 12.5,
                fontWeight: m._id === currentManagerId ? 700 : 400,
                background: m._id === currentManagerId ? color + "11" : "#fff",
              }}
              onMouseEnter={e => e.currentTarget.style.background = color + "11"}
              onMouseLeave={e => e.currentTarget.style.background = m._id === currentManagerId ? color + "11" : "#fff"}
            >
              <Avatar name={m.name} color={color} size={24} />
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{m.email}</div>
              </div>
              {m._id === currentManagerId && <span style={{ marginLeft: "auto", color }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add employee dropdown for a department ─────────────────────────────────────
function AddEmployeePanel({ deptId, allEmployees, currentMembers, color, onSaved }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(null); // employeeId being saved

  const memberIds = new Set(currentMembers.map(e => e._id));
  const available = allEmployees.filter(e =>
    !memberIds.has(e._id) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
  );

  const assign = async (empId) => {
    setSaving(empId);
    try {
      await http.patch(`/users/${empId}/department`, { departement_id: deptId });
      onSaved();
      setSearch("");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 11px", borderRadius: 8,
          background: color + "11", border: `1.5px solid ${color}33`,
          color, cursor: "pointer", fontSize: 12, fontWeight: 700,
        }}
      >+ Ajouter employé</button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 280, overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un employé…"
              style={{
                width: "100%", padding: "6px 10px", borderRadius: 7,
                border: "1.5px solid var(--border)", fontSize: 12.5, outline: "none",
                background: "var(--surface-2)", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {available.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                Aucun employé disponible
              </div>
            ) : (
              available.map(e => (
                <div
                  key={e._id}
                  onClick={() => assign(e._id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 12px", cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving === e._id ? 0.5 : 1,
                  }}
                  onMouseEnter={el => el.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={el => el.currentTarget.style.background = "#fff"}
                >
                  <Avatar name={e.name} color={color} size={28} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-1)" }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{e.email}</div>
                  </div>
                  {saving === e._id && <span style={{ marginLeft: "auto", color: "var(--text-3)", fontSize: 11 }}>…</span>}
                </div>
              ))
            )}
          </div>
          <div
            onClick={() => setOpen(false)}
            style={{
              padding: "8px", textAlign: "center", cursor: "pointer",
              fontSize: 12, color: "var(--text-3)", borderTop: "1px solid var(--border)",
            }}
          >Fermer</div>
        </div>
      )}
    </div>
  );
}

// ── Department card ────────────────────────────────────────────────────────────
function DeptCard({ dept, idx, managers, allEmployees, onRefresh }) {
  const [removing, setRemoving] = useState(null); // employeeId being removed
  const color = DEPT_COLORS[idx % DEPT_COLORS.length];

  const removeEmployee = async (empId) => {
    setRemoving(empId);
    try {
      await http.patch(`/users/${empId}/department`, { departement_id: null });
      onRefresh();
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16,
      border: "1px solid var(--border)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      {/* Colored header */}
      <div style={{ background: color, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
              🏢 {dept.name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
              Code: {dept.code}
              {dept.description && ` · ${dept.description}`}
            </div>
          </div>
          <span style={{
            background: "rgba(255,255,255,0.2)", color: "#fff",
            borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700,
          }}>
            {dept.employees.length} membre{dept.employees.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Manager row */}
        <div style={{
          marginTop: 12, display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 10px",
        }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600 }}>
            👤 Manager :
          </span>
          <ManagerSelector
            deptId={String(dept._id)}
            currentManagerId={dept.manager_id}
            managers={managers}
            color="#fff"
            onSaved={onRefresh}
          />
        </div>
      </div>

      {/* Employee list */}
      <div style={{ padding: "10px 0" }}>
        {dept.employees.length === 0 ? (
          <div style={{
            padding: "20px 18px", textAlign: "center",
            color: "var(--text-3)", fontSize: 13,
          }}>Aucun employé dans ce département.</div>
        ) : (
          dept.employees.map(emp => (
            <div key={emp._id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 18px",
              borderBottom: "1px solid var(--border)",
            }}>
              <Avatar name={emp.name} color={color} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {emp.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                  {emp.matricule && <span>{emp.matricule} · </span>}
                  {emp.poste || emp.email}
                </div>
              </div>
              <button
                onClick={() => removeEmployee(emp._id)}
                disabled={removing === emp._id}
                title="Retirer du département"
                style={{
                  background: "transparent", border: "none", cursor: removing === emp._id ? "not-allowed" : "pointer",
                  color: "#cbd5e1", fontSize: 15, padding: "2px 4px", borderRadius: 5,
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}
              >✕</button>
            </div>
          ))
        )}

        {/* Add employee button */}
        <div style={{ padding: "10px 18px 6px" }}>
          <AddEmployeePanel
            deptId={String(dept._id)}
            allEmployees={allEmployees}
            currentMembers={dept.employees}
            color={color}
            onSaved={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}

// ── Unassigned employees section ───────────────────────────────────────────────
function UnassignedSection({ unassigned, departments, onRefresh }) {
  const [assigning, setAssigning] = useState(null); // employeeId → deptId

  const assignToDept = async (empId, deptId) => {
    setAssigning(empId);
    try {
      await http.patch(`/users/${empId}/department`, { departement_id: deptId });
      onRefresh();
    } finally {
      setAssigning(null);
    }
  };

  if (unassigned.length === 0) return null;

  return (
    <div style={{
      marginTop: 28,
      background: "var(--surface)", borderRadius: 16,
      border: "1.5px dashed #dde3f0",
      padding: "18px 22px",
    }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-1)", marginBottom: 14 }}>
        👤 Employés non assignés ({unassigned.length})
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {unassigned.map(emp => (
          <div key={emp._id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 12,
            border: "1px solid #f1f5f9", background: "var(--input-bg)",
          }}>
            <Avatar name={emp.name} color="#6366f1" size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {emp.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{emp.email}</div>
            </div>
            <select
              value=""
              disabled={assigning === emp._id}
              onChange={e => { if (e.target.value) assignToDept(emp._id, e.target.value); }}
              style={{
                padding: "5px 8px", borderRadius: 8,
                border: "1.5px solid var(--border)", background: "var(--surface)",
                fontSize: 12, color: "var(--text-1)", cursor: "pointer", outline: "none",
                maxWidth: 130,
              }}
            >
              <option value="">Assigner…</option>
              {departments.map(d => (
                <option key={String(d._id)} value={String(d._id)}>{d.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create department modal ────────────────────────────────────────────────────
function CreateDeptModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: "", code: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError("Nom et code obligatoires."); return; }
    setSaving(true);
    setError("");
    try {
      await http.post("/departments", {
        name:        form.name.trim(),
        code:        form.code.trim().toUpperCase(),
        description: form.description.trim(),
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.4)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 18, padding: "28px 32px",
        width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>
          🏢 Nouveau département
        </h2>

        {error && (
          <div style={{ marginBottom: 14, padding: "9px 14px", borderRadius: 9, background: "#fffbfa", border: "1px solid #fecdca", color: "#b42318", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={labelStyle}>
            <span>Nom du département *</span>
            <input
              autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: Informatique"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span>Code *</span>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="ex: IT, RH, FIN…"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span>Description</span>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description optionnelle"
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
                color: "#fff", fontWeight: 800, fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >{saving ? "Création…" : "Créer"}</button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "10px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface-2)",
                color: "var(--text-2)", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HRDepartments() {
  const [data,    setData]    = useState(null); // { departments, unassigned, managers }
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    http.get("/departments/with-members")
      .then(r => setData(r.data))
      .catch(() => setError("Impossible de charger les départements."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-2)", fontSize: 14 }}>
        Chargement…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{
          padding: 16, borderRadius: 12, background: "#fffbfa",
          border: "1px solid #fecdca", color: "#b42318",
        }}>{error}</div>
      </div>
    );
  }

  const { departments = [], unassigned = [], managers = [] } = data || {};
  const totalEmployees = departments.reduce((s, d) => s + d.employees.length, 0) + unassigned.length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "var(--text-1)" }}>
            Départements
          </h1>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
            {departments.length} département{departments.length !== 1 ? "s" : ""} ·{" "}
            {totalEmployees} employé{totalEmployees !== 1 ? "s" : ""} ·{" "}
            {unassigned.length > 0 && (
              <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                {unassigned.length} non assigné{unassigned.length !== 1 ? "s" : ""}
              </span>
            )}
            {unassigned.length === 0 && (
              <span style={{ color: "#10b981", fontWeight: 600 }}>tous assignés ✓</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(11,43,75,0.25)",
          }}
        >+ Nouveau département</button>
      </div>

      {/* Department grid */}
      {departments.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--surface-2)", borderRadius: 16,
          border: "1.5px dashed #dde3f0", color: "var(--text-3)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Aucun département créé</div>
          <div style={{ fontSize: 13 }}>Créez votre premier département pour organiser vos équipes.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {departments.map((dept, idx) => (
            <DeptCard
              key={String(dept._id)}
              dept={dept}
              idx={idx}
              managers={managers}
              allEmployees={[
                ...departments.flatMap(d => d._id !== dept._id ? d.employees : []),
                ...unassigned,
              ]}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {/* Unassigned employees */}
      <UnassignedSection
        unassigned={unassigned}
        departments={departments}
        onRefresh={load}
      />

      {/* Create department modal */}
      {showCreate && (
        <CreateDeptModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const labelStyle = {
  display: "grid", gap: 5,
  fontSize: 13, fontWeight: 600, color: "#344054",
};

const inputStyle = {
  padding: "9px 12px", borderRadius: 9,
  border: "1.5px solid var(--border)", background: "var(--input-bg)",
  fontSize: 13.5, outline: "none", color: "var(--text-1)",
};
