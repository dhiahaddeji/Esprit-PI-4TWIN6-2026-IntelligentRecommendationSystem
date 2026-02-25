// src/pages/superadmin/CreateUser.jsx
import { useState, useEffect } from "react";
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

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    matricule: "",
  });

  // Fonction pour générer un mot de passe sécurisé
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$&*-_";
    let pw = "";
    for (let i = 0; i < 12; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    setGeneratedPassword(pw);
  };

  // Génère le premier mot de passe au chargement
  useEffect(() => {
    generatePassword();
  }, []);

  // Validation du nom (doit commencer par une majuscule)
  const validateName = (name) => {
    if (!name) return "Le nom est requis";
    if (!/^[A-Z][a-zA-Z\s-]+$/.test(name)) {
      return "Le nom doit commencer par une majuscule et ne contenir que des lettres";
    }
    return "";
  };

  // Validation de l'email
  const validateEmail = (email) => {
    if (!email) return "L'email est requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Format d'email invalide";
    }
    return "";
  };

  // Validation du matricule selon le rôle
  const validateMatricule = (matricule, role) => {
    if (!matricule) return "Le matricule est requis";
    
    const prefix = role === "HR" ? "RH" : role === "MANAGER" ? "MAN" : "EMP";
    const regex = new RegExp(`^${prefix}\\d+$`);
    
    if (!regex.test(matricule)) {
      return `Le matricule doit commencer par ${prefix} suivi de chiffres (ex: ${prefix}123)`;
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Mise à jour du formulaire
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Réinitialiser l'erreur du champ
    setFieldErrors(prev => ({ ...prev, [name]: "" }));

    // Validation en temps réel
    if (name === "name") {
      setFieldErrors(prev => ({ ...prev, name: validateName(value) }));
    } else if (name === "email") {
      setFieldErrors(prev => ({ ...prev, email: validateEmail(value) }));
    } else if (name === "matricule") {
      setFieldErrors(prev => ({ ...prev, matricule: validateMatricule(value, form.role) }));
    } else if (name === "role") {
      // Quand le rôle change, revalider le matricule si déjà rempli
      if (form.matricule) {
        setFieldErrors(prev => ({ ...prev, matricule: validateMatricule(form.matricule, value) }));
      }
    }
  };

  // Vérifier si le matricule existe déjà
  const checkMatriculeExists = async (matricule) => {
    try {
      const response = await http.get(`/admin/check-matricule/${matricule}`);
      return response.data.exists;
    } catch (error) {
      console.error("Erreur lors de la vérification du matricule:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Valider tous les champs
    const nameError = validateName(form.name);
    const emailError = validateEmail(form.email);
    const matriculeError = validateMatricule(form.matricule, form.role);

    // Mettre à jour les erreurs
    setFieldErrors({
      name: nameError,
      email: emailError,
      matricule: matriculeError,
    });

    // S'il y a des erreurs de validation, arrêter
    if (nameError || emailError || matriculeError) {
      setLoading(false);
      return;
    }

    try {
      // Vérifier si le matricule existe déjà
      const exists = await checkMatriculeExists(form.matricule);
      if (exists) {
        setFieldErrors(prev => ({ 
          ...prev, 
          matricule: "Ce matricule existe déjà dans le système" 
        }));
        setLoading(false);
        return;
      }

      if (!generatedPassword.trim()) {
        throw new Error("Veuillez générer un mot de passe");
      }

      await http.post("/admin/create-user", {
        ...form,
        password: generatedPassword,
        status: "ACTIVE",
        en_ligne: false,
        date_embauche: form.date_embauche || undefined,
      });

      setSuccess(true);
      setTimeout(() => navigate("/admin/users"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    alert("Mot de passe copié dans le presse-papiers !");
  };

  const handleRegenerate = () => {
    generatePassword();
    alert("Nouveau mot de passe généré !");
  };

  // Aide pour le format du matricule selon le rôle
  const getMatriculeExample = () => {
    switch (form.role) {
      case "HR": return "RH123";
      case "MANAGER": return "MAN123";
      default: return "EMP123";
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>
        Créer un compte
      </h1>
      <p style={{ marginTop: 6, color: "#667085" }}>
        Le nouvel utilisateur recevra un mot de passe temporaire généré automatiquement.
      </p>

      {error && (
        <div style={{
          color: "#b42318",
          background: "#fffbfa",
          border: "1px solid #fecdca",
          padding: 10,
          borderRadius: 12,
          marginTop: 12
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          color: "#2e7d32",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          padding: 10,
          borderRadius: 12,
          marginTop: 12
        }}>
          Compte créé avec succès ! Redirection...
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {/* 1. Champ Nom */}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Nom complet <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={handleChange}
            name="name"
            placeholder="Ex: Jean Dupont"
            required
            style={inp(fieldErrors.name)}
          />
          {fieldErrors.name && (
            <small style={{ color: "#dc2626", marginTop: 2, display: "block" }}>
              {fieldErrors.name}
            </small>
          )}
        </div>

        {/* 2. Champ Email */}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Email professionnel <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={form.email}
            onChange={handleChange}
            name="email"
            type="email"
            placeholder="ex: jean.dupont@entreprise.com"
            required
            style={inp(fieldErrors.email)}
          />
          {fieldErrors.email && (
            <small style={{ color: "#dc2626", marginTop: 2, display: "block" }}>
              {fieldErrors.email}
            </small>
          )}
        </div>

        {/* 3. Champ Rôle */}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Rôle <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            value={form.role}
            onChange={handleChange}
            name="role"
            style={inp()}
          >
            <option value="EMPLOYEE">Employé</option>
            <option value="HR">RH</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>

        {/* 4. Champ Matricule */}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Matricule <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={form.matricule}
            onChange={handleChange}
            name="matricule"
            placeholder={`Ex: ${getMatriculeExample()}`}
            required
            style={inp(fieldErrors.matricule)}
          />
          {fieldErrors.matricule ? (
            <small style={{ color: "#dc2626", marginTop: 2, display: "block" }}>
              {fieldErrors.matricule}
            </small>
          ) : (
            <small style={{ color: "#667085", marginTop: 2, display: "block" }}>
              Format: {form.role === "HR" ? "RH" : form.role === "MANAGER" ? "MAN" : "EMP"} suivi de chiffres (ex: {getMatriculeExample()})
            </small>
          )}
        </div>

        {/* 5. Champ Date d'embauche */}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Date d'embauche (optionnel)
          </label>
          <input
            value={form.date_embauche}
            onChange={handleChange}
            name="date_embauche"
            type="date"
            style={inp()}
          />
        </div>

        {/* Section Mot de passe */}
        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
            Mot de passe généré (12 caractères)
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={generatedPassword}
              readOnly
              style={{ ...inp(), flex: 1 }}
            />
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: "0 16px",
                background: "#0b2b4b",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                height: 42
              }}
            >
              Copier
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              style={{
                padding: "0 16px",
                background: "#4b5563",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                height: 42
              }}
            >
              Nouveau
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#9ca3af" : "#0b2b4b",
            color: "white",
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            width: 220,
            marginTop: 20
          }}
        >
          {loading ? "Création en cours..." : "Créer le compte"}
        </button>
      </form>
    </div>
  );
}

// Fonction style avec gestion d'erreur
function inp(hasError = false) {
  return {
    padding: 12,
    borderRadius: 12,
    border: hasError ? "2px solid #dc2626" : "1px solid #eef0f4",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box"
  };
}