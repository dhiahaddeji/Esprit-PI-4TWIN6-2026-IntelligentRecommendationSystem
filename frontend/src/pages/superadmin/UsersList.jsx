// src/pages/superadmin/UsersList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // Ajoutez cet import
import http from "../../api/http";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await http.get("/admin/users");
        setUsers(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Impossible de charger la liste des utilisateurs");
        console.error("Erreur fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;

    try {
      await http.delete(`/admin/delete-user/${id}`);
      setUsers(users.filter(user => user._id !== id));
      alert("Utilisateur supprimé avec succès");
    } catch (err) {
      alert("Erreur lors de la suppression : " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ fontSize: "18px", color: "#667085" }}>Chargement des utilisateurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "20px",
        background: "#fee2e2",
        color: "#991b1b",
        borderRadius: "8px",
        margin: "20px",
        textAlign: "center"
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: "18px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "32px", fontWeight: "bold" }}>
            Liste des comptes
          </h1>
          <p style={{ margin: 0, color: "#667085" }}>
            Gestion des utilisateurs du système
          </p>
        </div>
        
        {/* Bouton pour créer un nouvel utilisateur */}
        <Link 
          to="/admin/create-user"
          style={{
            backgroundColor: "#0b2b4b",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            display: "inline-block"
          }}
        >
          + Nouvel utilisateur
        </Link>
      </div>

      {users.length === 0 ? (
        <div style={{
          padding: "40px",
          background: "#f8fafc",
          borderRadius: "12px",
          textAlign: "center",
          color: "#667085",
          fontSize: "18px"
        }}>
          Aucun utilisateur trouvé.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{
                background: "#f1f5f9",
                textAlign: "left",
                borderBottom: "2px solid #e2e8f0"
              }}>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Nom</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Email</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Matricule</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Rôle</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Statut</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 16px" }}>{user.name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{user.email}</td>
                  <td style={{ padding: "12px 16px" }}>{user.matricule || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: "600",
                      background: getRoleColor(user.role),
                      color: "#fff"
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      background: user.status === "ACTIVE" ? "#d1fae5" : "#fee2e2",
                      color: user.status === "ACTIVE" ? "#065f46" : "#991b1b"
                    }}>
                      {user.status || "Inconnu"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {/* Lien vers la page de modification */}
                    <Link
                      to={`/admin/edit-user/${user._id}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        cursor: "pointer",
                        marginRight: "12px",
                        fontWeight: "500",
                        textDecoration: "none"
                      }}
                    >
                      Modifier
                    </Link>
                    <button
                      onClick={() => handleDelete(user._id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontWeight: "500"
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Fonction pour colorer les rôles
function getRoleColor(role) {
  switch (role) {
    case "ADMIN": return "#7c3aed";
    case "HR": return "#0ea5e9";
    case "MANAGER": return "#f59e0b";
    case "EMPLOYEE": return "#10b981";
    default: return "#6b7280";
  }
}