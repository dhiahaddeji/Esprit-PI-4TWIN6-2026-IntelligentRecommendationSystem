import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityMenu from "./AccessibilityMenu";
import { getStoredUser, logout } from "../auth/authService";
import "../styles/topbar.css";

export default function Topbar() {
  const [a11yOpen, setA11yOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Fermer profil au clic dehors
  useEffect(() => {
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Bloquer scroll quand popup accessibilité ouvert
  useEffect(() => {
    if (!a11yOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [a11yOpen]);

  const user = getStoredUser() || { name: "—", role: null };

  const getRoleLabel = (role) => {
    switch (role) {
      case "SUPERADMIN": return "Super Admin";
      case "HR":         return "Responsable RH";
      case "MANAGER":    return "Manager";
      case "EMPLOYEE":   return "Employé";
      default:           return role || "—";
    }
  };

  const roleLabel = getRoleLabel(user.role);

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name || "—";

  const initials = displayName
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
    <>
      <header className="topbar">
        <div className="searchWrap">
          <input
            className="searchInput"
            placeholder="Rechercher employés, activités..."
          />
        </div>

        <div className="topRight">

          {/* ACCESSIBILITÉ */}
          <button
            className="iconBtn"
            type="button"
            onClick={() => setA11yOpen(true)}
            aria-label="Accessibilité"
            title="Accessibilité"
          >
            ♿
          </button>

          {/* NOTIF */}
          <div className="notif" title="Notifications">
            🔔 <span className="badge">2</span>
          </div>

          {/* PROFIL */}
          <div className="menuWrap" ref={profileRef}>
            <button
              type="button"
              className="profileBtn"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <div className="avatar">{initials}</div>
              <div className="profileText">
                <div className="name">{displayName}</div>
                <div className="role">{roleLabel}</div>
              </div>
            </button>

            {profileOpen && (
              <div className="profileMenu">
                <button onClick={() => navigate("/me")}>
                  👤 Mon profil
                </button>

                {user.role === "EMPLOYEE" && (
                  <button onClick={() => navigate("/employee/invitations")}>
                    🔔 Notifications
                  </button>
                )}

                <button className="danger" onClick={handleLogout}>
                  ⎋ Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* POPUP ACCESSIBILITÉ (FIXED + OVERLAY) */}
      {a11yOpen && (
        <>
          <div
            className="a11yOverlay"
            onClick={() => setA11yOpen(false)}
          />

          <div
            className="a11yPopover"
            onClick={(e) => e.stopPropagation()}
          >
            <AccessibilityMenu
              open={a11yOpen}
              onClose={() => setA11yOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}