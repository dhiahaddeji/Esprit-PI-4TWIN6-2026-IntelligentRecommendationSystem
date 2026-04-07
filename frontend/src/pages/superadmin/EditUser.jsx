// src/pages/superadmin/EditUser.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../api/http";
import MicButton from "../../components/MicButton";

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
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [pendingForm, setPendingForm] = useState(null);

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
        
        // Garder une trace du statut original
        userData._originalStatus = userData.status;
        
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
    
    // Vérifier si le statut change en SUSPENDED
    if (form.status === "SUSPENDED" && form.status !== form._originalStatus) {
      setPendingForm(form);
      setShowWarningModal(true);
      return;
    }

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

  const handleConfirmSuspend = async () => {
    setSubmitting(true);
    setError("");
    try {
      // D'abord, suspendre l'utilisateur via l'endpoint spécifique
      await http.patch(`/admin/suspend-user/${id}`, {
        reason: suspendReason,
      });
      setSuccess(true);
      setShowWarningModal(false);
      setSuspendReason("");
      setPendingForm(null);
      setTimeout(() => navigate("/admin/users"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la suspension");
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
      backgroundColor: "#ffffff",
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
            color: "#0B2D38",
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
        <h1 style={{ color: "#0B2D38", fontSize: "36px", margin: 0 }}>
          Modifier l'utilisateur
        </h1>
      </div>

      {error && (
        <div style={{
          background: "#FBE9E9",
          color: "#8B1A1A",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid #fecaca"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "#E8F5ED",
          color: "#065f46",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid #a7f3d0"
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
              border: "1px solid #DDD7C8",
              borderRadius: "6px",
              fontSize: "16px"
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
              border: "1px solid #DDD7C8",
              borderRadius: "6px",
              fontSize: "16px"
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
              border: "1px solid #DDD7C8",
              borderRadius: "6px",
              fontSize: "16px"
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
                border: "1px solid #DDD7C8",
                borderRadius: "6px",
                fontSize: "16px",
                background: "white"
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
                border: "1px solid #DDD7C8",
                borderRadius: "6px",
                fontSize: "16px",
                background: "white"
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
              border: "1px solid #DDD7C8",
              borderRadius: "6px",
              fontSize: "16px"
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
              background: submitting ? "#638899" : "#0B2D38",
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
              background: "white",
              color: "#456070",
              border: "1px solid #DDD7C8",
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

      {/* Modal d'avertissement pour la suspension */}
      {showWarningModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          }}>
            <h2 style={{
              color: "#dc2626",
              marginTop: 0,
              marginBottom: "16px",
              fontSize: "22px",
            }}>
              ⚠️ Attention - Suspension d'utilisateur
            </h2>
            
            <p style={{
              color: "#4b5563",
              fontSize: "16px",
              marginBottom: "20px",
              lineHeight: "1.5",
            }}>
              Vous êtes sur le point de suspendre <strong>{form.name}</strong>. 
              Un email de notification sera automatiquement envoyé à cet utilisateur.
            </p>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                fontWeight: 600,
                display: "block",
                marginBottom: "8px",
                color: "#111827",
              }}>
                Raison de la suspension (optionnelle)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Exemple : Violation de la politique d'utilisation"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontFamily: "Arial, sans-serif",
                  resize: "vertical",
                  minHeight: "100px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleConfirmSuspend}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: submitting ? "#f87171" : "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Suspension en cours..." : "Confirmer la suspension"}
              </button>
              
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setSuspendReason("");
                  setPendingForm(null);
                  // Remettre le statut à sa valeur originale
                  setForm({ ...form, status: form._originalStatus });
                }}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "white",
                  color: "#4b5563",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}