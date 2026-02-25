// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { login, LS_TOKEN, LS_USER } from "../auth/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = await login({ email, password });

      localStorage.setItem(LS_TOKEN, data.accessToken);
      localStorage.setItem(LS_USER, JSON.stringify(data.user));

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Erreur login :", error);
      alert(error.message || "Email ou mot de passe incorrect");
    }
  };

  const onGithubLogin = () => {
    // Pour l'instant : placeholder (à connecter plus tard au vrai OAuth GitHub)
    alert("Fonctionnalité GitHub OAuth en cours de développement.\nBientôt disponible !");
    // Exemple futur :
    // window.location.href = "http://localhost:3000/auth/github";
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

        <h1 className="authTitle">Connexion</h1>

        <p className="authHint">
          Accédez à votre espace selon votre rôle (HR, Manager, Employé).
        </p>

        {/* Bouton GitHub */}
        <button className="oauthBtn" type="button" onClick={onGithubLogin}>
          <span className="oauthIcon">⌂</span>
          Continuer avec GitHub
        </button>

        <div className="authDivider">
          <span>ou</span>
        </div>

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
            />
          </label>

          <label className="authLabel">
            Mot de passe
            <input
              className="authInput"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <div className="authRow">
            <label className="authCheck">
              <input type="checkbox" />
              Se souvenir de moi
            </label>

            <button
              className="authLinkBtn"
              type="button"
              onClick={() => alert("Fonctionnalité mot de passe oublié en cours de développement")}
            >
              Mot de passe oublié ?
            </button>
          </div>

          <button className="primaryBtn" type="submit">
            Se connecter
          </button>
        </form>

        <div className="authFooter">
          <span>Pas de compte ?</span>
          <Link className="authLink" to="/register">
            Créer un compte
          </Link>
        </div>

        <p className="authSmall">
          En vous connectant, vous acceptez nos{" "}
          <Link to="/terms" className="authLinkSmall">
            conditions
          </Link>{" "}
          et notre{" "}
          <Link to="/privacy" className="authLinkSmall">
            politique de confidentialité
          </Link>.
        </p>
      </div>
    </div>
  );
}