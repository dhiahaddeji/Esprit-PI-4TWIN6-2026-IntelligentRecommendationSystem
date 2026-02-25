import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityMenu from "./AccessibilityMenu";
import { getStoredUser, logout } from "../auth/authService";
import "../styles/topbar.css";

export default function Topbar() {
  const [a11yOpen, setA11yOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const a11yRef = useRef(null);
  const profileRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const onDocClick = (e) => {
      if (a11yRef.current && !a11yRef.current.contains(e.target)) setA11yOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const user = getStoredUser() || { name: "Invité", role: null };

  // Correction : affichage correct du rôle
  const getRoleLabel = (role) => {
    switch (role) {
      case "ADMIN": return "Admin";
      case "HR": return "RH";
      case "MANAGER": return "Manager";
      case "EMPLOYEE": return "Employé";
      default: return "Invité";
    }
  };

  const roleLabel = getRoleLabel(user.role);

  const initials = (user.name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div className="searchWrap">
        <input className="searchInput" placeholder="Rechercher employés, activités..." />
      </div>

      <div className="topRight">
        <div className="menuWrap" ref={a11yRef}>
          <button
            className="iconBtn"
            type="button"
            onClick={() => setA11yOpen((v) => !v)}
            aria-label="Accessibilité"
            title="Accessibilité"
          >
            ♿
          </button>

          {a11yOpen && (
            <div className="popover">
              <AccessibilityMenu open={a11yOpen} onClose={() => setA11yOpen(false)} />
            </div>
          )}
        </div>

        <div className="notif" title="Notifications">
          🔔 <span className="badge">2</span>
        </div>

        <div className="menuWrap" ref={profileRef}>
          <button
            type="button"
            className="profileBtn"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div className="avatar">{initials}</div>
            <div className="profileText">
              <div className="name">{user.name}</div>
              <div className="role">{roleLabel}</div> {/* ← CORRECTION ICI */}
            </div>
          </button>

          {profileOpen && (
            <div className="profileMenu" role="menu">
              <button type="button" onClick={() => navigate("/me")} role="menuitem">
                👤 Mon profil
              </button>
              {user.role === "EMPLOYEE" && (
                <button
                  type="button"
                  onClick={() => navigate("/employee/invitations")}
                  role="menuitem"
                >
                  🔔 Notifications
                </button>
              )}
              <button type="button" className="danger" onClick={handleLogout} role="menuitem">
                ⎋ Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}