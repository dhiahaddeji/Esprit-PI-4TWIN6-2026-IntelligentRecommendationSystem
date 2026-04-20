import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FingerScrollController from "./FingerScrollController";
import { getStoredUser, logout } from "../auth/authService";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications, NOTIF_META } from "../contexts/NotificationsContext";
import { useTranslation } from "../contexts/TranslationContext";
import "../styles/topbar.css";

export default function Topbar() {
  const { isDark, toggle }                          = useTheme();
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [langOpen,      setLangOpen]      = useState(false);
  const [fingerActive,  setFingerActive]  = useState(false);

  const profileRef = useRef(null);
  const notifRef   = useRef(null);
  const langRef    = useRef(null);
  const navigate   = useNavigate();
  const { lang, changeLanguage } = useTranslation();

  const user = getStoredUser() || { name: "—", role: null };

  // ── Close dropdowns on outside click ──────────────────────────────────
useEffect(() => {
  const onDocClick = (e) => {
    if (profileRef.current && !profileRef.current.contains(e.target))
      setProfileOpen(false);
    if (notifRef.current && !notifRef.current.contains(e.target))
      setNotifOpen(false);
    if (langRef.current && !langRef.current.contains(e.target))
      setLangOpen(false);
  };
  document.addEventListener("mousedown", onDocClick);
  return () => document.removeEventListener("mousedown", onDocClick);
}, []);

  // ── Click on a notification: mark read + navigate ─────────────────────
  const handleNotifClick = (notif) => {
    if (!notif.read) markRead(notif._id);
    setNotifOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllRead();
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const getRoleLabel = (role) => {
    switch (role) {
      case "SUPERADMIN": return "Super Admin";
      case "HR":         return "Responsable RH";
      case "MANAGER":    return "Manager";
      case "EMPLOYEE":   return "Employé";
      default:           return role || "—";
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  };
  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name || "—";

  const initials = displayName
    .split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0].toUpperCase()).join("");

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <>
      <header className="topbar">
        <div className="searchWrap">
          <input className="searchInput" placeholder="Rechercher employés, activités..." />
        </div>

        <div className="topRight">
          {/* DARK / LIGHT MODE */}
          <button
            type="button"
            className={`themeToggle ${isDark ? "dark" : "light"}`}
            onClick={toggle}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            title={isDark ? "Mode clair" : "Mode sombre"}
            aria-pressed={isDark}
          >
            <span className="themeToggleIcon" aria-hidden="true">
              <span className="sun">☀️</span>
              <span className="moon">🌙</span>
            </span>
          </button>

          {/* FINGER SCROLL */}
          <button
            className="iconBtn"
            type="button"
            onClick={() => setFingerActive(v => !v)}
            aria-label="Contrôle par geste"
            title={fingerActive ? "Désactiver le contrôle par geste" : "Activer le contrôle par geste"}
            style={fingerActive ? { color: "#00e676", filter: "drop-shadow(0 0 6px #00e676)" } : {}}
          >
            🖐️
          </button>

          {/* ACCESSIBILITÉ */}
          { <button
            className="iconBtn"
            type="button"
            onClick={() => window.dispatchEvent(new Event("toggle-a11y-widget"))}
            aria-label="Accessibilité"
            title="Accessibilité"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor" aria-hidden="true">
              <path d="M423.5-743.5Q400-767 400-800t23.5-56.5Q447-880 480-880t56.5 23.5Q560-833 560-800t-23.5 56.5Q513-720 480-720t-56.5-23.5ZM360-80v-520H120v-80h720v80H600v520h-80v-240h-80v240h-80Z"/>
            </svg>
          </button> }

          {/* NOTIFICATION BELL */}
          <div className="notifWrap" ref={notifRef}>
            <button
              className="notifBtn"
              onClick={() => setNotifOpen((v) => !v)}
              title="Notifications"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="badge">{unread > 99 ? "99+" : unread}</span>
              )}
            </button>

            {notifOpen && (
              <div className="notifPanel">
                <div className="notifHeader">
                  <span className="notifTitle">Notifications</span>
                  {unread > 0 && (
                    <button className="notifMarkAll" onClick={handleMarkAllRead}>
                      Tout lire
                    </button>
                  )}
                </div>

                <div className="notifList">
                  {notifications.length === 0 ? (
                    <div className="notifEmpty">
                      <span>🔕</span>
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        className={`notifItem ${n.read ? "read" : "unread"}`}
                        onClick={() => handleNotifClick(n)}
                      >
                        <span
                          className="notifIcon"
                          style={{
                            background: (NOTIF_META[n.type]?.color ?? "#1D7A91") + "1a",
                            color:      NOTIF_META[n.type]?.color ?? "#1D7A91",
                          }}
                        >
                          {NOTIF_META[n.type]?.icon ?? "🔔"}
                        </span>
                        <div className="notifBody">
                          <div className="notifItemTitle">{n.title}</div>
                          <div className="notifItemMsg">{n.message}</div>
                          <div className="notifItemTime">{timeAgo(n.createdAt)}</div>
                        </div>
                        {!n.read && <span className="notifDot" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TRADUCTION */}
          <div className="menuWrap" ref={langRef}>
            <button
              className="langBtn"
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              title="Changer de langue"
              aria-label="Changer de langue"
            >
              <span style={{ fontSize: "0.95rem" }}>🌐</span>
              <span className="langLabel">
                {lang === "fr" ? "Français" : lang === "en" ? "English" : "عربي"}
              </span>
              <span className="langChevron">▾</span>
            </button>

            {langOpen && (
              <div className="profileMenu langMenu">
                {[
                  { code: "fr", label: "🇫🇷 Français" },
                  { code: "en", label: "🇬🇧 English" },
                  { code: "ar", label: "🇸🇦 عربي" },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    className={lang === code ? "langActive" : ""}
                    onClick={() => { changeLanguage(code); setLangOpen(false); }}
                  >
                    {label}
                    {lang === code && <span className="langCheck">✓</span>}
                  </button>
                ))}
              </div>
            )}
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
                <div className="role">{getRoleLabel(user.role)}</div>
              </div>
            </button>

            {profileOpen && (
              <div className="profileMenu">
                <button onClick={() => navigate("/me")}>👤 Mon profil</button>
                <button className="danger" onClick={handleLogout}>⎋ Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* FINGER SCROLL CONTROLLER */}
      <FingerScrollController
        active={fingerActive}
        onDeactivate={() => setFingerActive(false)}
      />

    </>
  );
}