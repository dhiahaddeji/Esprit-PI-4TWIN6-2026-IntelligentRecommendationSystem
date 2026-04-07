// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { login, LS_TOKEN, LS_USER } from "../auth/authService";
import FaceLogin from "../components/FaceLogin";
import MicButton from "../components/MicButton";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod]     = useState("password"); // "password" | "face"
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login({ email, password });
      localStorage.setItem(LS_TOKEN, data.accessToken);
      localStorage.setItem(LS_USER, JSON.stringify(data.user));
      navigate("/dashboard", { replace: true });
    } catch (error) {
      alert(error.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  const onGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/auth/github`;
  };

  return (
    <div className="authSplit">

      {/* ── Left panel: branding ─────────────────────────────── */}
      <div className="authPanel">
        <div className="authPanelInner">
          <div className="authPanelLogo">🛡️</div>
          <h2 className="authPanelName">AssurReco</h2>
          <p className="authPanelTagline">Recommandation IA · Esprit</p>

          <ul className="authPanelFeatures">
            <li><span className="authPanelIcon">🤖</span> Recommandations intelligentes par IA</li>
            <li><span className="authPanelIcon">👁️</span> Connexion par reconnaissance faciale</li>
            <li><span className="authPanelIcon">📊</span> Tableau de bord RH en temps réel</li>
            <li><span className="authPanelIcon">🔒</span> Sécurité et audit centralisés</li>
          </ul>

          <div className="authPanelPattern" aria-hidden="true" />
        </div>
      </div>

      {/* ── Right panel: form ────────────────────────────────── */}
      <div className="authFormPanel">
        <div className="authCard">

          {/* Brand (mobile only) */}
          <div className="authBrandMobile">
            <div className="authLogo">🛡️</div>
            <div>
              <div className="authName">AssurReco</div>
              <div className="authSub">Recommandation IA</div>
            </div>
          </div>

          <h1 className="authTitle">Connexion</h1>
          <p className="authHint">Accédez à votre espace selon votre rôle.</p>

          {/* ── Method tabs ── */}
          <div className="authTabs">
            <button
              type="button"
              className={`authTab ${method === "password" ? "authTabActive" : ""}`}
              onClick={() => setMethod("password")}
            >
              🔑 Mot de passe
            </button>
            <button
              type="button"
              className={`authTab ${method === "face" ? "authTabActive" : ""}`}
              onClick={() => setMethod("face")}
            >
              👁️ Visage
            </button>
          </div>

          {/* ── Password panel ── */}
          {method === "password" && (
            <>
              <button className="oauthBtn" type="button" onClick={onGithubLogin}>
                <span className="oauthIcon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.479 5.92.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </span>
                GitHub <span className="oauthBadge">Super Admin</span>
              </button>

              <div className="authDivider"><span>ou</span></div>

              <form onSubmit={onSubmit} className="authForm">
                <label className="authLabel">
                  Adresse e-mail
                  <div style={{ position: "relative" }}>
                    <input
                      className="authInput"
                      type="email"
                      placeholder="sarah.hr@assur.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      style={{ paddingRight: 42 }}
                    />
                    <MicButton onResult={(t) => setEmail(t)} />
                  </div>
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
                    <input type="checkbox" /> Se souvenir de moi
                  </label>
                  <button className="authLinkBtn" type="button"
                    onClick={() => alert("Fonctionnalité en développement")}>
                    Mot de passe oublié ?
                  </button>
                </div>

                <button className="primaryBtn" type="submit" disabled={loading}>
                  {loading ? "Connexion…" : "Se connecter"}
                </button>
              </form>
            </>
          )}

          {/* ── Face panel ── */}
          {method === "face" && (
            <div className="authFacePanel">
              <div className="authFaceIllustration">👁️</div>
              <p className="authFaceDesc">
                Placez votre visage face à la caméra.<br />
                La connexion est instantanée et sécurisée.
              </p>
              <FaceLogin />
              <button
                type="button"
                className="authLinkBtn"
                style={{ marginTop: 12, fontSize: 12 }}
                onClick={() => setMethod("password")}
              >
                ← Revenir à la connexion par mot de passe
              </button>
            </div>
          )}

          <p className="authSmall">
            En vous connectant, vous acceptez nos{" "}
            <Link to="/terms" className="authLinkSmall">conditions</Link> et notre{" "}
            <Link to="/privacy" className="authLinkSmall">politique de confidentialité</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
