import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const FingerScrollController = lazy(() => import("./FingerScrollController"));
import { getStoredUser, logout } from "../auth/authService";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications, NOTIF_META } from "../contexts/NotificationsContext";
import { useTranslation } from "../contexts/TranslationContext";
import "../styles/topbar.css";

/**
 * useDropdown — keyboard-accessible dropdown manager.
 *
 * Returns { open, setOpen, triggerRef, menuRef, triggerProps, menuProps }
 *
 * Behaviour:
 *  - Trigger: ArrowDown / Enter / Space → open + focus first item
 *  - Menu items: ArrowUp/Down cycle, Home/End jump, Escape closes + refocuses trigger
 *  - Tab while menu is open → close (let browser Tab naturally)
 */
function useDropdown() {
  const [open, setOpen]   = useState(false);
  const triggerRef        = useRef(null);
  const menuRef           = useRef(null);
  const openedByKeyboard  = useRef(false);

  // Focus first menu item when opened via keyboard
  useEffect(() => {
    if (open && openedByKeyboard.current && menuRef.current) {
      const first = menuRef.current.querySelector("button, a, [tabindex]");
      if (first) first.focus();
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    openedByKeyboard.current = false;
  }, []);

  const closeAndRefocus = useCallback(() => {
    close();
    // Give React one tick to unmount the menu before refocusing trigger
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [close]);

  // Navigate items with arrow keys
  const handleMenuKeyDown = useCallback((e) => {
    if (!menuRef.current) return;
    const items = Array.from(
      menuRef.current.querySelectorAll("button:not([disabled]), a:not([disabled])")
    );
    const idx = items.indexOf(document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = idx < items.length - 1 ? idx + 1 : 0;
      items[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = idx > 0 ? idx - 1 : items.length - 1;
      items[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeAndRefocus();
    } else if (e.key === "Tab") {
      // Close but let Tab move to next element naturally
      close();
    }
  }, [close, closeAndRefocus]);

  // Trigger keydown — open on ArrowDown / Enter / Space
  const handleTriggerKeyDown = useCallback((e) => {
    if (["ArrowDown", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openedByKeyboard.current = true;
      setOpen(true);
    } else if (e.key === "Escape") {
      close();
    }
  }, [close]);

  return {
    open,
    setOpen,
    close,
    triggerRef,
    menuRef,
    handleTriggerKeyDown,
    handleMenuKeyDown,
  };
}

export default function Topbar() {
  const { isDark, toggle }                                      = useTheme();
  const { notifications, unread, markRead, markAllRead }        = useNotifications();
  const [fingerActive, setFingerActive]                         = useState(false);

  const profile = useDropdown();
  const notif   = useDropdown();
  const lang    = useDropdown();

  const navigate = useNavigate();
  const { lang: currentLang, changeLanguage } = useTranslation();

  const user = getStoredUser() || { name: "—", role: null };

  // ── Close dropdowns on outside click ─────────────────────────────
  useEffect(() => {
    const onDocClick = (e) => {
      if (profile.triggerRef.current && !profile.triggerRef.current.closest?.(".menuWrap")?.contains(e.target))
        profile.close();
      if (notif.triggerRef.current && !notif.triggerRef.current.closest?.(".notifWrap")?.contains(e.target))
        notif.close();
      if (lang.triggerRef.current && !lang.triggerRef.current.closest?.(".menuWrap")?.contains(e.target))
        lang.close();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [profile, notif, lang]);

  // ── Notification helpers ──────────────────────────────────────────
  const handleNotifClick = (n) => {
    if (!n.read) markRead(n._id);
    notif.close();
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllRead();
  };

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
        <div className="topRight" role="toolbar" aria-label="Barre d'outils">

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
            aria-label={fingerActive ? "Désactiver le contrôle par geste" : "Activer le contrôle par geste"}
            aria-pressed={fingerActive}
            title={fingerActive ? "Désactiver le contrôle par geste" : "Activer le contrôle par geste"}
            style={fingerActive ? { color: "#00e676", filter: "drop-shadow(0 0 6px #00e676)" } : {}}
          >
            🖐️
          </button>

          {/* ACCESSIBILITÉ */}
          <button
            className="iconBtn"
            type="button"
            onClick={() => window.dispatchEvent(new Event("toggle-a11y-widget"))}
            aria-label="Accessibilité"
            title="Accessibilité"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor" aria-hidden="true">
              <path d="M423.5-743.5Q400-767 400-800t23.5-56.5Q447-880 480-880t56.5 23.5Q560-833 560-800t-23.5 56.5Q513-720 480-720t-56.5-23.5ZM360-80v-520H120v-80h720v80H600v520h-80v-240h-80v240h-80Z"/>
            </svg>
          </button>

          {/* ── NOTIFICATIONS ─────────────────────────────────────────── */}
          <div className="notifWrap">
            <button
              ref={notif.triggerRef}
              className="notifBtn"
              onClick={() => notif.setOpen(v => !v)}
              onKeyDown={notif.handleTriggerKeyDown}
              aria-label={`Notifications${unread > 0 ? ` — ${unread} non lues` : ""}`}
              aria-haspopup="true"
              aria-expanded={notif.open}
              title="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="badge" aria-hidden="true">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>

            {notif.open && (
              <div
                ref={notif.menuRef}
                className="notifPanel"
                role="dialog"
                aria-label="Notifications"
                onKeyDown={notif.handleMenuKeyDown}
              >
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
                      <span aria-hidden="true">🔕</span>
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        className={`notifItem ${n.read ? "read" : "unread"}`}
                        onClick={() => handleNotifClick(n)}
                        aria-label={`${n.title} — ${n.message}${n.read ? "" : " (non lue)"}`}
                      >
                        <span
                          className="notifIcon"
                          aria-hidden="true"
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
                        {!n.read && <span className="notifDot" aria-hidden="true" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── LANGUAGE ──────────────────────────────────────────────── */}
          <div className="menuWrap">
            <button
              ref={lang.triggerRef}
              className="langBtn"
              type="button"
              onClick={() => lang.setOpen(v => !v)}
              onKeyDown={lang.handleTriggerKeyDown}
              aria-label="Changer de langue"
              aria-haspopup="listbox"
              aria-expanded={lang.open}
              title="Changer de langue"
            >
              <span style={{ fontSize: "0.95rem" }} aria-hidden="true">🌐</span>
              <span className="langLabel">
                {currentLang === "fr" ? "Français" : currentLang === "en" ? "English" : "عربي"}
              </span>
              <span className="langChevron" aria-hidden="true">▾</span>
            </button>

            {lang.open && (
              <div
                ref={lang.menuRef}
                className="profileMenu langMenu"
                role="listbox"
                aria-label="Langue"
                onKeyDown={lang.handleMenuKeyDown}
              >
                {[
                  { code: "fr", label: "🇫🇷 Français" },
                  { code: "en", label: "🇬🇧 English" },
                  { code: "ar", label: "🇸🇦 عربي"    },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    className={currentLang === code ? "langActive" : ""}
                    role="option"
                    aria-selected={currentLang === code}
                    onClick={() => { changeLanguage(code); lang.close(); }}
                  >
                    {label}
                    {currentLang === code && <span className="langCheck" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── PROFILE ───────────────────────────────────────────────── */}
          <div className="menuWrap">
            <button
              ref={profile.triggerRef}
              type="button"
              className="profileBtn"
              onClick={() => profile.setOpen(v => !v)}
              onKeyDown={profile.handleTriggerKeyDown}
              aria-label={`Menu de ${displayName}`}
              aria-haspopup="menu"
              aria-expanded={profile.open}
            >
              <div className="avatar" aria-hidden="true">{initials}</div>
              <div className="profileText">
                <div className="name">{displayName}</div>
                <div className="role">{getRoleLabel(user.role)}</div>
              </div>
            </button>

            {profile.open && (
              <div
                ref={profile.menuRef}
                className="profileMenu"
                role="menu"
                aria-label="Options du profil"
                onKeyDown={profile.handleMenuKeyDown}
              >
                <button
                  role="menuitem"
                  onClick={() => { navigate("/me"); profile.close(); }}
                >
                  👤 Mon profil
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={handleLogout}
                >
                  ⎋ Déconnexion
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      <Suspense fallback={null}>
        <FingerScrollController
          active={fingerActive}
          onDeactivate={() => setFingerActive(false)}
        />
      </Suspense>
    </>
  );
}
