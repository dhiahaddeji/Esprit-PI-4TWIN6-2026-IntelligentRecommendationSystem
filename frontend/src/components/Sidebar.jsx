// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredUser, getStoredToken } from "../auth/authService";
import "../styles/sidebar.css";

function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let id;

    async function fetchUnread() {
      try {
        const token = getStoredToken();
        if (!token) return;
        const res = await fetch("http://localhost:3000/messaging/unread", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          clearInterval(id);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(data.total ?? 0);
      } catch {}
    }

    fetchUnread();
    id = setInterval(fetchUnread, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return count;
}

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  HR:         "Responsable RH",
  MANAGER:    "Manager",
  EMPLOYEE:   "Employé",
};

export default function Sidebar() {
  let user = null;
  try { user = getStoredUser(); } catch {}

  const role   = user?.role || null;
  const cls    = ({ isActive }) => "menuItem" + (isActive ? " active" : "");
  const unread = useUnreadCount();
  const navRef = useRef(null);

  // ── Arrow-key navigation within the sidebar nav ──────────────────
  const handleNavKeyDown = useCallback((e) => {
    if (!navRef.current) return;

    // Only intercept Up/Down/Home/End
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;

    const items = Array.from(
      navRef.current.querySelectorAll("a.menuItem")
    );
    if (items.length === 0) return;

    const current = document.activeElement;
    const idx     = items.indexOf(current);

    let next = -1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      next = idx < items.length - 1 ? idx + 1 : 0;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      next = idx > 0 ? idx - 1 : items.length - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      next = items.length - 1;
    }

    if (next >= 0) items[next].focus();
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandLogo">🛡️</div>
        <div>
          <div className="brandName">AssurReco</div>
          <div className="brandSub">Recommandation IA</div>
        </div>
      </div>

      <nav
        ref={navRef}
        className="menu"
        aria-label="Navigation principale"
        onKeyDown={handleNavKeyDown}
      >
        <NavLink className={cls} to="/dashboard">📊 Tableau de bord</NavLink>

        {/* ── SUPERADMIN ─────────────────────────── */}
        {role === "SUPERADMIN" && (
          <>
            <div className="menuSection" aria-hidden="true">Administration</div>
            <NavLink className={cls} to="/admin/create-user">➕ Créer un compte</NavLink>
            <NavLink className={cls} to="/admin/users">👥 Liste des comptes</NavLink>
            <NavLink className={cls} to="/admin/logs">📋 Journal d'audit</NavLink>
          </>
        )}

        {/* ── HR ────────────────────────────────── */}
        {role === "HR" && (
          <>
            <div className="menuSection" aria-hidden="true">Ressources Humaines</div>
            <NavLink className={cls} to="/hr/activities">📅 Activités</NavLink>
            <NavLink className={cls} to="/hr/activities/new">➕ Créer une activité</NavLink>
            <NavLink className={cls} to="/hr/departments">🏢 Départements</NavLink>
            <NavLink className={cls} to="/admin/users">📋 Liste des comptes</NavLink>
            <div className="menuSection" aria-hidden="true">Intelligence Artificiel</div>
            <NavLink className={cls} to="/hr/skills-dashboard">📊 Dashboard compétences</NavLink>
            <NavLink className={cls} to="/hr/ai-chat">🤖 Assistant IA</NavLink>
          </>
        )}

        {/* ── MANAGER ───────────────────────────── */}
        {role === "MANAGER" && (
          <>
            <div className="menuSection" aria-hidden="true">Manager</div>
            <NavLink className={cls} to="/manager/inbox">📥 Approbations</NavLink>
            <NavLink className={cls} to="/admin/users">📋 Liste des comptes</NavLink>
            <div className="menuSection" aria-hidden="true">Compétences</div>
            <NavLink className={cls} to="/manager/skills">🎯 Validation compétences</NavLink>
          </>
        )}

        {/* ── EMPLOYEE ──────────────────────────── */}
        {role === "EMPLOYEE" && (
          <>
            <div className="menuSection" aria-hidden="true">Mon espace</div>
            <NavLink className={cls} to="/employee/invitations">🔔 Mes invitations</NavLink>
            <NavLink className={cls} to="/employee/participations">✅ Mes participations</NavLink>
            <div className="menuSection" aria-hidden="true">Profil</div>
            <NavLink className={cls} to="/employee/skills">🎯 Mes compétences</NavLink>
          </>
        )}

        {/* ── Common ────────────────────────────── */}
        <div className="menuSection" aria-hidden="true">Messagerie</div>
        <NavLink
          className={cls}
          to="/inbox"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>💬 Messagerie</span>
          {unread > 0 && (
            <span
              aria-label={`${unread} messages non lus`}
              style={{
                background: "#8B1A1A", color: "#fff", borderRadius: "10px",
                fontSize: "11px", fontWeight: 700, padding: "1px 7px",
                minWidth: "18px", textAlign: "center",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </NavLink>

        <div className="menuSection" aria-hidden="true">Mon compte</div>
        <NavLink className={cls} to="/me">👤 Mon profil</NavLink>
      </nav>

      {role && (
        <div className="sidebarFooter">
          <span className="roleTag">{ROLE_LABELS[role] || role}</span>
        </div>
      )}
    </aside>
  );
}
