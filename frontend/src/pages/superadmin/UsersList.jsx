// src/pages/superadmin/UsersList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import http from "../../api/http";
import { getStoredUser } from "../../auth/authService";
import MicButton from "../../components/MicButton";
import * as XLSX from "xlsx";

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  HR: "Responsable RH",
  MANAGER: "Manager",
  EMPLOYEE: "Employé",
};

const ROLE_COLORS = {
  SUPERADMIN: { bg: "#FBF0DC", color: "#155B6E" },
  HR: { bg: "#D6EEF3", color: "#155B6E" },
  MANAGER: { bg: "#FEF6E4", color: "#b45309" },
  EMPLOYEE: { bg: "#E8F5ED", color: "#065f46" },
};

const STATUS_COLORS = {
  ACTIVE:    { bg: "#E8F5ED", color: "#065f46" },
  INACTIVE:  { bg: "#f1f5f9", color: "var(--text-2)" },
  SUSPENDED: { bg: "#FBE9E9", color: "#8B1A1A" },
};

export default function UsersList() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nameSort, setNameSort] = useState("NONE");

  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === "SUPERADMIN";

  useEffect(() => {
    http.get("/admin/users", { params: { page, limit } })
      .then(res => {
        const data = res.data?.data ?? res.data ?? [];
        setUsers(Array.isArray(data) ? data : []);
        setTotal(res.data?.total ?? (Array.isArray(data) ? data.length : 0));
      })
      .catch(err => {
        setError(err.response?.data?.message || "Impossible de charger la liste");
      })
      .finally(() => setLoading(false));
  }, [page, limit]);

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
    const matchStatus = statusFilter === "ALL" || u.status === statusFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.matricule || "").toLowerCase().includes(q);
    return matchRole && matchStatus && matchSearch;
  });

  // Appliquer le tri
  const sorted = [...filtered];
  
  // Tri par nom (alphabétique)
  if (nameSort === "AZ") {
    sorted.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB, "fr");
    });
  } else if (nameSort === "ZA") {
    sorted.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameB.localeCompare(nameA, "fr");
    });
  }

  // Fonction pour exporter en Excel
  // Fonction pour exporter en Excel + ouverture automatique
  const handleExportExcel = () => {
    if (sorted.length === 0) return;

    const data = sorted.map(user => {
      const firstName = user.firstName || "—";
      const lastName = user.lastName || "—";
      const roleLabel = ROLE_LABELS[user.role] || user.role;
      const statusLabel = 
        user.status === "ACTIVE" ? "Actif" : 
        user.status === "INACTIVE" ? "Inactif" : "Suspendu";

      const dateInscription = user.createdAt 
        ? new Date(user.createdAt).toLocaleDateString("fr-FR") 
        : "—";

      return {
        "Nom": lastName,
        "Prénom": firstName,
        "Email": user.email || "",
        "Matricule": user.matricule || "",
        "Département": user.department || "—",
        "Rôle": roleLabel,
        "Statut": statusLabel,
        "Date d'inscription": dateInscription,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Largeurs de colonnes
    worksheet["!cols"] = [
      { wch: 18 }, // Nom
      { wch: 18 }, // Prénom
      { wch: 30 }, // Email
      { wch: 14 }, // Matricule
      { wch: 20 }, // Département
      { wch: 18 }, // Rôle
      { wch: 12 }, // Statut
      { wch: 18 }, // Date d'inscription
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");

    const fileName = `utilisateurs-${new Date().toISOString().split("T")[0]}.xlsx`;

    // === PARTIE IMPORTANTE : Ouverture automatique ===
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });

    const url = URL.createObjectURL(blob);

    // Création du lien pour le téléchargement + ouverture
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    
    // Cette ligne est importante pour l'ouverture automatique sur la plupart des navigateurs
    link.target = "_blank";        // ← Ajouté

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Nettoyage
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 150);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "var(--text-1)" }}>
            👥 Liste des comptes
          </h1>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: "14px" }}>
            {total} utilisateur{total !== 1 ? "s" : ""} enregistré{total !== 1 ? "s" : ""}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            to="/admin/create-user"
            style={{
              background: "linear-gradient(135deg,#1D7A91,#2d58b0)",
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
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <input
            type="text"
            placeholder="Rechercher nom, email, matricule…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 42px 9px 14px",
              border: "1.5px solid var(--border)",
              borderRadius: "10px",
              background: "var(--surface-2)",
              color: "var(--text-1)",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <MicButton onResult={(t) => setSearch(t)} />
        </div>
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

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
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
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="INACTIVE">Inactif</option>
        </select>

        <select
          value={nameSort}
          onChange={e => setNameSort(e.target.value)}
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
          <option value="NONE">Tri nom : aucun</option>
          <option value="AZ">A → Z (alphabétique)</option>
          <option value="ZA">Z → A (inverse)</option>
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
          background: "#FBE9E9",
          color: "#8B1A1A",
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
      {!loading && !error && sorted.length > 0 && (
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
                <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid #DDD7C8" }}>
                  {["Utilisateur", "Email", "Matricule", "Rôle", "Statut", ...(isSuperAdmin ? ["Actions"] : [])].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      fontSize: "12px",
                      color: "#155B6E",
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((user, i) => {
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
                      borderBottom: i < sorted.length - 1 ? "1px solid #f1f5f9" : "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#EEF7FA"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg,#1D7A91,#2d58b0)",
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
                                background: "#EEF7FA", color: "#1D7A91",
                                textDecoration: "none", fontSize: "13px", fontWeight: 600,
                                border: "1px solid #D6EEF3",
                              }}
                            >
                              Modifier
                            </Link>
                            <button
                              onClick={() => handleDelete(user._id)}
                              style={{
                                padding: "5px 12px", borderRadius: "7px",
                                background: "#FBE9E9", color: "#8B1A1A",
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

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
        >
          ← Précédent
        </button>
        <span style={{ fontSize: "12px", color: "var(--text-2)" }}>
          Page {page} / {Math.max(1, Math.ceil(total / limit))}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / limit)), p + 1))}
          disabled={page >= Math.max(1, Math.ceil(total / limit))}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
        >
          Suivant →
        </button>
      </div>
      {/* Bouton Exporter en bas à droite */}
      {!loading && !error && sorted.length > 0 && isSuperAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            onClick={handleExportExcel}
            disabled={sorted.length === 0}
            style={{
              background: sorted.length === 0 ? "#d1d5db" : "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
              boxShadow: sorted.length === 0 ? "none" : "0 4px 14px rgba(16,185,129,0.30)",
              cursor: sorted.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            📥 Exporter en Excel
          </button>
        </div>
      )}
    </div>
  );
}
