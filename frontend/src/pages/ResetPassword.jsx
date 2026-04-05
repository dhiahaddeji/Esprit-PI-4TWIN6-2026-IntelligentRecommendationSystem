import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../styles/auth.css";
import { resetPassword } from "../auth/authService";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Lien invalide ou expire.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword.length > 128) {
      setError("Le mot de passe est trop long (max 128 caractères).");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token, newPassword);
      setMessage(res?.message || "Mot de passe mis a jour.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Erreur lors de la reinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">🛡️</div>
          <div>
            <div className="authName">AssurReco</div>
            <div className="authSub">Recommandation IA</div>
          </div>
        </div>

        <h1 className="authTitle">Reinitialiser le mot de passe</h1>
        <p className="authHint">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        <form onSubmit={onSubmit} className="authForm">
          <label className="authLabel">
            Nouveau mot de passe
            <input
              className="authInput"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
              required
              disabled={loading}
            />
          </label>

          <label className="authLabel">
            Confirmer le mot de passe
            <input
              className="authInput"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
              required
              disabled={loading}
            />
          </label>

          {error && (
            <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>
          )}
          {message && (
            <div style={{ color: "#0f766e", fontSize: 13 }}>{message}</div>
          )}

          <button className="primaryBtn" type="submit" disabled={loading}>
            {loading ? "Mise a jour..." : "Mettre a jour"}
          </button>
        </form>

        <div className="authFooter">
          <Link to="/login" className="authLink">Retour a la connexion</Link>
        </div>
      </div>
    </div>
  );
}
