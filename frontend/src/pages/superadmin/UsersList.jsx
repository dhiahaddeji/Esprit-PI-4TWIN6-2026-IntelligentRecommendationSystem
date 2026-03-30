// src/pages/superadmin/UsersList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import http from "../../api/http";
import { getStoredUser } from "../../auth/authService";

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  HR: "Responsable RH",
  MANAGER: "Manager",
  EMPLOYEE: "Employé",
};

const ROLE_COLORS = {
  SUPERADMIN: { bg: "#ede9fe", color: "#6d28d9" },
  HR: { bg: "#dbeafe", color: "#1d4ed8" },
  MANAGER: { bg: "#fef3c7", color: "#b45309" },
  EMPLOYEE: { bg: "#d1fae5", color: "#065f46" },
};

const STATUS_COLORS = {
  ACTIVE:    { bg: "#d1fae5", color: "#065f46" },
  INACTIVE:  { bg: "#f1f5f9", color: "var(--text-2)" },
  SUSPENDED: { bg: "#fee2e2", color: "#991b1b" },
};

export default function UsersList() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "SUPERADMIN";

  useEffect(() => {
    http.get("/admin/users")
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setUsers(data);
      })
      .catch(err => {
        setError(err.response?.data?.message || "Impossible de charger la liste");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      await http.delete(`/admin/delete-user/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (err) {
      alert("Erreur : " + (err.response?.data?.message || err.message));
    }
  };

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === "ALL" || u.role === roleFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.matricule || "").toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "var(--text-1)" }}>
            👥 Liste des comptes
          </h1>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: "14px" }}>
            {users.length} utilisateur{users.length !== 1 ? "s" : ""} enregistré{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            to="/admin/create-user"
            style={{
              background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
              boxShadow: "0 4px 14px rgba(59,111,212,0.30)",
            }}
          >
            + Nouveau compte
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Rechercher nom, email, matricule…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: "1 1 240px",
            padding: "9px 14px",
            border: "1.5px solid var(--border)",
            borderRadius: "10px",
            background: "var(--surface-2)",
            color: "var(--text-1)",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{
            padding: "9px 14px",
            border: "1.5px solid var(--border)",
            borderRadius: "10px",
            background: "var(--surface-2)",
            color: "var(--text-1)",
            fontSize: "14px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="ALL">Tous les rôles</option>
          <option value="SUPERADMIN">Super Admin</option>
          <option value="HR">RH</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employé</option>
        </select>
      </div>

      {/* States */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-2)" }}>
          Chargement…
        </div>
      )}

      {error && (
        <div style={{
          padding: "16px 20px",
          background: "#fee2e2",
          color: "#991b1b",
          borderRadius: "12px",
          marginBottom: "16px",
          fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          padding: "60px",
          background: "var(--surface)",
          borderRadius: "16px",
          textAlign: "center",
          color: "var(--text-2)",
          border: "1px solid var(--border)",
          fontSize: "16px",
        }}>
          {users.length === 0
            ? "Aucun compte créé pour l'instant."
            : "Aucun résultat pour cette recherche."}
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{
          background: "var(--surface)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(59,111,212,0.08)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid #dde3f0" }}>
                  {["Utilisateur", "Email", "Matricule", "Rôle", "Statut", ...(isSuperAdmin ? ["Actions"] : [])].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      fontSize: "12px",
                      color: "#3d4f7c",
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => {
                  const rc = ROLE_COLORS[user.role] || { bg: "#f1f5f9", color: "var(--text-2)" };
                  const sc = STATUS_COLORS[user.status] || STATUS_COLORS.INACTIVE;
                  const displayName = user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.name || "—";
                  const initials = displayName !== "—"
                    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
                    : "?";
                  return (
                    <tr key={user._id} style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
                            color: "#fff", display: "flex", alignItems: "center",
                            justifyContent: "center", fontWeight: 700, fontSize: "13px",
                            flexShrink: 0,
                          }}>{initials}</div>
                          <span style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "14px" }}>
                            {displayName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)", fontSize: "13.5px" }}>
                        {user.email}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)", fontSize: "13px", fontFamily: "monospace" }}>
                        {user.matricule || "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: "999px", fontSize: "12px",
                          fontWeight: 700, background: rc.bg, color: rc.color,
                        }}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: "999px", fontSize: "12px",
                          fontWeight: 600, background: sc.bg, color: sc.color,
                        }}>
                          {user.status || "—"}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Link
                              to={`/admin/edit-user/${user._id}`}
                              style={{
                                padding: "5px 12px", borderRadius: "7px",
                                background: "#eff6ff", color: "#3b6fd4",
                                textDecoration: "none", fontSize: "13px", fontWeight: 600,
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              Modifier
                            </Link>
                            <button
                              onClick={() => handleDelete(user._id)}
                              style={{
                                padding: "5px 12px", borderRadius: "7px",
                                background: "#fee2e2", color: "#dc2626",
                                border: "1px solid #fecaca", fontSize: "13px",
                                fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
