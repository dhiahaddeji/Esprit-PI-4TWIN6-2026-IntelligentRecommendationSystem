// src/pages/superadmin/CreateUser.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    matricule: "",
    role: "EMPLOYEE",
    date_embauche: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", matricule: "" });

  const validateName = (name) => {
    if (!name) return "Le nom est requis";
    if (!/^[A-Z][a-zA-Z\s-]+$/.test(name))
      return "Le nom doit commencer par une majuscule et ne contenir que des lettres";
    return "";
  };

  const validateEmail = (email) => {
    if (!email) return "L'email est requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Format d'email invalide";
    return "";
  };

  const validateMatricule = (matricule, role) => {
    if (!matricule) return "Le matricule est requis";
    const prefix = role === "HR" ? "RH" : role === "MANAGER" ? "MAN" : "EMP";
    if (!new RegExp(`^${prefix}\\d+$`).test(matricule))
      return `Le matricule doit commencer par ${prefix} suivi de chiffres (ex: ${prefix}123)`;
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: "" }));

    if (name === "name")      setFieldErrors((p) => ({ ...p, name: validateName(value) }));
    if (name === "email")     setFieldErrors((p) => ({ ...p, email: validateEmail(value) }));
    if (name === "matricule") setFieldErrors((p) => ({ ...p, matricule: validateMatricule(value, form.role) }));
    if (name === "role" && form.matricule)
      setFieldErrors((p) => ({ ...p, matricule: validateMatricule(form.matricule, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const nameErr      = validateName(form.name);
    const emailErr     = validateEmail(form.email);
    const matriculeErr = validateMatricule(form.matricule, form.role);
    setFieldErrors({ name: nameErr, email: emailErr, matricule: matriculeErr });
    if (nameErr || emailErr || matriculeErr) return;

    setLoading(true);
    try {
      // Vérifier si le matricule existe
      const check = await http.get(`/admin/check-matricule/${form.matricule}`);
      if (check.data.exists) {
        setFieldErrors((p) => ({ ...p, matricule: "Ce matricule existe déjà dans le système" }));
        setLoading(false);
        return;
      }

      // Le backend génère le mot de passe et envoie l'email automatiquement
      await http.post("/admin/create-user", {
        ...form,
        date_embauche: form.date_embauche || undefined,
      });

      setSuccess(true);
      setTimeout(() => navigate("/admin/users"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const getMatriculeExample = () =>
    form.role === "HR" ? "RH123" : form.role === "MANAGER" ? "MAN123" : "EMP123";

  return (
    <div style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>Créer un compte</h1>
      <p style={{ marginTop: 6, color: "#667085" }}>
        Un mot de passe temporaire (valable 24 h) sera généré et envoyé par email au nouvel utilisateur.
      </p>

      {error && (
        <div style={{ color: "#b42318", background: "#fffbfa", border: "1px solid #fecdca", padding: 12, borderRadius: 10, marginTop: 12 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: "#2e7d32", background: "#f0fdf4", border: "1px solid #86efac", padding: 16, borderRadius: 10, marginTop: 12 }}>
          <strong>Compte créé avec succès !</strong><br />
          Un email avec les identifiants a été envoyé à <strong>{form.email}</strong>.<br />
          <span style={{ fontSize: 13, color: "#15803d" }}>Redirection en cours…</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "grid", gap: 14 }}>

        <Field label="Nom complet" required error={fieldErrors.name}>
          <input value={form.name} onChange={handleChange} name="name"
            placeholder="Ex: Jean Dupont" required style={inp(fieldErrors.name)} />
        </Field>

        <Field label="Email professionnel" required error={fieldErrors.email}>
          <input value={form.email} onChange={handleChange} name="email"
            type="email" placeholder="jean.dupont@entreprise.com" required style={inp(fieldErrors.email)} />
        </Field>

        <Field label="Rôle" required>
          <select value={form.role} onChange={handleChange} name="role" style={inp()}>
            <option value="EMPLOYEE">Employé</option>
            <option value="HR">Responsable RH</option>
            <option value="MANAGER">Manager</option>
          </select>
        </Field>

        <Field
          label="Matricule"
          required
          error={fieldErrors.matricule}
          hint={`Format : ${form.role === "HR" ? "RH" : form.role === "MANAGER" ? "MAN" : "EMP"} + chiffres (ex: ${getMatriculeExample()})`}
        >
          <input value={form.matricule} onChange={handleChange} name="matricule"
            placeholder={`Ex: ${getMatriculeExample()}`} required style={inp(fieldErrors.matricule)} />
        </Field>

        <Field label="Date d'embauche (optionnel)">
          <input value={form.date_embauche} onChange={handleChange} name="date_embauche"
            type="date" style={inp()} />
        </Field>

        {/* Info mot de passe auto-généré */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20 }}>📧</span>
          <div style={{ fontSize: 13, color: "#0369a1" }}>
            <strong>Mot de passe automatique</strong><br />
            Un mot de passe sécurisé de 12 caractères sera généré par le système et envoyé directement
            à l'adresse email renseignée. Il sera valable <strong>24 heures</strong>.
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          style={{
            background: loading || success ? "#9ca3af" : "#0b2b4b",
            color: "white",
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
            cursor: loading || success ? "not-allowed" : "pointer",
            width: "fit-content",
            marginTop: 6,
          }}
        >
          {loading ? "Création en cours…" : success ? "Compte créé ✓" : "Créer le compte & envoyer l'email"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
      </label>
      {children}
      {error && <small style={{ color: "#dc2626", marginTop: 3, display: "block" }}>{error}</small>}
      {!error && hint && <small style={{ color: "#667085", marginTop: 3, display: "block" }}>{hint}</small>}
    </div>
  );
}

function inp(hasError = false) {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: hasError ? "2px solid #dc2626" : "1px solid #e2e8f0",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
    fontSize: 14,
  };
}
