// src/pages/superadmin/EditUser.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../api/http";

export default function EditUser() {
  const { id } = useParams(); // Récupère l'ID depuis l'URL
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    matricule: "",
    role: "EMPLOYEE",
    status: "ACTIVE",
    date_embauche: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Charger les données de l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await http.get(`/admin/user/${id}`);
        const userData = res.data;
        
        // Formater la date pour l'input date (YYYY-MM-DD)
        if (userData.date_embauche) {
          userData.date_embauche = userData.date_embauche.split('T')[0];
        }
        
        setForm(userData);
      } catch (err) {
        setError("Impossible de charger les données de l'utilisateur");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await http.patch(`/admin/update-user/${id}`, form);
      setSuccess(true);
      setTimeout(() => navigate("/admin/users"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la modification");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ fontSize: "18px", color: "var(--text-2)" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: "var(--bg)",
      minHeight: "100vh",
      padding: "40px 30px",
      fontFamily: "Arial, sans-serif",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
        <button
          onClick={() => navigate("/admin/users")}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            fontSize: "16px",
            cursor: "pointer",
            marginRight: "20px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          ← Retour à la liste
        </button>
        <h1 style={{ color: "var(--text-1)", fontSize: "36px", margin: 0 }}>
          Modifier l'utilisateur
        </h1>
      </div>

      {error && (
        <div style={{
          background: "var(--danger-bg)",
          color: "var(--danger-text)",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid var(--danger-text)"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "var(--success-bg)",
          color: "var(--success-text)",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid var(--success-text)"
        }}>
          Utilisateur modifié avec succès ! Redirection...
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: "800px", display: "grid", gap: "20px" }}>
        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>
            Nom complet
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid var(--input-border)",
              borderRadius: "6px",
              fontSize: "16px",
              background: "var(--input-bg)",
              color: "var(--input-text)",
            }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>
            Email
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid var(--input-border)",
              borderRadius: "6px",
              fontSize: "16px",
              background: "var(--input-bg)",
              color: "var(--input-text)",
            }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>
            Matricule
          </label>
          <input
            name="matricule"
            value={form.matricule}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid var(--input-border)",
              borderRadius: "6px",
              fontSize: "16px",
              background: "var(--input-bg)",
              color: "var(--input-text)",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>
              Rôle
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid var(--input-border)",
                borderRadius: "6px",
                fontSize: "16px",
                background: "var(--input-bg)",
                color: "var(--input-text)",
              }}
            >
              <option value="EMPLOYEE">Employé</option>
              <option value="HR">HR</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>
              Statut
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid var(--input-border)",
                borderRadius: "6px",
                fontSize: "16px",
                background: "var(--input-bg)",
                color: "var(--input-text)",
              }}
            >
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>
            Date d'embauche (optionnel)
          </label>
          <input
            type="date"
            name="date_embauche"
            value={form.date_embauche}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid var(--input-border)",
              borderRadius: "6px",
              fontSize: "16px",
              background: "var(--input-bg)",
              color: "var(--input-text)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              padding: "14px",
              background: submitting ? "var(--border)" : "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Modification en cours..." : "Enregistrer les modifications"}
          </button>
          
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            style={{
              padding: "14px 30px",
              background: "var(--surface)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}