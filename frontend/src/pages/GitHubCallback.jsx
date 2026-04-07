// Page de callback après GitHub OAuth
// Le backend redirige vers /auth/callback?token=XXX&user=BASE64
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LS_TOKEN, LS_USER } from "../auth/authService";

export default function GitHubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const userEncoded = params.get("user");

    if (!token || !userEncoded) {
      navigate("/login?error=github_failed", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(atob(userEncoded));
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_USER, JSON.stringify(user));

      // L'admin n'a jamais mustChangePassword ni isProfileComplete à gérer
      navigate("/dashboard", { replace: true });
    } catch {
      navigate("/login?error=github_failed", { replace: true });
    }
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "4px solid #0B2D38", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#0B2D38", fontWeight: 600 }}>Connexion GitHub en cours…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
