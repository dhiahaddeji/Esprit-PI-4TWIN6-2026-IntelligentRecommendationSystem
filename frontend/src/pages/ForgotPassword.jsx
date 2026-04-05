import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth.css";
import { requestPasswordReset } from "../auth/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setMessage(res?.message || "Si un compte existe, un email a été envoyé.");
    } catch (err) {
      setError(err.message || "Erreur lors de la demande.");
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

        <h1 className="authTitle">Mot de passe oublie</h1>
        <p className="authHint">
          Entrez votre email pour recevoir un lien de reinitialisation.
        </p>

        <form onSubmit={onSubmit} className="authForm">
          <label className="authLabel">
            Email
            <input
              className="authInput"
              type="email"
              placeholder="ex: sarah.hr@assur.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <div className="authFooter">
          <Link to="/login" className="authLink">Retour a la connexion</Link>
        </div>
      </div>
    </div>
  );
}
