// src/pages/ChangePassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/auth.css";

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const validate = () => {
    if (form.newPassword.length < 8)
      return "Le mot de passe doit contenir au moins 8 caractères.";
    if (!/[A-Z]/.test(form.newPassword))
      return "Il doit contenir au moins une majuscule.";
    if (!/[0-9]/.test(form.newPassword))
      return "Il doit contenir au moins un chiffre.";
    if (form.newPassword !== form.confirm)
      return "Les mots de passe ne correspondent pas.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await changePassword(form.newPassword);
      // Après changement de mdp → aller compléter le profil
      navigate("/complete-profile", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">🔐</div>
          <div>
            <div className="authName">AssurReco</div>
            <div className="authSub">Première connexion</div>
          </div>
        </div>

        <h1 className="authTitle">Changer votre mot de passe</h1>

        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ margin: 0, color: "#92400e", fontSize: 13 }}>
            Bonjour <strong>{user?.name || "vous"}</strong>, votre compte vient d'être créé.<br />
            Pour votre sécurité, vous devez définir un nouveau mot de passe.
          </p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="authForm">
          <label className="authLabel">
            Nouveau mot de passe
            <input
              className="authInput"
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="authLabel">
            Confirmer le mot de passe
            <input
              className="authInput"
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>

          {/* Indicateur de force */}
          {form.newPassword && (
            <PasswordStrength password={form.newPassword} />
          )}

          <button className="primaryBtn" type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : "Définir mon mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(password) },
    { label: "Un chiffre", ok: /[0-9]/.test(password) },
    { label: "Un caractère spécial", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < score ? colors[score - 1] : "#e2e8f0",
              transition: "background .3s",
            }}
          />
        ))}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        {checks.map((c) => (
          <li key={c.label} style={{ fontSize: 11, color: c.ok ? "#16a34a" : "#94a3b8" }}>
            {c.ok ? "✓" : "○"} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
